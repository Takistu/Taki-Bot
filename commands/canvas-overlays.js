const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { UploadFileUgu } = require('../lib/uploader');

async function canvasOverlayCommand(sock, chatId, message, type) {
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
            text: `❌ Please reply to an image with .${type} to apply the overlay.`
        }, { quoted: message });
        return;
    }

    const tmpDir = path.join(process.cwd(), 'tmp');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    const inputPath = path.join(tmpDir, `canvas_ov_${Date.now()}.png`);

    try {
        await sock.sendMessage(chatId, { text: `⏳ Generating ${type} overlay...` }, { quoted: message });

        // Download the image
        const buffer = await downloadMediaMessage(targetMessage, 'buffer', {}, {
            logger: undefined,
            reuploadRequest: sock.updateMediaMessage
        });

        if (!buffer) throw new Error('Failed to download image');

        // Ensure it's PNG for the API
        await sharp(buffer).png().toFile(inputPath);

        // Upload to get a URL via Uguu.se
        const uploadRes = await UploadFileUgu(inputPath);
        const imageUrl = uploadRes.url;

        if (!imageUrl) throw new Error('Failed to upload image to processing server');

        // Map overlay types to API endpoints
        const baseUrl = 'https://api.some-random-api.com/canvas/overlay';
        const apiUrl = `${baseUrl}/${type}?avatar=${encodeURIComponent(imageUrl)}`;

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

        // Send the overlay image
        await sock.sendMessage(chatId, {
            image: Buffer.from(response.data),
            caption: `✅ *${type.toUpperCase()}* overlay applied!`
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
            text: `❌ Error: ${errorMsg || 'Failed to generate overlay'}`
        }, { quoted: message });
    } finally {
        if (fs.existsSync(inputPath)) {
            try { fs.unlinkSync(inputPath); } catch (e) { }
        }
    }
}

module.exports = canvasOverlayCommand;
