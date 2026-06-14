// Utils/messageUtils.js
export function getMessageInfo(m, dvmsy) {
    try {
        if (!m) return { body: '', sender: '', pushName: '' };
        
        const messageType = m.message ? 
            Object.keys(m.message)[0] : 'unknown';
        
        let body = '';
        let pushName = m.pushName || '';
        
        if (messageType === 'conversation') {
            body = m.message.conversation;
        } else if (messageType === 'extendedTextMessage') {
            body = m.message.extendedTextMessage.text;
        } else if (messageType === 'imageMessage') {
            body = m.message.imageMessage.caption || '';
        } else if (messageType === 'videoMessage') {
            body = m.message.videoMessage.caption || '';
        }
        
        const sender = m.key.participant || m.key.remoteJid;
        
        return {
            body,
            sender,
            pushName,
            messageType,
            isGroup: m.key.remoteJid.endsWith('@g.us'),
            timestamp: m.messageTimestamp
        };
    } catch (error) {
        console.error('Erreur getMessageInfo:', error);
        return { body: '', sender: '', pushName: '' };
    }
}

export async function getGroupInfo(m, dvmsy) {
    try {
        if (!m.key.remoteJid.endsWith('@g.us')) {
            return { isGroup: false, isGroupAdmin: false, isBotAdmin: false };
        }
        
        const groupMetadata = await dvmsy.groupMetadata(m.key.remoteJid);
        const participants = groupMetadata.participants;
        const sender = m.key.participant || m.key.remoteJid;

        // ✅ Extraire le numéro du bot correctement
        const rawBotId = dvmsy.user.id;
        const botNumber = rawBotId.split(':')[0].split('@')[0];
        const botId = botNumber + '@s.whatsapp.net';

        // Vérifier si l'envoyeur est admin
        const senderParticipant = participants.find(p => p.id === sender);
        const isGroupAdmin = senderParticipant?.admin === 'admin' || senderParticipant?.admin === 'superadmin';

        // ✅ Vérifier le bot en comparant le numéro uniquement
        const botParticipant = participants.find(p => {
            const pNumber = p.id.split(':')[0].split('@')[0];
            return pNumber === botNumber;
        });
        const isBotAdmin = botParticipant?.admin === 'admin' || botParticipant?.admin === 'superadmin';

        return {
            isGroup: true,
            isGroupAdmin,
            isBotAdmin,
            groupName: groupMetadata.subject,
            groupId: m.key.remoteJid,
            participants,
            groupAdmins: participants.filter(p => p.admin)
        };
    } catch (error) {
        console.error('Erreur getGroupInfo:', error);
        return { isGroup: false, isGroupAdmin: false, isBotAdmin: false };
    }
}

export function getUserPermissions(sender, owners = []) {
    // ✅ Comparer les numéros sans suffixe
    const senderNumber = sender.split('@')[0];
    const isOwner = owners.some(o => o.split('@')[0] === senderNumber);
    return {
        isOwner,
        isAdmin: isOwner
    };
}
