// commands/welcome.js
const welcomeStore = {};
const goodbyeStore = {};

// ─── Helpers stockage ─────────────────────────────────────────────────────────
function setWelcome(chatId, message) { welcomeStore[chatId] = { enabled: true, message }; }
function isWelcomeOn(chatId) { return welcomeStore[chatId]?.enabled || false; }
function getWelcome(chatId) { return welcomeStore[chatId]?.message || null; }
function setGoodbye(chatId, message) { goodbyeStore[chatId] = { enabled: true, message }; }
function isGoodByeOn(chatId) { return goodbyeStore[chatId]?.enabled || false; }
function getGoodbye(chatId) { return goodbyeStore[chatId]?.message || null; }

// ─── COMMANDE WELCOME ─────────────────────────────────────────────────────────
export async function welcomeCommand(m, dvmsy) {
    const sock = dvmsy;
    const chatId = m.key.remoteJid;

    if (!chatId.endsWith('@g.us')) {
        await sock.sendMessage(chatId, { text: 'This command can only be used in groups.' });
        return;
    }

    if (!m.isGroupAdmin && !m.isOwner) {
        await sock.sendMessage(chatId, { text: '❌ Only group admins can use this command.' }, { quoted: m });
        return;
    }

    const args = m.args || [];
    const action = args[0]?.toLowerCase();

    if (action === 'off') {
        welcomeStore[chatId] = { enabled: false, message: null };
        await sock.sendMessage(chatId, { text: '🔴 Welcome message disabled.' }, { quoted: m });
    } else if (action === 'set' && args.slice(1).join(' ')) {
        setWelcome(chatId, args.slice(1).join(' '));
        await sock.sendMessage(chatId, { text: '✅ Custom welcome message set!' }, { quoted: m });
    } else {
        setWelcome(chatId, null);
        await sock.sendMessage(chatId, { text: '✅ Welcome message enabled!\n\nVariables: {user}, {group}, {description}' }, { quoted: m });
    }
}

// ─── COMMANDE GOODBYE ─────────────────────────────────────────────────────────
export async function goodbyeCommand(m, dvmsy) {
    const sock = dvmsy;
    const chatId = m.key.remoteJid;

    if (!chatId.endsWith('@g.us')) {
        await sock.sendMessage(chatId, { text: 'This command can only be used in groups.' });
        return;
    }

    if (!m.isGroupAdmin && !m.isOwner) {
        await sock.sendMessage(chatId, { text: '❌ Only group admins can use this command.' }, { quoted: m });
        return;
    }

    const args = m.args || [];
    const action = args[0]?.toLowerCase();

    if (action === 'off') {
        goodbyeStore[chatId] = { enabled: false, message: null };
        await sock.sendMessage(chatId, { text: '🔴 Goodbye message disabled.' }, { quoted: m });
    } else if (action === 'set' && args.slice(1).join(' ')) {
        setGoodbye(chatId, args.slice(1).join(' '));
        await sock.sendMessage(chatId, { text: '✅ Custom goodbye message set!' }, { quoted: m });
    } else {
        setGoodbye(chatId, null);
        await sock.sendMessage(chatId, { text: '✅ Goodbye message enabled!' }, { quoted: m });
    }
}

