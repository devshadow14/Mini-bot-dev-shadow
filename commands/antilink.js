// commands/antilink.js
// Stockage en mémoire (remplace lib/index.js et lib/antilink.js)
const antilinkStore = {};

function setAntilink(chatId, status, action) {
    antilinkStore[chatId] = { enabled: status === 'on', action };
    return true;
}

function getAntilink(chatId) {
    return antilinkStore[chatId] || null;
}

function removeAntilink(chatId) {
    delete antilinkStore[chatId];
    return true;
}

export async function handleAntilinkCommand(m, dvmsy) {
    const sock = dvmsy;
    const chatId = m.key.remoteJid;
    const userMessage = m.body || '';
    const senderId = m.sender;
    const isSenderAdmin = m.isGroupAdmin || m.isOwner;
    const message = m;

    try {
        if (!isSenderAdmin) {
            await sock.sendMessage(chatId, { text: '```For Group Admins Only!```' }, { quoted: message });
            return;
        }

        const prefix = global.config?.PREFIX || '👾';
        const args = m.args || [];
        const action = args[0]?.toLowerCase();

        if (!action) {
            const usage = `\`\`\`ANTILINK SETUP\n\n${prefix}antilink on\n${prefix}antilink set delete | kick | warn\n${prefix}antilink off\n\`\`\``;
            await sock.sendMessage(chatId, { text: usage }, { quoted: message });
            return;
        }

        switch (action) {
            case 'on':
                const existingConfig = getAntilink(chatId);
                if (existingConfig?.enabled) {
                    await sock.sendMessage(chatId, { text: '*_Antilink is already on_*' }, { quoted: message });
                    return;
                }
                const result = setAntilink(chatId, 'on', 'delete');
                await sock.sendMessage(chatId, {
                    text: result ? '*_Antilink has been turned ON_*' : '*_Failed to turn on Antilink_*'
                }, { quoted: message });
                break;

            case 'off':
                removeAntilink(chatId);
                await sock.sendMessage(chatId, { text: '*_Antilink has been turned OFF_*' }, { quoted: message });
                break;

            case 'set':
                if (args.length < 2) {
                    await sock.sendMessage(chatId, {
                        text: `*_Please specify an action: ${prefix}antilink set delete | kick | warn_*`
                    }, { quoted: message });
                    return;
                }
                const setAction = args[1]?.toLowerCase();
                if (!['delete', 'kick', 'warn'].includes(setAction)) {
                    await sock.sendMessage(chatId, {
                        text: '*_Invalid action. Choose delete, kick, or warn._*'
                    }, { quoted: message });
                    return;
                }
                const setResult = setAntilink(chatId, 'on', setAction);
                await sock.sendMessage(chatId, {
                    text: setResult ? `*_Antilink action set to ${setAction}_*` : '*_Failed to set Antilink action_*'
                }, { quoted: message });
                break;

            case 'get':
                const status = getAntilink(chatId);
                await sock.sendMessage(chatId, {
                    text: `*_Antilink Configuration:_*\nStatus: ${status?.enabled ? 'ON' : 'OFF'}\nAction: ${status ? status.action : 'Not set'}`
                }, { quoted: message });
                break;

            default:
                await sock.sendMessage(chatId, { text: `*_Use ${global.config?.PREFIX || '👾'}antilink for usage._*` }, { quoted: message });
        }
    } catch (error) {
        console.error('Error in antilink command:', error);
        await sock.sendMessage(chatId, { text: '*_Error processing antilink command_*' }, { quoted: message });
    }
}

export async function handleLinkDetection(m, dvmsy) {
    const sock = dvmsy;
    const chatId = m.key.remoteJid;
    if (!chatId?.endsWith('@g.us')) return;

    const antilinkSetting = getAntilink(chatId);
    if (!antilinkSetting?.enabled) return;

    // Ignorer les admins et owners
    if (m.isGroupAdmin || m.isOwner) return;

    const userMessage = m.body || '';
    const senderId = m.sender;
    const message = m;

    const linkPatterns = {
        whatsappGroup: /chat\.whatsapp\.com\/[A-Za-z0-9]{20,}/i,
        whatsappChannel: /wa\.me\/channel\/[A-Za-z0-9]{20,}/i,
        telegram: /t\.me\/[A-Za-z0-9_]+/i,
        allLinks: /https?:\/\/\S+|www\.\S+|(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/\S*)?/i,
    };

    let shouldDelete = false;
    const action = antilinkSetting.action;

    if (action === 'whatsappGroup' && linkPatterns.whatsappGroup.test(userMessage)) {
        shouldDelete = true;
    } else if (action === 'whatsappChannel' && linkPatterns.whatsappChannel.test(userMessage)) {
        shouldDelete = true;
    } else if (action === 'telegram' && linkPatterns.telegram.test(userMessage)) {
        shouldDelete = true;
    } else if (['delete', 'kick', 'warn'].includes(action) && linkPatterns.allLinks.test(userMessage)) {
        shouldDelete = true;
    }

    if (shouldDelete) {
        const quotedMessageId = message.key.id;
        const quotedParticipant = message.key.participant || senderId;

        try {
            await sock.sendMessage(chatId, {
                delete: { remoteJid: chatId, fromMe: false, id: quotedMessageId, participant: quotedParticipant },
            });
        } catch (error) {
            console.error('Failed to delete message:', error);
        }

        if (action === 'kick') {
            await sock.sendMessage(chatId, {
                text: `👢 @${senderId.split('@')[0]} a été expulsé pour avoir envoyé un lien !`,
                mentions: [senderId]
            });
            await sock.groupParticipantsUpdate(chatId, [senderId], 'remove');
        } else {
            const mentionedJidList = [senderId];
            await sock.sendMessage(chatId, {
                text: `Warning! @${senderId.split('@')[0]}, posting links is not allowed.`,
                mentions: mentionedJidList
            });
        }
    }
}
