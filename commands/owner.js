// commands/owner.js
import config from '../config.js';

export default async function owner(m, dvmsy, command, args) {
    // Vérifier si l'utilisateur est owner
    const isOwner = config.OWNERS.includes(m.sender);
    
    if (!isOwner) {
        return dvmsy.sendMessage(m.key.remoteJid, { 
            text: '❌ *Seul le propriétaire peut utiliser cette commande !*' 
        });
    }
    
    switch(command) {
        case 'restart':
            await dvmsy.sendMessage(m.key.remoteJid, { 
                text: '🔄 *Redémarrage du bot...*' 
            });
            process.exit(1); // Le gestionnaire de processus redémarrera
            break;
            
        case 'shutdown':
            await dvmsy.sendMessage(m.key.remoteJid, { 
                text: '🔴 *Arrêt du bot...*' 
            });
            process.exit(0);
            break;
            
        case 'broadcast':
            if (!args.length) {
                return dvmsy.sendMessage(m.key.remoteJid, { 
                    text: '❌ *Usage:* 👾broadcast [message]' 
                });
            }
            
            const message = args.join(' ');
            await dvmsy.sendMessage(m.key.remoteJid, { 
                text: `📢 *BROADCAST*\n\n${message}` 
            });
            break;
            
        case 'eval':
            try {
                const result = eval(args.join(' '));
                await dvmsy.sendMessage(m.key.remoteJid, { 
                    text: `✅ *Résultat:*\n\`\`\`${JSON.stringify(result, null, 2)}\`\`\`` 
                });
            } catch (error) {
                await dvmsy.sendMessage(m.key.remoteJid, { 
                    text: `❌ *Erreur:*\n\`\`\`${error.message}\`\`\`` 
                });
            }
            break;
            
        default:
            await dvmsy.sendMessage(m.key.remoteJid, { 
                text: `👑 *Commandes Owner:*\n\n` +
                      `• 👾restart - Redémarrer\n` +
                      `• 👾shutdown - Éteindre\n` +
                      `• 👾broadcast [message] - Message à tous\n` +
                      `• 👾eval [code] - Exécuter du code`
            });
    }
}