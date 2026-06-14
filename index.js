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
                caption: `╭───────────────⭓\n│ ✅ *𝙼𝙰𝚁𝙸𝙰 𝚇𝙳 𝙲𝙾𝙽𝙽𝙴𝙲𝚃𝙴́*\n├───────────────\n│ 👤 *User:* ${dvmsy.user.name || 'Bot'}\n│ 🛠️ *Autoload:* Success\n│ 🔥 *Auto-React:* Charnel\n│ 👀 *Auto-Status:* Active\n╰───────────────⭓\n\n> 𝙼𝙰𝚁𝙸𝙰 𝚇𝙳 ϟ`,
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
        <title>𝙼𝙰𝚁𝙸𝙰 𝚇𝙳 - 𝙿𝙰𝙽𝙴𝙻</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&family=Rajdhani:wght@500;700&display=swap');
            * { margin: 0; padding: 0; box-sizing: border-box; }

            body {
                background: #0a0800;
                color: #ffd700;
                font-family: 'Rajdhani', sans-serif;
                min-height: 100vh;
                display: flex;
                justify-content: center;
                align-items: center;
                position: relative;
                overflow: hidden;
            }

            /* ── CANVAS HACKER ── */
            #hackerCanvas {
                position: fixed;
                top: 0; left: 0;
                width: 100%; height: 100%;
                z-index: 0;
                opacity: 0.35;
            }

            .container {
                position: relative;
                z-index: 1;
                width: 100%;
                max-width: 500px;
                padding: 20px;
            }

            .box {
                background: rgba(10, 8, 0, 0.92);
                border: 3px solid #ffd700;
                border-radius: 30px;
                padding: 40px 30px;
                text-align: center;
                backdrop-filter: blur(12px);
                box-shadow:
                    0 0 60px rgba(255, 215, 0, 0.25),
                    inset 0 0 30px rgba(255, 215, 0, 0.08);
                position: relative;
                overflow: hidden;
            }

            .box::before {
                content: '';
                position: absolute;
                top: -50%; left: -50%;
                width: 200%; height: 200%;
                background: linear-gradient(45deg, transparent, rgba(255, 215, 0, 0.07), transparent);
                transform: rotate(45deg);
                animation: shine 4s infinite;
            }

            @keyframes shine {
                0% { transform: translateX(-100%) rotate(45deg); }
                100% { transform: translateX(100%) rotate(45deg); }
            }

            h1 {
                font-family: 'Orbitron', sans-serif;
                color: #ffd700;
                text-shadow: 0 0 20px #ffd700, 0 0 50px #b8860b;
                font-size: 42px;
                margin-bottom: 10px;
                letter-spacing: 4px;
                position: relative;
                display: inline-block;
                animation: goldPulse 2s infinite;
            }

            @keyframes goldPulse {
                0%, 100% { text-shadow: 0 0 20px #ffd700, 0 0 50px #b8860b; }
                50% { text-shadow: 0 0 40px #ffd700, 0 0 80px #daa520, 0 0 100px #b8860b; }
            }

            h1::after {
                content: '';
                position: absolute;
                bottom: -10px; left: 50%;
                transform: translateX(-50%);
                width: 60px; height: 3px;
                background: linear-gradient(90deg, #b8860b, #ffd700, #b8860b);
                box-shadow: 0 0 10px #ffd700;
            }

            .subtitle {
                color: #b8860b;
                font-size: 16px;
                margin-bottom: 35px;
                letter-spacing: 3px;
                text-transform: uppercase;
            }

            .input-group { margin-bottom: 25px; position: relative; }

            .input-group label {
                display: block;
                text-align: left;
                color: #ffd700;
                margin-bottom: 8px;
                font-weight: bold;
                letter-spacing: 1px;
                font-size: 14px;
            }

            .input-group input {
                width: 100%;
                padding: 18px 20px;
                background: #0d0b00;
                border: 2px solid #b8860b;
                color: #ffd700;
                border-radius: 15px;
                font-size: 18px;
                text-align: center;
                outline: none;
                font-family: 'Orbitron', monospace;
                transition: all 0.3s ease;
            }

            .input-group input:focus {
                border-color: #ffd700;
                box-shadow: 0 0 20px rgba(255, 215, 0, 0.4);
            }

            .input-group input::placeholder { color: #4a3a00; font-size: 14px; }

            /* ── BOUTON AVEC CLIGNOTEMENT DORÉ ── */
            button {
                width: 100%;
                padding: 18px;
                background: linear-gradient(45deg, #b8860b, #ffd700, #daa520);
                background-size: 200% 200%;
                color: #0a0800;
                border: none;
                border-radius: 15px;
                font-weight: bold;
                cursor: pointer;
                font-family: 'Orbitron', sans-serif;
                font-size: 18px;
                letter-spacing: 2px;
                transition: 0.3s;
                position: relative;
                overflow: hidden;
                animation: btnGlow 1.5s ease-in-out infinite, gradientShift 3s ease infinite;
            }

            @keyframes gradientShift {
                0% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
                100% { background-position: 0% 50%; }
            }

            @keyframes btnGlow {
                0%, 100% {
                    box-shadow: 0 0 10px rgba(255, 215, 0, 0.4),
                                0 0 20px rgba(255, 215, 0, 0.2),
                                inset 0 0 10px rgba(255, 255, 255, 0.1);
                }
                50% {
                    box-shadow: 0 0 30px rgba(255, 215, 0, 0.9),
                                0 0 60px rgba(255, 215, 0, 0.5),
                                inset 0 0 20px rgba(255, 255, 255, 0.3);
                }
            }

            /* Effet eau à l'intérieur du bouton */
            button::before {
                content: '';
                position: absolute;
                top: -50%; left: -60%;
                width: 40%; height: 200%;
                background: linear-gradient(
                    105deg,
                    transparent 20%,
                    rgba(255, 255, 200, 0.5) 50%,
                    transparent 80%
                );
                animation: waterFlow 2s linear infinite;
            }

            @keyframes waterFlow {
                0% { left: -60%; }
                100% { left: 120%; }
            }

            button:hover {
                transform: translateY(-3px);
                filter: brightness(1.2);
            }

            button:disabled {
                background: #2a2000;
                color: #4a3a00;
                cursor: not-allowed;
                transform: none;
                animation: none;
                box-shadow: none;
            }

            button:disabled::before { display: none; }

            #loading { margin: 20px 0; display: none; }

            .loader {
                display: inline-block;
                width: 30px; height: 30px;
                border: 3px solid #2a2000;
                border-top: 3px solid #ffd700;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }

            .loading-text {
                color: #ffd700;
                margin-top: 10px;
                font-weight: bold;
                animation: pulse 1.5s infinite;
            }

            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

            #res {
                margin-top: 25px;
                font-size: 36px;
                font-family: 'Orbitron', monospace;
                color: #ffd700;
                padding: 25px;
                border: 3px solid #ffd700;
                display: none;
                border-radius: 20px;
                cursor: pointer;
                background: linear-gradient(45deg, #0d0b00, #1a1400);
                letter-spacing: 6px;
                font-weight: bold;
                text-shadow: 0 0 15px #ffd700;
                transition: 0.3s;
                position: relative;
                animation: resPulse 2s infinite;
            }

            @keyframes resPulse {
                0%, 100% { box-shadow: 0 0 10px rgba(255, 215, 0, 0.3); }
                50% { box-shadow: 0 0 30px rgba(255, 215, 0, 0.7); }
            }

            #res:hover { transform: scale(1.05); }

            #res::before {
                content: '📋 CLICK TO COPY';
                position: absolute;
                top: -20px; left: 50%;
                transform: translateX(-50%);
                font-size: 12px;
                color: #ffd700;
                background: #0a0800;
                padding: 5px 10px;
                border-radius: 10px;
                border: 1px solid #ffd700;
                opacity: 0;
                transition: 0.3s;
                white-space: nowrap;
            }

            #res:hover::before { opacity: 1; top: -30px; }

            .stats {
                margin-top: 20px;
                display: flex;
                justify-content: center;
                gap: 30px;
                color: #4a3a00;
                font-size: 14px;
            }

            .stats span { color: #ffd700; font-weight: bold; }

            .footer {
                margin-top: 20px;
                color: #4a3a00;
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 2px;
            }
        </style>
    </head>
    <body>
        <canvas id="hackerCanvas"></canvas>

        <div class="container">
            <div class="box">
                <h1>𝙼𝙰𝚁𝙸𝙰 𝚇𝙳</h1>
                <div class="subtitle">M U L T I - D E V I C E</div>
                <div class="input-group">
                    <label>📱 NUMÉRO WHATSAPP</label>
                    <input type="text" id="num" placeholder="Ex: 225XXXXXXXX" maxlength="15">
                </div>
                <button id="btn" onclick="connect()">
                    <span>⚡ GÉNÉRER LE CODE ⚡</span>
                </button>
                <div id="loading">
                    <div class="loader"></div>
                    <div class="loading-text">CRYPTAGE EN COURS...</div>
                </div>
                <div id="res" onclick="copyCode()"></div>
                <div class="stats">
                    <div>🟢 <span>ONLINE</span></div>
                    <div>🟡 <span id="sessionCount">0</span> SESSIONS</div>
                </div>
                <div class="footer">⚡ MARIA XD SYSTEM V2.0 ⚡</div>
            </div>
        </div>

        <script>
            // ── ARRIÈRE PLAN HACKER DORÉ ──
            const canvas = document.getElementById('hackerCanvas');
            const ctx = canvas.getContext('2d');

            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;

            window.addEventListener('resize', () => {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
                initColumns();
            });

            const chars = '01アイウエオカキクケコサシスセソタチツテトABCDEF0123456789$#@%&*';
            const fontSize = 16;
            let columns = [];

            function initColumns() {
                const count = Math.floor(canvas.width / fontSize);
                columns = Array.from({ length: count }, () => Math.random() * canvas.height / fontSize);
            }

            initColumns();

            function drawMatrix() {
                ctx.fillStyle = 'rgba(10, 8, 0, 0.05)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                columns.forEach((y, i) => {
                    const char = chars[Math.floor(Math.random() * chars.length)];
                    const x = i * fontSize;

                    // Dégradé doré : certains caractères plus brillants
                    const brightness = Math.random();
                    if (brightness > 0.95) {
                        ctx.fillStyle = '#ffffff';
                    } else if (brightness > 0.8) {
                        ctx.fillStyle = '#ffd700';
                    } else if (brightness > 0.5) {
                        ctx.fillStyle = '#b8860b';
                    } else {
                        ctx.fillStyle = '#4a3a00';
                    }

                    ctx.font = fontSize + 'px Orbitron, monospace';
                    ctx.fillText(char, x, y * fontSize);

                    if (y * fontSize > canvas.height && Math.random() > 0.975) {
                        columns[i] = 0;
                    } else {
                        columns[i] = y + 1;
                    }
                });
            }

            setInterval(drawMatrix, 50);

            // ── FONCTIONS BOT ──
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
                if(!num) { alert('❌ Entrez un numéro valide !'); return; }
                if(num.length < 10) { alert('❌ Numéro trop court !'); return; }
                btn.disabled = true;
                resBox.style.display = "none";
                loading.style.display = "block";
                try {
                    const response = await fetch('/pair?number=' + num);
                    const data = await response.json();
                    loading.style.display = "none";
                    if(data.code) {
                        resBox.style.display = "block";
                        resBox.innerText = data.code.match(/.{1,3}/g).join('-');
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
                const code = document.getElementById('res').innerText.replace(/-/g, '');
                navigator.clipboard.writeText(code);
                const resBox = document.getElementById('res');
                resBox.style.transform = 'scale(0.95)';
                setTimeout(() => { resBox.style.transform = 'scale(1)'; }, 200);
                alert('✅ Code copié dans le presse-papier !');
            }

            document.getElementById('num').addEventListener('input', function(e) {
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
    console.log(`🌐 MARIA-XD prêt sur : http://84.247.177.39:${port}`);
    await restoreSessions();
});
