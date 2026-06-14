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
import { getMessageInfo, getGroupInfo, getUserPermissions } from './Utils/messageUtils.js';

global.config = config;

export default async function handlerCommand(dvmsy, m, msg, chatUpdate, options) {
    try {
        if (!m) return;

        const messageInfo = getMessageInfo(m, dvmsy);
        const { body, sender, pushName } = messageInfo;

        // Détection antilink seulement en groupe
        if (messageInfo.isGroup) {
            handleLinkDetection({ ...m, ...messageInfo }, dvmsy).catch(() => {});
        }

        // Vérification préfixe
        if (!body || !body.startsWith(config.PREFIX)) return;

        const args = body.slice(config.PREFIX.length).trim().split(/ +/);
        const command = args.shift().toLowerCase();

        // Charger infos groupe et permissions
        const groupInfo = await getGroupInfo(m, dvmsy);
        const userPerms = getUserPermissions(sender, config.OWNERS);

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
