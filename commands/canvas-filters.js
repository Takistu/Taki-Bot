const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const axios = require('axios');
const { uploadImage } = require('../lib/uploadImage');

async function canvasFilterCommand(sock, chatId, message, type, args = []) {
    let targetMessage = message;

    // Check if it's a reply
    if (message.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
        const quoted = message.message.extendedTextMessage.contextInfo;
        targetMessage = {
            key: {
                remoteJid: chatId,
                id: quoted.stanzaId,
                participant: quoted.participant
            },
            message: quoted.quotedMessage
        };
    }

    const imageMessage = targetMessage.message?.imageMessage;

    if (!imageMessage) {
        await sock.sendMessage(chatId, {
            text: `❌ Please reply to an image with .${type} to apply the filter.`
        }, { quoted: message });
        return;
    }

    try {
        // Show wait message
        await sock.sendMessage(chatId, { text: `⏳ Applying ${type} filter...` }, { quoted: message });

        // Download the image
        const buffer = await downloadMediaMessage(targetMessage, 'buffer', {}, {
            logger: undefined,
            reuploadRequest: sock.updateMediaMessage
        });

        if (!buffer) {
            throw new Error('Failed to download image');
        }

        // Upload to get a URL (Some Random API needs a URL)
        const imageUrl = await uploadImage(buffer);

        // Map filter types to API endpoints
        let apiUrl = '';
        const baseUrl = 'https://some-random-api.com/canvas/filter';
        const userArg = args[0] || '';

        switch (type) {
            case 'pixelate':
                apiUrl = `${baseUrl}/pixelate?avatar=${encodeURIComponent(imageUrl)}`;
                break;
            case 'blur':
                apiUrl = `${baseUrl}/blur?avatar=${encodeURIComponent(imageUrl)}`;
                break;
            case 'blurple2':
                apiUrl = `${baseUrl}/blurple2?avatar=${encodeURIComponent(imageUrl)}`;
                break;
            case 'color':
                // The color endpoint expects a hex code without the #
                const hexColor = userArg.replace('#', '') || 'FF0000';
                apiUrl = `${baseUrl}/color?color=${hexColor}&avatar=${encodeURIComponent(imageUrl)}`;
                break;
            case 'greyscale':
            case 'grayscale':
                apiUrl = `${baseUrl}/greyscale?avatar=${encodeURIComponent(imageUrl)}`;
                break;
            case 'sepia':
                apiUrl = `${baseUrl}/sepia?avatar=${encodeURIComponent(imageUrl)}`;
                break;
            case 'threshold':
                const thresholdValue = isNaN(userArg) || userArg === '' ? 75 : userArg;
                apiUrl = `${baseUrl}/threshold?threshold=${thresholdValue}&avatar=${encodeURIComponent(imageUrl)}`;
                break;
            default:
                apiUrl = `${baseUrl}/blur?avatar=${encodeURIComponent(imageUrl)}`;
        }

        const response = await axios.get(apiUrl, { responseType: 'arraybuffer' });

        // Send the filtered image
        await sock.sendMessage(chatId, {
            image: Buffer.from(response.data),
            caption: `✅ *${type.toUpperCase()}* filter applied successfully!${userArg ? ` (Value: ${userArg})` : ''}`
        }, { quoted: message });

    } catch (error) {
        console.error(`Error in ${type} command:`, error);
        await sock.sendMessage(chatId, {
            text: `❌ Failed to apply ${type} filter. Please try again later.`
        }, { quoted: message });
    }
}

module.exports = canvasFilterCommand;
