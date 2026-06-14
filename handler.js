// handler.js
import config from './config.js';
import ping from './commands/ping.js';
import menu from './commands/menu.js';
import info from './commands/info.js';
import owner from './commands/owner.js';
import group from './commands/group.js';
import { handleAntilinkCommand, handleLinkDetection } from './commands/antilink.js';
import kickCommand from './commands/kick.js';
import muteCommand from './commands/mute.js';
import unmuteCommand from './commands/unmute.js';
import { demoteCommand } from './commands/demote.js';
import { promoteCommand } from './commands/promote.js';
import { welcomeCommand, goodbyeCommand } from './commands/welcome.js';
import { getMessageInfo, getUserPermissions } from './Utils/messageUtils.js';

global.config = config;

// ─── Cache groupMetadata (évite les appels réseau répétés) ───────────────────
const groupCache = new Map();
const GROUP_CACHE_TTL = 30000; // 30 secondes

async function getGroupInfoCached(m, dvmsy) {
    if (!m.key.remoteJid.endsWith('@g.us')) {
        return { isGroup: false, isGroupAdmin: false, isBotAdmin: false };
    }

    const chatId = m.key.remoteJid;
    const sender = m.key.participant || m.key.remoteJid;
    const now = Date.now();

    // Utiliser le cache si disponible et pas expiré
    if (groupCache.has(chatId)) {
        const cached = groupCache.get(chatId);
        if (now - cached.time < GROUP_CACHE_TTL) {
            const participants = cached.participants;
            const botId = dvmsy.user.id.split(':')[0] + '@s.whatsapp.net';
            const senderParticipant = participants.find(p => p.id === sender);
            const botParticipant = participants.find(p => p.id === botId);
            return {
                isGroup: true,
                isGroupAdmin: senderParticipant?.admin === 'admin' || senderParticipant?.admin === 'superadmin',
                isBotAdmin: botParticipant?.admin === 'admin' || botParticipant?.admin === 'superadmin',
                groupName: cached.subject,
                groupId: chatId,
                participants,
                groupAdmins: participants.filter(p => p.admin)
            };
        }
    }

    // Sinon appel réseau + mise en cache
    try {
        const groupMetadata = await dvmsy.groupMetadata(chatId);
        const participants = groupMetadata.participants;
        groupCache.set(chatId, {
            time: now,
            participants,
            subject: groupMetadata.subject
        });

        const botId = dvmsy.user.id.split(':')[0] + '@s.whatsapp.net';
        const senderParticipant = participants.find(p => p.id === sender);
        const botParticipant = participants.find(p => p.id === botId);

        return {
            isGroup: true,
            isGroupAdmin: senderParticipant?.admin === 'admin' || senderParticipant?.admin === 'superadmin',
            isBotAdmin: botParticipant?.admin === 'admin' || botParticipant?.admin === 'superadmin',
            groupName: groupMetadata.subject,
            groupId: chatId,
            participants,
            groupAdmins: participants.filter(p => p.admin)
        };
    } catch {
        return { isGroup: false, isGroupAdmin: false, isBotAdmin: false };
    }
}

export default async function handlerCommand(dvmsy, m, msg, chatUpdate, options) {
    try {
        if (!m) return;

        const messageInfo = getMessageInfo(m, dvmsy);
        const { body, sender, pushName } = messageInfo;

        // ✅ Antilink AVANT le préfixe mais SEULEMENT en groupe
        if (messageInfo.isGroup) {
            handleLinkDetection({ ...m, ...messageInfo }, dvmsy).catch(() => {});
        }

        // ✅ Vérification préfixe AVANT de charger les infos groupe (plus rapide)
        if (!body || !body.startsWith(config.PREFIX)) return;

        const args = body.slice(config.PREFIX.length).trim().split(/ +/);
        const command = args.shift().toLowerCase();

        // ✅ Charger les infos groupe SEULEMENT si c'est une commande valide
        const userPerms = getUserPermissions(sender, config.OWNERS);
        const groupInfo = await getGroupInfoCached(m, dvmsy);

        const fullMessage = {
            ...m,
            ...messageInfo,
            ...groupInfo,
            ...userPerms,
            command,
            args,
            pushName: pushName || sender.split('@')[0]
        };

        console.log(`📩 Commande: ${command} de ${fullMessage.pushName}`);

        switch (command) {
            case 'ping':
                await ping(fullMessage, dvmsy);
                break;

            case 'menu':
            case 'help':
            case 'aide':
                await menu(fullMessage, dvmsy);
                break;

            case 'info':
            case 'infobot':
                await info(fullMessage, dvmsy);
                break;

            case 'runtime':
            case 'uptime':
                const uptime = process.uptime();
                const hours = Math.floor(uptime / 3600);
                const minutes = Math.floor((uptime % 3600) / 60);
                const seconds = Math.floor(uptime % 60);
                await dvmsy.sendMessage(m.key.remoteJid, { text: `⏰ *Runtime:* ${hours}h ${minutes}m ${seconds}s` });
                break;

            case 'owner':
            case 'restart':
            case 'shutdown':
            case 'broadcast':
            case 'eval':
                await owner(fullMessage, dvmsy, command, args);
                break;

            case 'tagall':
            case 'hidetag':
            case 'link':
            case 'groupinfo':
                await group(fullMessage, dvmsy, command, args);
                break;

            case 'kick':
                await kickCommand(fullMessage, dvmsy);
                break;

            case 'mute':
                await muteCommand(fullMessage, dvmsy);
                break;

            case 'unmute':
                await unmuteCommand(fullMessage, dvmsy);
                break;

            case 'demote':
                await demoteCommand(fullMessage, dvmsy);
                break;

            case 'promote':
                await promoteCommand(fullMessage, dvmsy);
                break;

            case 'welcome':
                await welcomeCommand(fullMessage, dvmsy);
                // Invalider le cache après modification
                groupCache.delete(m.key.remoteJid);
                break;

            case 'goodbye':
                await goodbyeCommand(fullMessage, dvmsy);
                break;

            case 'antilink':
                await handleAntilinkCommand(fullMessage, dvmsy);
                break;

            default:
                console.log(`Commande inconnue: ${command}`);
        }
    } catch (error) {
        console.error('Erreur dans handlerCommand:', error);
    }
}
