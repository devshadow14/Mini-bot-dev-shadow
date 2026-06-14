// commands/unmute.js
export default async function unmuteCommand(m, dvmsy) {
    const sock = dvmsy;
    const chatId = m.key.remoteJid;

    if (!m.isBotAdmin) {
        await sock.sendMessage(chatId, { text: 'Please make the bot an admin first.' }, { quoted: m });
        return;
    }

    if (!m.isGroupAdmin && !m.isOwner) {
        await sock.sendMessage(chatId, { text: 'Only group admins can use the unmute command.' }, { quoted: m });
        return;
    }

    await sock.groupSettingUpdate(chatId, 'not_announcement');
    await sock.sendMessage(chatId, { text: 'The group has been unmuted.' }, { quoted: m });
}
