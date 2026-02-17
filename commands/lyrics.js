const fetch = require('node-fetch');

async function lyricsCommand(sock, chatId, songTitle, message) {
    if (!songTitle) {
        await sock.sendMessage(chatId, { 
            text: '🔍 Please enter the song name to get the lyrics! Usage: *lyrics <song name>*'
        },{ quoted: message });
        return;
    }

    try {
        // Check if Genius API key is configured
        const geniusKey = process.env.GENIUS_API_KEY;
        
        if (!geniusKey || geniusKey === 'your_genius_api_key') {
            await sock.sendMessage(chatId, { 
                text: '⚠️ Lyrics feature is not configured.\n\n*To enable:*\n1. Get free API key: https://genius.com/api-clients\n2. Add to .env: GENIUS_API_KEY=your_key\n3. Restart bot\n\nAlternatively, search manually on Genius.com'
            },{ quoted: message });
            return;
        }

        // Use Genius API to search for lyrics
        const searchUrl = `https://api.genius.com/search?q=${encodeURIComponent(songTitle)}&access_token=${geniusKey}`;
        const searchRes = await fetch(searchUrl);
        
        if (!searchRes.ok) {
            throw new Error(`Genius API error: ${searchRes.status}`);
        }
        
        const searchData = await searchRes.json();
        
        if (!searchData.response || !searchData.response.hits || searchData.response.hits.length === 0) {
            await sock.sendMessage(chatId, {
                text: `❌ Sorry, I couldn't find "${songTitle}" on Genius.\n\nTry:\n• Different spelling\n• Artist name (e.g., "Song Name - Artist")\n• Searching on genius.com`
            },{ quoted: message });
            return;
        }

        const hit = searchData.response.hits[0];
        const song = hit.result;
        const songUrl = song.url;

        // Send song info card
        const info = `🎵 *${song.title}*\n` +
                     (song.primary_artist ? `👤 ${song.primary_artist.name}\n` : '') +
                     `🔗 View on Genius`;
        
        await sock.sendMessage(chatId, {
            text: info + '\n\n_Lyrics available at the link above_\n\nNote: Full lyrics require viewing on Genius.com to respect copyright.'
        }, { quoted: message });

    } catch (error) {
        console.error('Error in lyrics command:', error);
        await sock.sendMessage(chatId, { 
            text: `❌ An error occurred while searching for "${songTitle}".\n\nTry again in a moment or search on genius.com`
        },{ quoted: message });
    }
}

module.exports = { lyricsCommand };
