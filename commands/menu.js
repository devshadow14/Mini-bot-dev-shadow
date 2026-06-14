// commands/menu.js
export default async function menu(m, dvmsy) {
    const { sender, isGroup, pushName } = m;
    
    const menuText = `╭───────────────⭓
│ *${global.config?.BOT_NAME || '𝙼𝙰𝚁𝙸𝙰 𝚇𝙳'}*
├───────────────
│ 👤 *User:* ${pushName || sender.split('@')[0]}
│ 📱 *Number:* ${sender.split('@')[0]}
│ 🏷️ *Group:* ${isGroup ? 'Oui' : 'Non'}
│ ⚡ *Prefix:* ${global.config?.PREFIX || '👾'}
├───────────────
│ *📌 COMMANDES DISPONIBLES*
├───────────────
│
│ *🛠️ COMMANDES GÉNÉRALES*
│ 👾ping - Vérifier la réponse du bot
│ 👾menu - Afficher ce menu
│ 👾info - Info du bot
│ 👾runtime - Temps d'activité
│
│ *👑 COMMANDES OWNER*
│ 👾restart - Redémarrer le bot
│ 👾shutdown - Éteindre le bot
│ 👾broadcast - Message à tous
│
│ *👥 COMMANDES GROUPE*
│ 👾tagall - Mentionner tous
│ 👾hidetag - Mentionner caché
│ 👾link - Lien du groupe
│
│ *🛡️ COMMANDES ADMIN*
│ 👾antilink - Activer/désactiver
│ 👾welcome - Message de bienvenue
│
╰───────────────⭓

> ⚡ MARIA-XD v2.0 - Powered by Baileys`;

    await dvmsy.sendMessage(m.key.remoteJid, {
        text: menuText,
        contextInfo: {
            mentionedJid: [sender],
            forwardingScore: 999,
            isForwarded: true
        }
    });
}