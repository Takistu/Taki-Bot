const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { UploadFileUgu } = require('../lib/uploader');

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

    const tmpDir = path.join(process.cwd(), 'tmp');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    const inputPath = path.join(tmpDir, `canvas_in_${Date.now()}.png`);

    try {
        await sock.sendMessage(chatId, { text: `⏳ Processing ${type}...` }, { quoted: message });

        // Download the image
        const buffer = await downloadMediaMessage(targetMessage, 'buffer', {}, {
            logger: undefined,
            reuploadRequest: sock.updateMediaMessage
        });

        if (!buffer) throw new Error('Failed to download image');

        // Ensure it's PNG for the API
        await sharp(buffer).png().toFile(inputPath);

        // Upload to get a URL via Uguu.se (as requested/suggested for .url logic)
        const uploadRes = await UploadFileUgu(inputPath);
        const imageUrl = uploadRes.url;

        if (!imageUrl) throw new Error('Failed to upload image to processing server');

        // Map filter types to API endpoints (Note the 'api.' prefix)
        const baseUrl = 'https://api.some-random-api.com/canvas/filter';
        const userArg = args[0] || '';
        let apiUrl = '';

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

        const response = await axios.get(apiUrl, {
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        // Check if the response is actually an image
        const contentType = response.headers['content-type'];
        if (!contentType || !contentType.includes('image')) {
            let errorMsg = 'Unknown API error';
            try {
                errorMsg = Buffer.from(response.data).toString();
            } catch (e) { }
            console.error('API Error Response:', errorMsg);
            throw new Error(`API error: ${errorMsg}`);
        }

        // Send the filtered image
        await sock.sendMessage(chatId, {
            image: Buffer.from(response.data),
            caption: `✅ *${type.toUpperCase()}* applied!`
        }, { quoted: message });

    } catch (error) {
        console.error(`Error in ${type} command:`, error);
        let errorMsg = error.message;
        if (error.response?.data) {
            try {
                const dataStr = Buffer.from(error.response.data).toString();
                errorMsg += ` - ${dataStr}`;
            } catch (e) { }
        }
        await sock.sendMessage(chatId, {
            text: `❌ Error: ${errorMsg || 'Failed to apply filter'}`
        }, { quoted: message });
    } finally {
        if (fs.existsSync(inputPath)) {
            try { fs.unlinkSync(inputPath); } catch (e) { }
        }
    }
}

module.exports = canvasFilterCommand;
