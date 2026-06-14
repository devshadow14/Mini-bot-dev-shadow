// commands/antilink.js
// Stockage en mémoire des configurations antilink par groupe
const antilinkStore = {};

// ─── Helpers de stockage ─────────────────────────────────────────────────────
function setAntilink(chatId, action = 'delete') {
    antilinkStore[chatId] = { enabled: true, action };
    return true;
}

function getAntilink(chatId) {
    return antilinkStore[chatId] || null;
}

function removeAntilink(chatId) {
    delete antilinkStore[chatId];
    return true;
}

// ─── Patterns de liens ────────────────────────────────────────────────────────
const linkPatterns = {
    whatsappGroup: /chat\.whatsapp\.com\/[A-Za-z0-9]{20,}/i,
    whatsappChannel: /wa\.me\/channel\/[A-Za-z0-9]{20,}/i,
    telegram: /t\.me\/[A-Za-z0-9_]+/i,
    allLinks: /https?:\/\/\S+|www\.\S+|(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/\S*)?/i,
};

// ─── COMMANDE ANTILINK ────────────────────────────────────────────────────────
export async function handleAntilinkCommand(m, dvmsy) {
    const prefix = global.config?.PREFIX || '👾';
    const chatId = m.key.remoteJid;

    // Vérification groupe
    if (!m.isGroup) {
        return dvmsy.sendMessage(chatId, {
            text: '❌ *Cette commande est uniquement disponible en groupe !*'
        }, { quoted: m });
    }

    // Vérification admin
    if (!m.isGroupAdmin && !m.isOwner) {
        return dvmsy.sendMessage(chatId, {
            text: '❌ *Seuls les administrateurs peuvent utiliser cette commande !*'
        }, { quoted: m });
    }

    const args = m.args || [];
    const action = args[0]?.toLowerCase();

    // Afficher l'aide si pas d'argument
    if (!action) {
        return dvmsy.sendMessage(chatId, {
            text: `╭───────────────⭓
│ *🛡️ ANTILINK SETUP*
├───────────────
│
│ *Activer:*
│ ${prefix}antilink on
│
│ *Définir l'action:*
│ ${prefix}antilink set delete
│ ${prefix}antilink set kick
│ ${prefix}antilink set warn
│
│ *Statut:*
│ ${prefix}antilink status
│
│ *Désactiver:*
│ ${prefix}antilink off
│
╰───────────────⭓`
        }, { quoted: m });
    }

    switch (action) {

        case 'on': {
            const existing = getAntilink(chatId);
            if (existing?.enabled) {
                return dvmsy.sendMessage(chatId, {
                    text: '⚠️ *L\'antilink est déjà activé !*'
                }, { quoted: m });
            }
            setAntilink(chatId, 'delete');
            await dvmsy.sendMessage(chatId, {
                text: '✅ *Antilink activé !*\n\n🗑️ Action par défaut : *suppression*\nUtilisez `' + prefix + 'antilink set` pour changer l\'action.'
            }, { quoted: m });
            break;
        }

        case 'off': {
            removeAntilink(chatId);
            await dvmsy.sendMessage(chatId, {
                text: '🔴 *Antilink désactivé !*'
            }, { quoted: m });
            break;
        }

        case 'set': {
            const setAction = args[1]?.toLowerCase();
            if (!setAction || !['delete', 'kick', 'warn'].includes(setAction)) {
                return dvmsy.sendMessage(chatId, {
                    text: `❌ *Action invalide !*\n\nChoisissez : *delete*, *kick* ou *warn*\n\nEx: ${prefix}antilink set delete`
                }, { quoted: m });
            }

            const existing = getAntilink(chatId);
            if (!existing?.enabled) {
                return dvmsy.sendMessage(chatId, {
                    text: `⚠️ *Activez d'abord l'antilink !*\n\nEx: ${prefix}antilink on`
                }, { quoted: m });
            }

            setAntilink(chatId, setAction);

            const actionLabels = {
                delete: '🗑️ Suppression du message',
                kick: '👢 Expulsion du membre',
                warn: '⚠️ Avertissement'
            };

            await dvmsy.sendMessage(chatId, {
                text: `✅ *Action antilink définie sur : ${actionLabels[setAction]}*`
            }, { quoted: m });
            break;
        }

        case 'status': {
            const config = getAntilink(chatId);
            const actionLabels = {
                delete: '🗑️ Suppression',
                kick: '👢 Expulsion',
                warn: '⚠️ Avertissement'
            };
            await dvmsy.sendMessage(chatId, {
                text: `╭───────────────⭓
│ *🛡️ STATUT ANTILINK*
├───────────────
│ Status: ${config?.enabled ? '✅ Activé' : '🔴 Désactivé'}
│ Action: ${config ? actionLabels[config.action] || config.action : 'Non définie'}
╰───────────────⭓`
            }, { quoted: m });
            break;
        }

        default:
            await dvmsy.sendMessage(chatId, {
                text: `❌ *Option inconnue !*\n\nUtilisez ${prefix}antilink pour voir l'aide.`
            }, { quoted: m });
    }
}

// ─── DÉTECTION DE LIENS ───────────────────────────────────────────────────────
export async function handleLinkDetection(m, dvmsy) {
    const chatId = m.key.remoteJid;
    if (!chatId?.endsWith('@g.us')) return;

    const config = getAntilink(chatId);
    if (!config?.enabled) return;

    const userMessage = m.body || '';
    const senderId = m.sender;

    // Ignorer les admins et owners
    if (m.isGroupAdmin || m.isOwner) return;

    // Vérifier si le message contient un lien
    const hasLink = linkPatterns.allLinks.test(userMessage);
    if (!hasLink) return;

    console.log(`🔗 Lien détecté de ${senderId} dans ${chatId} - Action: ${config.action}`);

    switch (config.action) {

        case 'delete': {
            // Supprimer le message
            try {
                await dvmsy.sendMessage(chatId, {
                    delete: {
                        remoteJid: chatId,
                        fromMe: false,
                        id: m.key.id,
                        participant: senderId
                    }
                });
            } catch (e) {
                console.error('Erreur suppression:', e);
            }
            await dvmsy.sendMessage(chatId, {
                text: `⚠️ @${senderId.split('@')[0]}, les liens sont interdits dans ce groupe !`,
                mentions: [senderId]
            });
            break;
        }

        case 'kick': {
            // Supprimer le message puis expulser
            try {
                await dvmsy.sendMessage(chatId, {
                    delete: {
                        remoteJid: chatId,
                        fromMe: false,
                        id: m.key.id,
                        participant: senderId
                    }
                });
            } catch (e) {
                console.error('Erreur suppression:', e);
            }
            await dvmsy.sendMessage(chatId, {
                text: `👢 @${senderId.split('@')[0]} a été expulsé pour avoir envoyé un lien !`,
                mentions: [senderId]
            });
            await dvmsy.groupParticipantsUpdate(chatId, [senderId], 'remove');
            break;
        }

        case 'warn': {
            // Juste avertir
            await dvmsy.sendMessage(chatId, {
                text: `⚠️ *Avertissement !*\n\n@${senderId.split('@')[0]}, les liens sont interdits dans ce groupe !`,
                mentions: [senderId]
            });
            break;
        }
    }
}
