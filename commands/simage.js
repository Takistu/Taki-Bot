const sharp = require('sharp');
const fs = require('fs');
const fsPromises = require('fs/promises');
const fse = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execPromise = promisify(exec);
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
            await sock.sendMessage(chatId, { text: '⏳ Converting animated sticker to video...' });

            const outputPath = path.join(tempDir, `sticker_${Date.now()}.mp4`);

            try {
                // Method 1: Local FFmpeg (Fast and private)
                // Use a robust command for WebP to MP4
                await execPromise(`ffmpeg -vcodec libwebp -i "${stickerFilePath}" -movflags faststart -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" "${outputPath}"`);

                const videoBuffer = await fsPromises.readFile(outputPath);
                await sock.sendMessage(chatId, {
                    video: videoBuffer,
                    caption: '✅ Animated sticker converted to MP4!',
                    gifPlayback: true
                });

                scheduleFileDeletion(outputPath);
            } catch (localErr) {
                console.error('Local FFmpeg conversion failed, trying EZGIF fallback:', localErr);

                // Method 2: Fallback to EZGIF Cloud API
                try {
                    const res = await webp2mp4File(stickerFilePath);
                    if (res.status && res.result) {
                        await sock.sendMessage(chatId, {
                            video: { url: res.result },
                            caption: '✅ Animated sticker converted to MP4! (Cloud)',
                            gifPlayback: true
                        });
                    } else {
                        throw new Error('Cloud conversion failed');
                    }
                } catch (cloudErr) {
                    console.error('Cloud conversion error:', cloudErr);
                    throw new Error('Failed to convert dynamic sticker. Both local and cloud services failed.');
                }
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
