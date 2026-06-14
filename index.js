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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3002;
const sessionsDir = path.join(__dirname, 'accounts');

// Création du dossier de stockage si absent
if (!fs.existsSync(sessionsDir)) fs.mkdirSync(sessionsDir, { recursive: true });

let tempDvmsys = {};
global.msgStore = {};

// Helper pour récupérer les paramètres (AntiPromote etc)
const getSetting = (type, key) => config[key] || false;

/**
 * FONCTION PRINCIPALE DE CONNEXION DU BOT
 */
async function startUserBot(phoneNumber, isPairing = false) {
    const sessionName = `session_${phoneNumber.replace(/[^0-9]/g, '')}`;
    const sessionPath = path.join(sessionsDir, sessionName);

    // Suppression de l'ancienne session si on demande un nouveau pairing
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
  
    // --- GESTION DE LA CONNEXION ---
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
                await delay(5000); // 5 secondes entre chaque compte pour la sécurité
            }
        }
    }
}

/**
 * INTERFACE WEB (PANEL)
 */
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
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                background: #050505;
                color: #fff;
                font-family: 'Rajdhani', sans-serif;
                min-height: 100vh;
                display: flex;
                justify-content: center;
                align-items: center;
                position: relative;
                overflow: hidden;
            }
            
            /* Animation de fond */
            .matrix-bg {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 0;
            }
            
            .matrix-bg span {
                position: absolute;
                color: #ff0000;
                font-size: 20px;
                font-family: 'Orbitron', monospace;
                text-shadow: 0 0 8px #ff0000;
                animation: fall 3s linear infinite;
                opacity: 0.2;
            }
            
            @keyframes fall {
                0% { transform: translateY(-100px); opacity: 0.2; }
                100% { transform: translateY(100vh); opacity: 0.8; }
            }
            
            .container {
                position: relative;
                z-index: 1;
                width: 100%;
                max-width: 500px;
                padding: 20px;
            }
            
            .box {
                background: rgba(0, 0, 0, 0.95);
                border: 3px solid #ff0000;
                border-radius: 30px;
                padding: 40px 30px;
                text-align: center;
                backdrop-filter: blur(10px);
                box-shadow: 0 0 50px rgba(255, 0, 0, 0.3),
                            inset 0 0 20px rgba(255, 0, 0, 0.2);
                position: relative;
                overflow: hidden;
            }
            
            .box::before {
                content: '';
                position: absolute;
                top: -50%;
                left: -50%;
                width: 200%;
                height: 200%;
                background: linear-gradient(45deg, transparent, rgba(255, 0, 0, 0.1), transparent);
                transform: rotate(45deg);
                animation: shine 3s infinite;
            }
            
            @keyframes shine {
                0% { transform: translateX(-100%) rotate(45deg); }
                100% { transform: translateX(100%) rotate(45deg); }
            }
            
            h1 {
                font-family: 'Orbitron', sans-serif;
                color: #ff0000;
                text-shadow: 0 0 20px #ff0000, 0 0 40px #ff0000;
                font-size: 42px;
                margin-bottom: 10px;
                letter-spacing: 4px;
                position: relative;
                display: inline-block;
            }
            
            h1::after {
                content: '';
                position: absolute;
                bottom: -10px;
                left: 50%;
                transform: translateX(-50%);
                width: 60px;
                height: 3px;
                background: #ff0000;
                box-shadow: 0 0 10px #ff0000;
            }
            
            .subtitle {
                color: #888;
                font-size: 16px;
                margin-bottom: 35px;
                letter-spacing: 3px;
                text-transform: uppercase;
            }
            
            .input-group {
                margin-bottom: 25px;
                position: relative;
            }
            
            .input-group label {
                display: block;
                text-align: left;
                color: #ff0000;
                margin-bottom: 8px;
                font-weight: bold;
                letter-spacing: 1px;
                font-size: 14px;
            }
            
            .input-group input {
                width: 100%;
                padding: 18px 20px;
                background: #111;
                border: 2px solid #333;
                color: #fff;
                border-radius: 15px;
                font-size: 18px;
                text-align: center;
                outline: none;
                font-family: 'Orbitron', monospace;
                transition: all 0.3s ease;
            }
            
            .input-group input:focus {
                border-color: #ff0000;
                box-shadow: 0 0 20px rgba(255, 0, 0, 0.3);
            }
            
            .input-group input::placeholder {
                color: #333;
                font-size: 14px;
            }
            
            button {
                width: 100%;
                padding: 18px;
                background: linear-gradient(45deg, #ff0000, #cc0000);
                color: #fff;
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
            }
            
            button::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
                transition: left 0.5s;
            }
            
            button:hover::before {
                left: 100%;
            }
            
            button:hover {
                transform: translateY(-3px);
                box-shadow: 0 10px 30px rgba(255, 0, 0, 0.5);
            }
            
            button:disabled {
                background: #333;
                cursor: not-allowed;
                transform: none;
                box-shadow: none;
            }
            
            button:disabled::before {
                display: none;
            }
            
            #loading {
                margin: 20px 0;
                display: none;
            }
            
            .loader {
                display: inline-block;
                width: 30px;
                height: 30px;
                border: 3px solid #333;
                border-top: 3px solid #ff0000;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }
            
            .loading-text {
                color: #ff0000;
                margin-top: 10px;
                font-weight: bold;
                animation: pulse 1.5s infinite;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.4; }
            }
            
            #res {
                margin-top: 25px;
                font-size: 40px;
                font-family: 'Orbitron', monospace;
                color: #fff;
                padding: 25px;
                border: 3px solid #ff0000;
                display: none;
                border-radius: 20px;
                cursor: pointer;
                background: linear-gradient(45deg, #0a0a0a, #1a1a1a);
                letter-spacing: 6px;
                font-weight: bold;
                text-shadow: 0 0 15px #ff0000;
                transition: 0.3s;
                position: relative;
            }
            
            #res:hover {
                transform: scale(1.05);
                box-shadow: 0 0 40px rgba(255, 0, 0, 0.6);
            }
            
            #res::before {
                content: '📋 CLICK TO COPY';
                position: absolute;
                top: -20px;
                left: 50%;
                transform: translateX(-50%);
                font-size: 12px;
                color: #ff0000;
                background: #000;
                padding: 5px 10px;
                border-radius: 10px;
                border: 1px solid #ff0000;
                opacity: 0;
                transition: 0.3s;
                white-space: nowrap;
            }
            
            #res:hover::before {
                opacity: 1;
                top: -30px;
            }
            
            .stats {
                margin-top: 20px;
                display: flex;
                justify-content: center;
                gap: 30px;
                color: #666;
                font-size: 14px;
            }
            
            .stats span {
                color: #ff0000;
                font-weight: bold;
            }
            
            .footer {
                margin-top: 20px;
                color: #333;
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 2px;
            }
        </style>
    </head>
    <body>
        <div class="matrix-bg" id="matrix"></div>
        
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
                    <div>🔴 <span id="sessionCount">0</span> SESSIONS</div>
                </div>
                
                <div class="footer">
                    ⚡ MARIA XD SYSTEM V2.0 ⚡
                </div>
            </div>
        </div>

        <script>
            // Effet Matrix amélioré
            function createMatrix() {
                const matrix = document.getElementById('matrix');
                const chars = '01アイウエオカキクケコサシスセソタチツテト';
                
                for(let i = 0; i < 50; i++) {
                    const span = document.createElement('span');
                    span.style.left = Math.random() * 100 + '%';
                    span.style.animationDelay = Math.random() * 3 + 's';
                    span.style.animationDuration = 2 + Math.random() * 3 + 's';
                    span.style.fontSize = (15 + Math.random() * 20) + 'px';
                    span.innerHTML = chars[Math.floor(Math.random() * chars.length)];
                    matrix.appendChild(span);
                }
            }
            
            createMatrix();
            
            // Mise à jour du compteur de sessions
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
                
                if(!num) {
                    alert('❌ Entrez un numéro valide !');
                    return;
                }
                
                if(num.length < 10) {
                    alert('❌ Numéro trop court !');
                    return;
                }
                
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
                
                // Animation de copie
                const resBox = document.getElementById('res');
                resBox.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    resBox.style.transform = 'scale(1)';
                }, 200);
                
                alert('✅ Code copié dans le presse-papier !');
            }
            
            // Auto-formatage du numéro
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
        await delay(8000); // Temps de sécurité
        const code = await dvmsy.requestPairingCode(num.trim());
        res.json({ code: code });
    } catch (e) {
        res.json({ error: "Serveur occupé ou numéro invalide." });
    }
});

// Nouvelle route pour compter les sessions
app.get("/sessions/count", (req, res) => {
    try {
        const count = fs.readdirSync(sessionsDir).filter(f => f.startsWith('session_')).length;
        res.json({ count });
    } catch (e) {
        res.json({ count: 0 });
    }
});

// --- DÉMARRAGE GLOBAL ---
app.listen(port, async () => {
    console.log(`🌐 MARIA-XD prêt sur : http://84.247.177.39:${port}`);
    await restoreSessions();
});