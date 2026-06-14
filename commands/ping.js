export default async function ping(m, hexaBot) {
    let message = `🏓 *Pong!*\n`;
    message += `👤 *Vous:* ${m.senderNumber}\n`;
    
    if (m.isGroup) {
        message += `👥 *Groupe:* ✅\n`;
        message += `🤖 *Bot admin:* ${m.isBotAdmin ? '✅' : '❌'}\n`;
        message += `👑 *Vous admin du groupe:* ${m.isGroupAdmin ? '✅' : '❌'}\n`;
    }
    
    message += `👑 *Propriétaire:* ${m.isOwner ? '✅' : '❌'}\n`;
    message += `⚡ *Sudo:* ${m.isSudo ? '✅' : '❌'}\n`;
    message += `👑 *Admin global:* ${m.isUserAdmin ? '✅' : '❌'}`;
    
    await dvmsy.sendMessage(m.chatId, {
        text: message
    }, {
        quoted: m
    });
}