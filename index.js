import {
    makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    delay,
} from "@whiskeysockets/baileys";

import pino from "pino";
import { Boom } from "@hapi/boom";
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import handlerCommand from './handler.js';
import { smsg } from './Utils/func.js';
import { handleJoinEvent, handleLeaveEvent } from './commands/welcome.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3002;
const sessionsDir = path.join(__dirname, 'accounts');

if (!fs.existsSync(sessionsDir)) fs.mkdirSync(sessionsDir, { recursive: true });

let tempDvmsys = {};
global.msgStore = {};

const getSetting = (type, key) => config[key] || false;

async function startUserBot(phoneNumber, isPairing = false) {
    const sessionName = `session_${phoneNumber.replace(/[^0-9]/g, '')}`;
    const sessionPath = path.join(sessionsDir, sessionName);

    if (isPairing) {
        if (tempDvmsys[sessionName]) {
            try { tempDvmsys[sessionName].end(); delete tempDvmsys[sessionName]; } catch (e) { }
        }
        if (fs.existsSync(sessionPath)) {
            fs.rmSync(sessionPath, { recursive: true, force: true });
        }
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const { version } = await fetchLatestBaileysVersion();

    const dvmsy = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
        }
    });

    tempDvmsys[sessionName] = dvmsy;
    
    dvmsy.decodeJid = (jid) => {
        if (!jid) return jid;
        if (/:\d+@/gi.test(jid)) {
            const decode = jidDecode(jid) || {};
            return decode.user && decode.server && `${decode.user}@${decode.server}` || jid;
        }
        return jid;
    };
    
    dvmsy.ev.on("messages.upsert", async chatUpdate => {
        try {
            const msg = chatUpdate.messages[0];
            if (!msg.message || msg.key.remoteJid === 'status@broadcast') return;
            const m = smsg(dvmsy, msg);
            Promise.resolve().then(() => {
                handlerCommand(dvmsy, m, msg, chatUpdate, undefined).catch(err => {
                    console.error("Erreur handler:", err.stack || err.message);
                });
            });
        } catch (err) {
            console.error("Erreur de traitement du message:", err.stack || err.message);
        }
    });

    dvmsy.ev.on("group-participants.update", async (update) => {
        try {
            const { id, participants, action } = update;
            if (action === "add") {
                await handleJoinEvent(dvmsy, id, participants);
            } else if (action === "remove") {
                await handleLeaveEvent(dvmsy, id, participants);
            }
        } catch (err) {
            console.error("Erreur group-participants:", err.stack || err.message);
        }
    });
  
    dvmsy.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === "close") {
            let reason = new Boom(lastDisconnect?.error)?.output.statusCode;
            if (reason !== DisconnectReason.loggedOut && tempDvmsys[sessionName]) {
                console.log(`[${phoneNumber}] Reconnexion...`);
                startUserBot(phoneNumber);
            }
        } else if (connection === "open") {
            console.log(`✅ [${phoneNumber}] Session Connectée !`);
            const userJid = dvmsy.user.id.split(":")[0] + "@s.whatsapp.net";
            await dvmsy.sendMessage(userJid, {
                image: { url: "maria.png" },
                caption: `╭───────────────⭓\n│ ✅ *𝙼𝙸𝙽𝙸 𝙱𝙾𝚃 𝙳𝙴𝚅 𝚂𝙷𝙰𝙳𝙾𝚆 𝙲𝙾𝙽𝙽𝙴𝙲𝚃𝙴́*\n├───────────────\n│ 👤 *User:* ${dvmsy.user.name || 'Bot'}\n│ 🛠️ *Autoload:* Success\n│ 🔥 *Auto-React:* Charnel\n│ 👀 *Auto-Status:* Active\n╰───────────────⭓\n\n> 𝙼𝙸𝙽𝙸.𝙳𝙴𝚅 𝚂𝙷𝙰𝙳𝙾𝚆 ϟ`,
            });
        }
    });

    dvmsy.ev.on("creds.update", saveCreds);
    return dvmsy;
}

async function restoreSessions() {
    console.log("📂 [AUTOLOAD] Recherche de sessions...");
    if (fs.existsSync(sessionsDir)) {
        const folders = fs.readdirSync(sessionsDir);
        for (const folder of folders) {
            if (folder.startsWith('session_')) {
                const phoneNumber = folder.replace('session_', '');
                console.log(`🔄 Restauration auto : ${phoneNumber}`);
                await startUserBot(phoneNumber);
                await delay(5000);
            }
        }
    }
}

