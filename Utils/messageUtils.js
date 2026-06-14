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
            return { isGroup: false };
        }
        
        const groupMetadata = await dvmsy.groupMetadata(m.key.remoteJid);
        return {
            isGroup: true,
            groupName: groupMetadata.subject,
            groupId: m.key.remoteJid,
            participants: groupMetadata.participants,
            groupAdmins: groupMetadata.participants.filter(p => p.admin)
        };
    } catch (error) {
        return { isGroup: false };
    }
}

export function getUserPermissions(sender, owners = []) {
    return {
        isOwner: owners.includes(sender),
        isAdmin: false // Sera défini dans la commande groupe
    };
}