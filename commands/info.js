// commands/info.js
import os from 'os';
import { performance } from 'perf_hooks';

export default async function info(m, dvmsy) {
    const start = performance.now();
    
    // Récupérer les infos système
    const uptime = process.uptime();
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor(uptime / 3600) % 24;
    const minutes = Math.floor(uptime / 60) % 60;
    const seconds = Math.floor(uptime % 60);
    
    // Mémoire utilisée
    const memoryUsed = process.memoryUsage().heapUsed / 1024 / 1024;
    const memoryTotal = os.totalmem() / 1024 / 1024 / 1024;
    const memoryFree = os.freemem() / 1024 / 1024 / 1024;
    
    // Compter les sessions actives
    let sessionCount = 0;
    if (global.msgStore) {
        sessionCount = Object.keys(global.msgStore).length;
    }
    
    const infoText = `╭───────────────⭓
│ *📊 INFORMATIONS BOT*
├───────────────
│
│ *🤖 BOT INFO*
│ ├ Nom: ${global.config?.BOT_NAME || 'MARIA-XD'}
│ ├ Version: 2.0.0
│ ├ Préfixe: ${global.config?.PREFIX || '👾'}
│ ├ Sessions: ${sessionCount}
│
│ *⏰ TEMPS D'ACTIVITÉ*
│ ├ ${days}j ${hours}h ${minutes}m ${seconds}s
│
│ *💻 SYSTÈME*
│ ├ Plateforme: ${os.platform()}
│ ├ Architecture: ${os.arch()}
│ ├ CPU: ${os.cpus()[0].model}
│ ├ RAM: ${memoryTotal.toFixed(2)} GB
│ ├ RAM Libre: ${memoryFree.toFixed(2)} GB
│ ├ RAM Utilisée: ${memoryUsed.toFixed(2)} MB
│
│ *⚡ PERFORMANCE*
│ ├ Réponse: ${Math.round(performance.now() - start)}ms
│ ├ Node: ${process.version}
│
╰───────────────⭓

> Répondre aux étoiles pour continuer ⭐`;

    await dvmsy.sendMessage(m.key.remoteJid, { text: infoText });
}