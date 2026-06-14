// commands/kick.js
export default async function kickCommand(m, dvmsy) {
    const sock = dvmsy;
    const chatId = m.key.remoteJid;
    const message = m;

    if (!m.isOwner) {
        if (!m.isBotAdmin) {
            await sock.sendMessage(chatId, { text: 'Please make the bot an admin first.' }, { quoted: message });
            return;
        }
        if (!m.isGroupAdmin) {
            await sock.sendMessage(chatId, { text: 'Only group admins can use the kick command.' }, { quoted: message });
            return;
        }
    }

    let usersToKick = [];

    if (m.msg?.contextInfo?.participant) {
        usersToKick = [m.msg.contextInfo.participant];
    } else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
        usersToKick = [message.message.extendedTextMessage.contextInfo.participant];
    }

    if (usersToKick.length === 0) {
        await sock.sendMessage(chatId, { text: 'Please reply to their message to kick!' }, { quoted: message });
        return;
    }

    const botId = sock.user?.id?.split(':')[0] + '@s.whatsapp.net';
    if (usersToKick.includes(botId)) {
        await sock.sendMessage(chatId, { text: "I can't kick myself🤖" }, { quoted: message });
        return;
    }

    try {
        await sock.groupParticipantsUpdate(chatId, usersToKick, "remove");
        const usernames = usersToKick.map(jid => `@${jid.split('@')[0]}`);
        await sock.sendMessage(chatId, {
            text: `${usernames.join(', ')} has been kicked successfully!`,
            mentions: usersToKick
        });
    } catch (error) {
        console.error('Error in kick command:', error);
        await sock.sendMessage(chatId, { text: 'Failed to kick user(s)!' });
    }
}
