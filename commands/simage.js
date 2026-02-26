const sharp = require('sharp');
const fs = require('fs');
const fsPromises = require('fs/promises');
const fse = require('fs-extra');
const path = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { toVideo } = require('../lib/converter');

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
    }, 10000);
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
            // Convert animated sticker to MP4
            await sock.sendMessage(chatId, { text: '⏳ Converting animated sticker to video...' });
            const videoBuffer = await toVideo(buffer, 'webp');
            await sock.sendMessage(chatId, {
                video: videoBuffer,
                caption: '✅ Animated sticker converted to MP4!',
                gifPlayback: true
            });
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
        await sock.sendMessage(chatId, { text: '❌ An error occurred while converting the sticker.' });
    }
};

module.exports = convertStickerToImage;
