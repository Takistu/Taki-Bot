const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execPromise = promisify(exec);

async function memeCommand(sock, chatId, message, query = '') {
    try {
        let apiUrl;
        let captionSuffix = '';

        if (query) {
            apiUrl = `https://api.shizo.top/tools/meme-search?apikey=shizo&query=${encodeURIComponent(query)}`;
            captionSuffix = `for "${query}"! 🎭`;
        } else {
            apiUrl = 'https://shizoapi.onrender.com/api/memes/cheems?apikey=shizo';
            captionSuffix = '! 🐕';
        }

        const response = await fetch(apiUrl);
        const contentType = response.headers.get('content-type');
        let buffer = await response.buffer();

        // Use file-type if available or fallback to content-type header
        let mime = contentType || '';
        try {
            const FileType = require('file-type');
            const type = await FileType.fromBuffer(buffer);
            if (type) mime = type.mime;
        } catch (e) {
            console.error('FileType detection failed:', e.message);
        }

        const buttons = [
            { buttonId: '.meme', buttonText: { displayText: '🎭 Another Meme' }, type: 1 },
            { buttonId: '.joke', buttonText: { displayText: '😄 Joke' }, type: 1 }
        ];

        const caption = `> Here's your meme ${captionSuffix}`;

        // If it's a GIF, convert to MP4 for WhatsApp compatibility
        if (mime.includes('gif')) {
            const tmpDir = path.join(process.cwd(), 'tmp');
            if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

            const inputPath = path.join(tmpDir, `meme_${Date.now()}.gif`);
            const outputPath = path.join(tmpDir, `meme_${Date.now()}.mp4`);

            fs.writeFileSync(inputPath, buffer);

            try {
                // Convert GIF to MP4 using FFmpeg
                await execPromise(`ffmpeg -i "${inputPath}" -movflags faststart -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" "${outputPath}"`);
                buffer = fs.readFileSync(outputPath);
                mime = 'video/mp4';

                // Cleanup
                if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
            } catch (err) {
                console.error('FFmpeg conversion failed:', err);
                // Fallback to sending as image if conversion fails
                mime = 'image/gif';
            }
        }

        if (mime.includes('video') || mime.includes('mp4')) {
            await sock.sendMessage(chatId, {
                video: buffer,
                caption: caption,
                gifPlayback: true,
                buttons: buttons,
                headerType: 1
            }, { quoted: message });
        } else if (mime.includes('webp')) {
            await sock.sendMessage(chatId, {
                sticker: buffer
            }, { quoted: message });
        } else if (mime.includes('image')) {
            await sock.sendMessage(chatId, {
                image: buffer,
                caption: caption,
                buttons: buttons,
                headerType: 1
            }, { quoted: message });
        } else {
            if (query) {
                await sock.sendMessage(chatId, {
                    text: `❌ No memes found for "${query}". Try a different search term!`
                }, { quoted: message });
            } else {
                throw new Error('Invalid response type from API: ' + mime);
            }
        }
    } catch (error) {
        console.error('Error in meme command:', error);
        await sock.sendMessage(chatId, {
            text: '❌ Failed to fetch meme. Please try again later.'
        }, { quoted: message });
    }
}

module.exports = memeCommand;
