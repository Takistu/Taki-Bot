const fetch = require('node-fetch');

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
        const buffer = await response.buffer();

        // Use file-type if available or fallback to content-type header
        let mime = contentType;
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

        if (mime.includes('video') || mime.includes('gif')) {
            await sock.sendMessage(chatId, {
                video: buffer,
                caption: caption,
                gifPlayback: mime.includes('gif'),
                buttons: buttons,
                headerType: 1
            }, { quoted: message });
        } else if (mime.includes('webp')) {
            await sock.sendMessage(chatId, {
                sticker: buffer
            }, { quoted: message });
            // For stickers, we might want to send the caption separately if buttons are needed
            // But buttons with stickers are tricky in some WhatsApp versions
        } else if (mime.includes('image')) {
            await sock.sendMessage(chatId, {
                image: buffer,
                caption: caption,
                buttons: buttons,
                headerType: 1
            }, { quoted: message });
        } else {
            // If it's not a recognized media type, it might be a JSON response or error
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
