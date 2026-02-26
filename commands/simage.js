const sharp = require('sharp');
const fs = require('fs');
const fsPromises = require('fs/promises');
const fse = require('fs-extra');
const path = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { webp2mp4File } = require('../lib/uploader');

const tempDir = './temp';
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

const scheduleFileDeletion = (filePath) => {
    setTimeout(async () => {
        try {
            if (fs.existsSync(filePath)) {
                await fse.remove(filePath);
            }
        } catch (error) {
            console.error(`Failed to delete file:`, error);
        }
    }, 15000);
};

const convertStickerToImage = async (sock, quotedMessage, chatId) => {
    try {
        const stickerMessage = quotedMessage.stickerMessage;
        if (!stickerMessage) {
            await sock.sendMessage(chatId, { text: '❌ Please reply to a sticker with .simage to convert it.' });
            return;
        }

        const isAnimated = stickerMessage.isAnimated;
        const stickerFilePath = path.join(tempDir, `sticker_${Date.now()}.webp`);

        // Download sticker
        const stream = await downloadContentFromMessage(stickerMessage, 'sticker');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
        await fsPromises.writeFile(stickerFilePath, buffer);

        if (isAnimated) {
            // Convert animated sticker to MP4 using ezgif tool in uploader.js
            await sock.sendMessage(chatId, { text: '⏳ Converting animated sticker to video...' });

            try {
                const res = await webp2mp4File(stickerFilePath);
                if (res.status && res.result) {
                    await sock.sendMessage(chatId, {
                        video: { url: res.result },
                        caption: '✅ Animated sticker converted to MP4!',
                        gifPlayback: true
                    });
                } else {
                    throw new Error('Conversion failed');
                }
            } catch (err) {
                console.error('EZGIF Conversion error:', err);
                throw new Error('Failed to convert dynamic sticker. The service might be busy.');
            }
        } else {
            // Convert static sticker to PNG
            const outputImagePath = path.join(tempDir, `converted_${Date.now()}.png`);
            await sharp(buffer).toFormat('png').toFile(outputImagePath);
            const imageBuffer = await fsPromises.readFile(outputImagePath);
            await sock.sendMessage(chatId, {
                image: imageBuffer,
                caption: '✅ Sticker converted to PNG!'
            });
            scheduleFileDeletion(outputImagePath);
        }

        scheduleFileDeletion(stickerFilePath);
    } catch (error) {
        console.error('Error converting sticker:', error);
        await sock.sendMessage(chatId, { text: `❌ Error: ${error.message || 'An error occurred while converting the sticker.'}` });
    }
};

module.exports = convertStickerToImage;
