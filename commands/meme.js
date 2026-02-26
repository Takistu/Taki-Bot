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

        // Check if response is an image
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('image')) {
            const imageBuffer = await response.buffer();

            const buttons = [
                { buttonId: '.meme', buttonText: { displayText: '🎭 Another Meme' }, type: 1 },
                { buttonId: '.joke', buttonText: { displayText: '😄 Joke' }, type: 1 }
            ];

            await sock.sendMessage(chatId, {
                image: imageBuffer,
                caption: `> Here's your meme ${captionSuffix}`,
                buttons: buttons,
                headerType: 1
            }, { quoted: message });
        } else {
            // If it's not an image, it might be a JSON response with an error or no results
            if (query) {
                await sock.sendMessage(chatId, {
                    text: `❌ No memes found for "${query}". Try a different search term!`
                }, { quoted: message });
            } else {
                throw new Error('Invalid response type from API');
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