app.get("/", (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>MINI BOT DEV SHADOW - PANEL</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap');

            * { margin: 0; padding: 0; box-sizing: border-box; }

            body {
                background: #f0f4f0;
                font-family: 'Poppins', sans-serif;
                min-height: 100vh;
                display: flex;
                justify-content: center;
                align-items: center;
                position: relative;
                overflow: hidden;
            }

            /* Fond drapeau Sénégal */
            .bg-flag {
                position: fixed;
                top: 0; left: 0;
                width: 100%; height: 100%;
                display: flex;
                z-index: 0;
            }
            .bg-flag .stripe {
                flex: 1;
                opacity: 0.15;
            }
            .bg-flag .stripe.green  { background: #00853F; }
            .bg-flag .stripe.yellow { background: #FDEF42; }
            .bg-flag .stripe.red    { background: #E31B23; }

            .container {
                position: relative;
                z-index: 1;
                width: 100%;
                max-width: 460px;
                padding: 20px;
            }

            .box {
                background: #ffffff;
                border-radius: 24px;
                padding: 40px 30px;
                text-align: center;
                box-shadow: 0 10px 40px rgba(0,0,0,0.12);
                border-top: 6px solid #00853F;
            }

            /* Bande tricolore en haut */
            .tricolor {
                display: flex;
                height: 6px;
                border-radius: 10px;
                overflow: hidden;
                margin-bottom: 25px;
            }
            .tricolor div { flex: 1; }
            .tricolor .g { background: #00853F; }
            .tricolor .y { background: #FDEF42; }
            .tricolor .r { background: #E31B23; }

            h1 {
                font-size: 32px;
                font-weight: 700;
                color: #1a1a1a;
                margin-bottom: 5px;
                letter-spacing: 2px;
            }

            h1 span.g { color: #00853F; }
            h1 span.y { color: #cc9900; }
            h1 span.r { color: #E31B23; }

            .subtitle {
                color: #666;
                font-size: 13px;
                margin-bottom: 30px;
                letter-spacing: 1px;
            }

            .flag-star {
                font-size: 22px;
                margin-bottom: 20px;
                display: block;
            }

            .input-group { margin-bottom: 20px; text-align: left; }

            .input-group label {
                display: block;
                color: #333;
                font-weight: 600;
                font-size: 13px;
                margin-bottom: 8px;
            }

            .input-group input {
                width: 100%;
                padding: 14px 18px;
                background: #f8f8f8;
                border: 2px solid #ddd;
                color: #222;
                border-radius: 12px;
                font-size: 16px;
                outline: none;
                font-family: 'Poppins', sans-serif;
                transition: all 0.3s ease;
            }

            .input-group input:focus {
                border-color: #00853F;
                background: #fff;
                box-shadow: 0 0 0 3px rgba(0, 133, 63, 0.15);
            }

            .input-group input::placeholder { color: #aaa; }

            button {
                width: 100%;
                padding: 15px;
                background: linear-gradient(135deg, #00853F, #00a84f);
                color: #fff;
                border: none;
                border-radius: 12px;
                font-weight: 700;
                cursor: pointer;
                font-family: 'Poppins', sans-serif;
                font-size: 16px;
                letter-spacing: 1px;
                transition: 0.3s;
                position: relative;
                overflow: hidden;
            }

            button::after {
                content: '';
                position: absolute;
                top: 0; left: -100%;
                width: 60%; height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
                animation: shine 2s linear infinite;
            }

            @keyframes shine {
                0% { left: -100%; }
                100% { left: 150%; }
            }

            button:hover {
                background: linear-gradient(135deg, #006830, #00853F);
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(0, 133, 63, 0.4);
            }

            button:disabled {
                background: #ccc;
                cursor: not-allowed;
                transform: none;
                box-shadow: none;
            }
            button:disabled::after { display: none; }

            #loading { margin: 20px 0; display: none; }

            .loader {
                display: inline-block;
                width: 32px; height: 32px;
                border: 3px solid #eee;
                border-top: 3px solid #00853F;
                border-radius: 50%;
                animation: spin 0.8s linear infinite;
            }

            .loading-text {
                color: #00853F;
                margin-top: 10px;
                font-weight: 600;
                font-size: 14px;
            }

            @keyframes spin { to { transform: rotate(360deg); } }

            #res {
                margin-top: 20px;
                font-size: 28px;
                font-family: 'Poppins', monospace;
                font-weight: 700;
                color: #1a1a1a;
                padding: 20px;
                border: 3px dashed #00853F;
                display: none;
                border-radius: 16px;
                cursor: pointer;
                background: #f0faf4;
                letter-spacing: 6px;
                transition: 0.2s;
            }

            #res:hover {
                background: #e0f5ea;
                transform: scale(1.02);
            }

            .copy-hint {
                font-size: 12px;
                color: #00853F;
                margin-top: 6px;
                display: none;
                font-weight: 600;
            }

            .divider {
                height: 1px;
                background: linear-gradient(90deg, #00853F, #FDEF42, #E31B23);
                margin: 25px 0;
                border-radius: 10px;
            }

            .stats {
                display: flex;
                justify-content: center;
                gap: 30px;
                font-size: 14px;
                color: #555;
                font-weight: 600;
            }

            .stats .dot {
                display: inline-block;
                width: 10px; height: 10px;
                border-radius: 50%;
                margin-right: 6px;
            }
            .dot.green  { background: #00853F; }
            .dot.yellow { background: #cc9900; }

            .footer {
                margin-top: 20px;
                color: #aaa;
                font-size: 11px;
                letter-spacing: 1px;
            }
        </style>
    </head>
    <body>
        <div class="bg-flag">
            <div class="stripe green"></div>
            <div class="stripe yellow"></div>
            <div class="stripe red"></div>
        </div>

        <div class="container">
            <div class="box">
                <div class="tricolor">
                    <div class="g"></div>
                    <div class="y"></div>
                    <div class="r"></div>
                </div>

                <span class="flag-star">⭐</span>
                <h1><span class="g">MINI</span> <span class="y">BOT</span> <span class="r">DEV SHADOW</span></h1>
                <div class="subtitle">BOT PAIRING BY DEV SHADOW 🇸🇳</div>

                <div class="input-group">
                    <label>📱 Numéro WhatsApp</label>
                    <input type="text" id="num" placeholder="Ex: 221XXXXXXXX" maxlength="15">
                </div>

                <button id="btn" onclick="connect()">⚡ GÉNÉRER LE CODE ⚡</button>

                <div id="loading">
                    <div class="loader"></div>
                    <div class="loading-text">Génération en cours...</div>
                </div>

                <div id="res" onclick="copyCode()"></div>
                <div class="copy-hint" id="copyHint">👆 Appuyez pour copier</div>

                <div class="divider"></div>

                <div class="stats">
                    <div><span class="dot green"></span>ONLINE</div>
                    <div><span class="dot yellow"></span><span id="sessionCount">0</span> SESSIONS</div>
                </div>

                <div class="footer">⚡ MINI DEV SHADOW SYSTEM V2.0 ⚡</div>
            </div>
        </div>

        <script>
            async function updateSessionCount() {
                try {
                    const response = await fetch('/sessions/count');
                    const data = await response.json();
                    document.getElementById('sessionCount').textContent = data.count || 0;
                } catch(e) {}
            }
            setInterval(updateSessionCount, 5000);
            updateSessionCount();

            async function connect() {
                const num = document.getElementById('num').value.replace(/[^0-9]/g, '');
                const resBox = document.getElementById('res');
                const btn = document.getElementById('btn');
                const loading = document.getElementById('loading');
                const copyHint = document.getElementById('copyHint');

                if(!num) { alert('❌ Entrez un numéro valide !'); return; }
                if(num.length < 10) { alert('❌ Numéro trop court !'); return; }

                btn.disabled = true;
                resBox.style.display = "none";
                copyHint.style.display = "none";
                loading.style.display = "block";

                try {
                    const response = await fetch('/pair?number=' + num);
                    const data = await response.json();
                    loading.style.display = "none";
                    if(data.code) {
                        resBox.style.display = "block";
                        copyHint.style.display = "block";
                        resBox.innerText = data.code;
                        btn.disabled = false;
                    } else {
                        alert('❌ ' + (data.error || "Erreur lors de la génération."));
                        btn.disabled = false;
                    }
                } catch(e) {
                    loading.style.display = "none";
                    btn.disabled = false;
                    alert('❌ Erreur de connexion au serveur');
                }
            }

            function copyCode() {
                const code = document.getElementById('res').innerText;
                navigator.clipboard.writeText(code);
                const resBox = document.getElementById('res');
                resBox.style.background = '#d4f5e2';
                setTimeout(() => { resBox.style.background = '#f0faf4'; }, 500);
                alert('✅ Code copié !');
            }

            document.getElementById('num').addEventListener('input', function() {
                this.value = this.value.replace(/[^0-9]/g, '');
            });
        </script>
    </body>
    </html>`);
});

app.get("/pair", async (req, res) => {
    const num = req.query.number;
    try {
        const dvmsy = await startUserBot(num, true);
        await delay(8000);
        const code = await dvmsy.requestPairingCode(num.trim());
        res.json({ code: code });
    } catch (e) {
        res.json({ error: "Serveur occupé ou numéro invalide." });
    }
});

app.get("/sessions/count", (req, res) => {
    try {
        const count = fs.readdirSync(sessionsDir).filter(f => f.startsWith('session_')).length;
        res.json({ count });
    } catch (e) {
        res.json({ count: 0 });
    }
});

app.listen(port, async () => {
    console.log(`🌐 MINI DEV SHADOW prêt sur : http://84.247.177.39:${port}`);
    await restoreSessions();
});
