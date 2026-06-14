// commands/demote.js
export async function demoteCommand(m, dvmsy) {
    const sock = dvmsy;
    const chatId = m.key.remoteJid;
    const message = m;

    if (!chatId.endsWith('@g.us')) {
        await sock.sendMessage(chatId, { text: 'This command can only be used in groups!' });
        return;
    }

    if (!m.isBotAdmin) {
        await sock.sendMessage(chatId, { text: '❌ Error: Please make the bot an admin first to use this command.' });
        return;
    }

    if (!m.isGroupAdmin && !m.isOwner) {
        await sock.sendMessage(chatId, { text: '❌ Error: Only group admins can use the demote command.' });
        return;
    }

    let userToDemote = [];

    if (m.msg?.contextInfo?.participant) {
        userToDemote = [m.msg.contextInfo.participant];
    } else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
        userToDemote = [message.message.extendedTextMessage.contextInfo.participant];
    }

    if (userToDemote.length === 0) {
        await sock.sendMessage(chatId, { text: '❌ Error: Please reply to their message to demote!' });
        return;
    }

    try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await sock.groupParticipantsUpdate(chatId, userToDemote, "demote");

        const usernames = userToDemote.map(jid => `@${jid.split('@')[0]}`);

        await new Promise(resolve => setTimeout(resolve, 1000));

        const demotionMessage = `*『 GROUP DEMOTION 』*\n\n` +
            `👤 *Demoted User${userToDemote.length > 1 ? 's' : ''}:*\n` +
            `${usernames.map(name => `• ${name}`).join('\n')}\n\n` +
            `👑 *Demoted By:* @${m.sender.split('@')[0]}\n\n` +
            `📅 *Date:* ${new Date().toLocaleString()}`;

        await sock.sendMessage(chatId, {
            text: demotionMessage,
            mentions: [...userToDemote, m.sender]
        });
    } catch (error) {
        console.error('Error in demote command:', error);
        if (error.data === 429) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            await sock.sendMessage(chatId, { text: '❌ Rate limit reached. Please try again in a few seconds.' });
        } else {
            await sock.sendMessage(chatId, { text: '❌ Failed to demote user(s). Make sure the bot is admin and has sufficient permissions.' });
        }
    }
}

export async function handleDemotionEvent(sock, groupId, participants, author) {
    try {
        if (!Array.isArray(participants) || participants.length === 0) return;

        await new Promise(resolve => setTimeout(resolve, 1000));

        const demotedUsernames = participants.map(jid => {
            const jidString = typeof jid === 'string' ? jid : (jid.id || jid.toString());
            return `@${jidString.split('@')[0]}`;
        });

        let mentionList = participants.map(jid => typeof jid === 'string' ? jid : (jid.id || jid.toString()));
        let demotedBy = 'System';

        if (author && author.length > 0) {
            const authorJid = typeof author === 'string' ? author : (author.id || author.toString());
            demotedBy = `@${authorJid.split('@')[0]}`;
            mentionList.push(authorJid);
        }

        await new Promise(resolve => setTimeout(resolve, 1000));

        const demotionMessage = `*『 GROUP DEMOTION 』*\n\n` +
            `👤 *Demoted User${participants.length > 1 ? 's' : ''}:*\n` +
            `${demotedUsernames.map(name => `• ${name}`).join('\n')}\n\n` +
            `👑 *Demoted By:* ${demotedBy}\n\n` +
            `📅 *Date:* ${new Date().toLocaleString()}`;

        await sock.sendMessage(groupId, { text: demotionMessage, mentions: mentionList });
    } catch (error) {
        console.error('Error handling demotion event:', error);
        if (error.data === 429) await new Promise(resolve => setTimeout(resolve, 2000));
    }
}
