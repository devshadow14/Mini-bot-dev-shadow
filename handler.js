// handler.js
import config from './config.js';
import ping from './commands/ping.js';
import menu from './commands/menu.js';
import info from './commands/info.js';
import owner from './commands/owner.js';
import group from './commands/group.js';
import admin from './commands/admin.js';
import { handleAntilinkCommand, handleLinkDetection } from './commands/antilink.js'; // 🆕
import { getMessageInfo, getGroupInfo, getUserPermissions } from './Utils/messageUtils.js';

// Rendre config accessible globalement
global.config = config;

export default async function handlerCommand(dvmsy, m, msg, chatUpdate, options) {
    try {
        if (!m) {
            console.error('Message m is undefined');
            return;
        }

        // Récupérer les infos du message
        const messageInfo = getMessageInfo(m, dvmsy);
        const { body, sender, pushName } = messageInfo;

        // Récupérer les infos supplémentaires
        const groupInfo = await getGroupInfo(m, dvmsy);
        const userPerms = getUserPermissions(sender, config.OWNERS);

        // Combiner toutes les infos
        const fullMessage = {
            ...m,
            ...messageInfo,
            ...groupInfo,
            ...userPerms,
            pushName: pushName || sender.split('@')[0]
        };

        // 🆕 Détection automatique des liens (avant la vérification du préfixe)
        await handleLinkDetection(fullMessage, dvmsy);

        // Vérification préfixe
        if (!body || !body.startsWith(config.PREFIX)) return;

        const args = body.slice(config.PREFIX.length).trim().split(/ +/);
        const command = args.shift().toLowerCase();

        // Ajouter command et args au message
        fullMessage.command = command;
        fullMessage.args = args;

        // Console log pour debug
        console.log(`📩 Commande: ${command} de ${fullMessage.pushName}`);

        // Handler des commandes
        switch (command) {

            // Commandes générales
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
                await dvmsy.sendMessage(m.key.remoteJid, {
                    text: `⏰ *Runtime:* ${hours}h ${minutes}m ${seconds}s`
                });
                break;

            // Commandes owner
            case 'owner':
            case 'restart':
            case 'shutdown':
            case 'broadcast':
            case 'eval':
                await owner(fullMessage, dvmsy, command, args);
                break;

            // Commandes groupe
            case 'tagall':
            case 'hidetag':
            case 'link':
            case 'groupinfo':
                await group(fullMessage, dvmsy, command, args);
                break;

            // Commandes admin
            case 'kick':
            case 'kickall':
            case 'mute':
            case 'unmute':
            case 'promote':
            case 'demote':
            case 'vv':
                await admin(fullMessage, dvmsy, command, args);
                break;

            // 🆕 Antilink
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