// ─── ÉVÉNEMENT JOIN ───────────────────────────────────────────────────────────
export async function handleJoinEvent(sock, id, participants) {
    if (!isWelcomeOn(id)) return;

    const customMessage = getWelcome(id);
    const groupMetadata = await sock.groupMetadata(id);
    const groupName = groupMetadata.subject;
    const groupDesc = groupMetadata.desc || 'No description available';

    for (const participant of participants) {
        try {
            const participantString = typeof participant === 'string' ? participant : (participant.id || participant.toString());
            const user = participantString.split('@')[0];
            let displayName = user;

            try {
                const groupParticipants = groupMetadata.participants;
                const userParticipant = groupParticipants.find(p => p.id === participantString);
                if (userParticipant?.name) displayName = userParticipant.name;
            } catch {}

            let finalMessage;
            if (customMessage) {
                finalMessage = customMessage
                    .replace(/{user}/g, `@${displayName}`)
                    .replace(/{group}/g, groupName)
                    .replace(/{description}/g, groupDesc);
            } else {
                const now = new Date();
                const timeString = now.toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
                finalMessage = `╭╼━≪•𝙽𝙴𝚆 𝙼𝙴𝙼𝙱𝙴𝚁•≫━╾╮\n┃𝚆𝙴𝙻𝙲𝙾𝙼𝙴: @${displayName} 👋\n┃Member count: #${groupMetadata.participants.length}\n┃𝚃𝙸𝙼𝙴: ${timeString}⏰\n╰━━━━━━━━━━━━━━━╯\n\n*@${displayName}* Welcome to *${groupName}*! 🎉\n*Group 𝙳𝙴𝚂𝙲𝚁𝙸𝙿𝚃𝙸𝙾𝙽*\n${groupDesc}\n\n> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ MARIA XD*`;
            }

            // Essayer d'envoyer avec photo de profil
            try {
                let profilePicUrl = `https://img.pyrocdn.com/dbKUgahg.png`;
                try {
                    const profilePic = await sock.profilePictureUrl(participantString, 'image');
                    if (profilePic) profilePicUrl = profilePic;
                } catch {}

                const apiUrl = `https://api.some-random-api.com/welcome/img/2/gaming3?type=join&textcolor=green&username=${encodeURIComponent(displayName)}&guildName=${encodeURIComponent(groupName)}&memberCount=${groupMetadata.participants.length}&avatar=${encodeURIComponent(profilePicUrl)}`;
                const response = await fetch(apiUrl);
                if (response.ok) {
                    const imageBuffer = await response.arrayBuffer();
                    await sock.sendMessage(id, { image: Buffer.from(imageBuffer), caption: finalMessage, mentions: [participantString] });
                    continue;
                }
            } catch {}

            await sock.sendMessage(id, { text: finalMessage, mentions: [participantString] });
        } catch (error) {
            console.error('Error sending welcome message:', error);
            const participantString = typeof participant === 'string' ? participant : (participant.id || participant.toString());
            await sock.sendMessage(id, { text: `Welcome @${participantString.split('@')[0]} to ${groupName}! 🎉`, mentions: [participantString] });
        }
    }
}

// ─── ÉVÉNEMENT LEAVE ──────────────────────────────────────────────────────────
export async function handleLeaveEvent(sock, id, participants) {
    if (!isGoodByeOn(id)) return;

    const customMessage = getGoodbye(id);
    const groupMetadata = await sock.groupMetadata(id);
    const groupName = groupMetadata.subject;

    for (const participant of participants) {
        try {
            const participantString = typeof participant === 'string' ? participant : (participant.id || participant.toString());
            const user = participantString.split('@')[0];
            let displayName = user;

            try {
                const groupParticipants = groupMetadata.participants;
                const userParticipant = groupParticipants.find(p => p.id === participantString);
                if (userParticipant?.name) displayName = userParticipant.name;
            } catch {}

            let finalMessage;
            if (customMessage) {
                finalMessage = customMessage
                    .replace(/{user}/g, `@${displayName}`)
                    .replace(/{group}/g, groupName);
            } else {
                finalMessage = ` *@${displayName}* we will never miss you! `;
            }

            try {
                let profilePicUrl = `https://img.pyrocdn.com/dbKUgahg.png`;
                try {
                    const profilePic = await sock.profilePictureUrl(participantString, 'image');
                    if (profilePic) profilePicUrl = profilePic;
                } catch {}

                const apiUrl = `https://api.some-random-api.com/welcome/img/2/gaming1?type=leave&textcolor=red&username=${encodeURIComponent(displayName)}&guildName=${encodeURIComponent(groupName)}&memberCount=${groupMetadata.participants.length}&avatar=${encodeURIComponent(profilePicUrl)}`;
                const response = await fetch(apiUrl);
                if (response.ok) {
                    const imageBuffer = await response.arrayBuffer();
                    await sock.sendMessage(id, { image: Buffer.from(imageBuffer), caption: finalMessage, mentions: [participantString] });
                    continue;
                }
            } catch {}

            await sock.sendMessage(id, { text: finalMessage, mentions: [participantString] });
        } catch (error) {
            console.error('Error sending goodbye message:', error);
            const participantString = typeof participant === 'string' ? participant : (participant.id || participant.toString());
            await sock.sendMessage(id, { text: `Goodbye @${participantString.split('@')[0]}! 👋`, mentions: [participantString] });
        }
    }
}
