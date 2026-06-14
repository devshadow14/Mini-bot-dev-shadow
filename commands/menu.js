// commands/menu.js
export default async function menu(m, dvmsy) {
    const { sender, isGroup, pushName } = m;
    const prefix = global.config?.PREFIX || '👾';
    const botName = global.config?.BOT_NAME || 'MINI BOT DEV SHADOW';
    const now = new Date();
    const hour = now.getHours();
    let greeting = hour < 12 ? '🌅 Bonjour' : hour < 18 ? '☀️ Bon après-midi' : '🌙 Bonsoir';

    const menuText = `${greeting} *${pushName || sender.split('@')[0]}* !

╔══════════════════════╗
║   🤖 *${botName}*   ║
╚══════════════════════╝
📅 ${now.toLocaleDateString('fr-FR')} • ⏰ ${now.toLocaleTimeString('fr-FR')}
🔑 Préfixe : *${prefix}*

━━━━━━━━━━━━━━━━━━━━━━
*🌐 GÉNÉRAL*
━━━━━━━━━━━━━━━━━━━━━━
• ${prefix}menu
• ${prefix}ping
• ${prefix}info
• ${prefix}runtime
• ${prefix}help

━━━━━━━━━━━━━━━━━━━━━━
*👥 GROUPE*
━━━━━━━━━━━━━━━━━━━━━━
• ${prefix}tagall
• ${prefix}hidetag
• ${prefix}link
• ${prefix}groupinfo
• ${prefix}vv
• ${prefix}everyone
• ${prefix}regles

━━━━━━━━━━━━━━━━━━━━━━
*🛡️ MODÉRATION*
━━━━━━━━━━━━━━━━━━━━━━
• ${prefix}kick
• ${prefix}kickall
• ${prefix}ban
• ${prefix}unban
• ${prefix}mute
• ${prefix}unmute
• ${prefix}warn
• ${prefix}unwarn
• ${prefix}promote
• ${prefix}demote

━━━━━━━━━━━━━━━━━━━━━━
*⚙️ PARAMÈTRES*
━━━━━━━━━━━━━━━━━━━━━━
• ${prefix}antilink
• ${prefix}welcome
• ${prefix}goodbye
• ${prefix}antibot
• ${prefix}antispam
• ${prefix}antiflood
• ${prefix}antifake
• ${prefix}antipromote

━━━━━━━━━━━━━━━━━━━━━━
*🎮 JEUX*
━━━━━━━━━━━━━━━━━━━━━━
• ${prefix}pile
• ${prefix}dé
• ${prefix}8ball
• ${prefix}rps
• ${prefix}quiz
• ${prefix}vrai
• ${prefix}devine
• ${prefix}jackpot
• ${prefix}duel
• ${prefix}chance

━━━━━━━━━━━━━━━━━━━━━━
*🎵 MEDIA*
━━━━━━━━━━━━━━━━━━━━━━
• ${prefix}play
• ${prefix}video
• ${prefix}audio
• ${prefix}lyrics
• ${prefix}sticker
• ${prefix}gif
• ${prefix}image
• ${prefix}tts

━━━━━━━━━━━━━━━━━━━━━━
*🌍 UTILITAIRES*
━━━━━━━━━━━━━━━━━━━━━━
• ${prefix}météo
• ${prefix}calc
• ${prefix}traduction
• ${prefix}wiki
• ${prefix}news
• ${prefix}heure
• ${prefix}date
• ${prefix}timer
• ${prefix}rappel
• ${prefix}qrcode
• ${prefix}court
• ${prefix}ip
• ${prefix}couleur
• ${prefix}emoji
• ${prefix}ascii

━━━━━━━━━━━━━━━━━━━━━━
*💰 ÉCONOMIE*
━━━━━━━━━━━━━━━━━━━━━━
• ${prefix}solde
• ${prefix}daily
• ${prefix}transfert
• ${prefix}shop
• ${prefix}acheter
• ${prefix}inventaire
• ${prefix}travail
• ${prefix}vol
• ${prefix}classement
• ${prefix}banque

━━━━━━━━━━━━━━━━━━━━━━
*📊 PROFIL*
━━━━━━━━━━━━━━━━━━━━━━
• ${prefix}profil
• ${prefix}niveau
• ${prefix}xp
• ${prefix}badge
• ${prefix}bio
• ${prefix}avatar
• ${prefix}rang
• ${prefix}stats

━━━━━━━━━━━━━━━━━━━━━━
*🤖 IA*
━━━━━━━━━━━━━━━━━━━━━━
• ${prefix}ia
• ${prefix}gpt
• ${prefix}image-ia
• ${prefix}résumé
• ${prefix}analyse
• ${prefix}code

━━━━━━━━━━━━━━━━━━━━━━
*👑 OWNER*
━━━━━━━━━━━━━━━━━━━━━━
• ${prefix}restart
• ${prefix}shutdown
• ${prefix}broadcast
• ${prefix}eval
• ${prefix}setname

━━━━━━━━━━━━━━━━━━━━━━
📌 *TOTAL : 100 COMMANDES* 🔥
━━━━━━━━━━━━━━━━━━━━━━

> 🤖 *${botName}* • Powered by 𝙳𝙴𝚅 𝚂𝙷𝙰𝙳𝙾𝚆 𝚃𝙴𝙲𝙷 ⚡`;

    try {
        await dvmsy.sendMessage(m.key.remoteJid, {
            image: { url: 'https://files.catbox.moe/bjuovk.jpg' },
            caption: menuText,
            contextInfo: {
                mentionedJid: [sender],
                forwardingScore: 999,
                isForwarded: true
            }
        }, { quoted: m });
    } catch (e) {
        await dvmsy.sendMessage(m.key.remoteJid, {
            text: menuText,
            contextInfo: {
                mentionedJid: [sender],
                forwardingScore: 999,
                isForwarded: true
            }
        }, { quoted: m });
    }
}
