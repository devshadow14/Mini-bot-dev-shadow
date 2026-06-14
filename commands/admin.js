// commands/admin.js

export default async function admin(m, dvmsy, command, args) {
    // Vérification groupe
    if (!m.isGroup) {
        return dvmsy.sendMessage(m.key.remoteJid, {
            text: '❌ *Cette commande est uniquement disponible en groupe !*'
        }, { quoted: m });
    }

    const groupMetadata = await dvmsy.groupMetadata(m.key.remoteJid);
    const participants = groupMetadata.participants;
    const botId = dvmsy.user.id.split(':')[0] + '@s.whatsapp.net';

    // Vérifier si le bot est admin
    const botParticipant = participants.find(p => p.id === botId);
    const isBotAdmin = botParticipant?.admin === 'admin' || botParticipant?.admin === 'superadmin';

    if (!isBotAdmin) {
        return dvmsy.sendMessage(m.key.remoteJid, {
            text: '❌ *Le bot doit être administrateur pour utiliser cette commande !*'
        }, { quoted: m });
    }

    // Vérifier si l'utilisateur est admin du groupe
    const senderParticipant = participants.find(p => p.id === m.sender);
    const isSenderAdmin = senderParticipant?.admin === 'admin' || senderParticipant?.admin === 'superadmin';

    // Commandes qui nécessitent d'être admin ou owner
    const adminCommands = ['kick', 'kickall', 'mute', 'unmute', 'promote', 'demote'];
    if (adminCommands.includes(command) && !isSenderAdmin && !m.isOwner) {
        return dvmsy.sendMessage(m.key.remoteJid, {
            text: '❌ *Vous devez être administrateur pour utiliser cette commande !*'
        }, { quoted: m });
    }

    switch (command) {

        // ─── KICK ───────────────────────────────────────────
        case 'kick': {
            // Récupérer la cible via le message cité
            const quoted = m.msg?.contextInfo?.quotedMessage;
            const target = m.msg?.contextInfo?.participant;

            if (!quoted || !target) {
                return dvmsy.sendMessage(m.key.remoteJid, {
                    text: `❌ *Répondez au message de la personne à expulser !*\n\n*Usage:* Répondez à un message + ${global.config?.PREFIX || '👾'}kick`
                }, { quoted: m });
            }

            // Vérifier qu'on n'expulse pas un admin ou l'owner
            const targetParticipant = participants.find(p => p.id === target);
            if (targetParticipant?.admin) {
                return dvmsy.sendMessage(m.key.remoteJid, {
                    text: '❌ *Impossible d\'expulser un administrateur !*'
                }, { quoted: m });
            }

            if (target === botId) {
                return dvmsy.sendMessage(m.key.remoteJid, {
                    text: '❌ *Je ne peux pas m\'expulser moi-même !*'
                }, { quoted: m });
            }

            await dvmsy.sendMessage(m.key.remoteJid, {
                text: `👢 *@${target.split('@')[0]} a été expulsé du groupe !*`,
                mentions: [target]
            });

            await dvmsy.groupParticipantsUpdate(m.key.remoteJid, [target], 'remove');
            break;
        }

        // ─── KICKALL ─────────────────────────────────────────
        case 'kickall': {
            // Récupérer les owners depuis la config
            const ownersList = global.config?.OWNERS || [];

            // Filtrer : garder le bot, les owners et les admins
            const toKick = participants.filter(p => {
                const isBot = p.id === botId;
                const isOwner = ownersList.includes(p.id);
                const isAdmin = p.admin === 'admin' || p.admin === 'superadmin';
                return !isBot && !isOwner && !isAdmin;
            }).map(p => p.id);

            if (toKick.length === 0) {
                return dvmsy.sendMessage(m.key.remoteJid, {
                    text: '⚠️ *Aucun membre à expulser !*'
                }, { quoted: m });
            }

            await dvmsy.sendMessage(m.key.remoteJid, {
                text: `👢 *Expulsion de ${toKick.length} membre(s) en cours...*`
            });

            // Expulser par lots de 5 pour éviter les bans
            for (let i = 0; i < toKick.length; i += 5) {
                const batch = toKick.slice(i, i + 5);
                await dvmsy.groupParticipantsUpdate(m.key.remoteJid, batch, 'remove');
                await new Promise(r => setTimeout(r, 1500));
            }

            await dvmsy.sendMessage(m.key.remoteJid, {
                text: `✅ *${toKick.length} membre(s) expulsé(s) avec succès !*`
            });
            break;
        }

        // ─── MUTE ────────────────────────────────────────────
        case 'mute': {
            await dvmsy.groupSettingUpdate(m.key.remoteJid, 'announcement');
            await dvmsy.sendMessage(m.key.remoteJid, {
                text: '🔇 *Groupe fermé ! Seuls les admins peuvent envoyer des messages.*'
            }, { quoted: m });
            break;
        }

        // ─── UNMUTE ──────────────────────────────────────────
        case 'unmute': {
            await dvmsy.groupSettingUpdate(m.key.remoteJid, 'not_announcement');
            await dvmsy.sendMessage(m.key.remoteJid, {
                text: '🔊 *Groupe ouvert ! Tout le monde peut envoyer des messages.*'
            }, { quoted: m });
            break;
        }

        // ─── PROMOTE ─────────────────────────────────────────
        case 'promote': {
            const quoted = m.msg?.contextInfo?.quotedMessage;
            const target = m.msg?.contextInfo?.participant;

            if (!quoted || !target) {
                return dvmsy.sendMessage(m.key.remoteJid, {
                    text: `❌ *Répondez au message de la personne à promouvoir !*\n\n*Usage:* Répondez à un message + ${global.config?.PREFIX || '👾'}promote`
                }, { quoted: m });
            }

            const targetParticipant = participants.find(p => p.id === target);
            if (targetParticipant?.admin) {
                return dvmsy.sendMessage(m.key.remoteJid, {
                    text: '⚠️ *Cette personne est déjà administrateur !*'
                }, { quoted: m });
            }

            await dvmsy.groupParticipantsUpdate(m.key.remoteJid, [target], 'promote');
            await dvmsy.sendMessage(m.key.remoteJid, {
                text: `👑 *@${target.split('@')[0]} est maintenant administrateur !*`,
                mentions: [target]
            });
            break;
        }

        // ─── DEMOTE ──────────────────────────────────────────
        case 'demote': {
            const quoted = m.msg?.contextInfo?.quotedMessage;
            const target = m.msg?.contextInfo?.participant;

            if (!quoted || !target) {
                return dvmsy.sendMessage(m.key.remoteJid, {
                    text: `❌ *Répondez au message de la personne à rétrograder !*\n\n*Usage:* Répondez à un message + ${global.config?.PREFIX || '👾'}demote`
                }, { quoted: m });
            }

            const targetParticipant = participants.find(p => p.id === target);
            if (!targetParticipant?.admin) {
                return dvmsy.sendMessage(m.key.remoteJid, {
                    text: '⚠️ *Cette personne n\'est pas administrateur !*'
                }, { quoted: m });
            }

            await dvmsy.groupParticipantsUpdate(m.key.remoteJid, [target], 'demote');
            await dvmsy.sendMessage(m.key.remoteJid, {
                text: `⬇️ *@${target.split('@')[0]} n'est plus administrateur !*`,
                mentions: [target]
            });
            break;
        }

        // ─── VV (View Once) ──────────────────────────────────
        case 'vv': {
            const quotedMsg = m.msg?.contextInfo?.quotedMessage;
            const quotedSender = m.msg?.contextInfo?.participant;

            if (!quotedMsg) {
                return dvmsy.sendMessage(m.key.remoteJid, {
                    text: `❌ *Répondez à un message view-once !*\n\n*Usage:* Répondez à un message + ${global.config?.PREFIX || '👾'}vv`
                }, { quoted: m });
            }

            // Détecter le type de média view-once
            const viewOnceMsg =
                quotedMsg?.viewOnceMessage?.message ||
                quotedMsg?.viewOnceMessageV2?.message ||
                quotedMsg?.viewOnceMessageV2Extension?.message ||
                null;

            if (!viewOnceMsg) {
                return dvmsy.sendMessage(m.key.remoteJid, {
                    text: '❌ *Ce message n\'est pas un message view-once !*'
                }, { quoted: m });
            }

            const mediaType = Object.keys(viewOnceMsg)[0];
            const mediaContent = viewOnceMsg[mediaType];

            // Supprimer le flag viewOnce pour pouvoir envoyer
            if (mediaContent) {
                mediaContent.viewOnce = false;
            }

            await dvmsy.sendMessage(m.key.remoteJid, {
                forward: {
                    key: {
                        remoteJid: m.key.remoteJid,
                        fromMe: false,
                        id: m.msg.contextInfo.stanzaId,
                        participant: quotedSender
                    },
                    message: viewOnceMsg
                }
            });
            break;
        }
    }
}
