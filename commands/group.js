// commands/group.js
export default async function group(m, dvmsy, command, args) {
    if (!m.isGroup) {
        return dvmsy.sendMessage(m.key.remoteJid, { 
            text: '❌ *Cette commande est uniquement disponible en groupe !*' 
        });
    }
    
    const groupMetadata = await dvmsy.groupMetadata(m.key.remoteJid);
    const participants = groupMetadata.participants;
    
    switch(command) {
        case 'tagall':
            let mentions = [];
            let text = `📢 *Message de ${m.pushName || 'Admin'}*\n\n`;
            
            for (let participant of participants) {
                mentions.push(participant.id);
                text += `@${participant.id.split('@')[0]}\n`;
            }
            
            await dvmsy.sendMessage(m.key.remoteJid, {
                text: text,
                mentions: mentions
            });
            break;
            
        case 'hidetag':
            const hideText = args.join(' ') || '🔇 *Message silencieux*';
            await dvmsy.sendMessage(m.key.remoteJid, {
                text: hideText,
                mentions: participants.map(a => a.id)
            });
            break;
            
        case 'link':
            const inviteCode = await dvmsy.groupInviteCode(m.key.remoteJid);
            await dvmsy.sendMessage(m.key.remoteJid, {
                text: `🔗 *Lien du groupe:*\nhttps://chat.whatsapp.com/${inviteCode}`
            });
            break;
            
        case 'groupinfo':
            const info = `╭───────────────⭓
│ *📊 INFOS GROUPE*
├───────────────
│
│ *📌 NOM:* ${groupMetadata.subject}
│ *🆔 ID:* ${m.key.remoteJid}
│ *👥 MEMBRES:* ${participants.length}
│ *👑 ADMIN:* ${participants.filter(p => p.admin).length}
│ *📅 CRÉÉ:* ${new Date(groupMetadata.creation * 1000).toLocaleDateString()}
│ *👤 CRÉATEUR:* ${groupMetadata.owner?.split('@')[0] || 'Inconnu'}
│
╰───────────────⭓`;
            await dvmsy.sendMessage(m.key.remoteJid, { text: info });
            break;
    }
}