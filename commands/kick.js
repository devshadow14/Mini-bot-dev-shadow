// commands/kick.js
export default async function kickCommand(m, dvmsy) {
    const sock = dvmsy;
    const chatId = m.key.remoteJid;
    const senderId = m.sender;
    const message = m;
    const mentionedJids = m.msg?.contextInfo?.mentionedJid || [];

    const isOwner = m.isOwner;
    if (!isOwner) {
        const isSenderAdmin = m.isGroupAdmin;
        const isBotAdmin = m.isBotAdmin;

        if (!isBotAdmin) {
            await sock.sendMessage(chatId, { text: 'Please make the bot an admin first.' }, { quoted: message });
            return;
        }

        if (!isSenderAdmin) {
            await sock.sendMessage(chatId, { text: 'Only group admins can use the kick command.' }, { quoted: message });
            return;
        }
    }

    let usersToKick = [];

    if (mentionedJids && mentionedJids.length > 0) {
        usersToKick = mentionedJids;
    } else if (m.msg?.contextInfo?.participant) {
        usersToKick = [m.msg.contextInfo.participant];
    } else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
        usersToKick = [message.message.extendedTextMessage.contextInfo.participant];
    }

    if (usersToKick.length === 0) {
        await sock.sendMessage(chatId, {
            text: 'Please mention the user or reply to their message to kick!'
        }, { quoted: message });
        return;
    }

    const botId = sock.user?.id?.split(':')[0] + '@s.whatsapp.net';

    if (usersToKick.some(u => u === botId)) {
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
