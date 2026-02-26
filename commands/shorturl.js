const fetch = require('node-fetch');

async function shorturlCommand(sock, chatId, message, type, url) {
    if (!url) {
        return await sock.sendMessage(chatId, { text: `❌ Please provide a URL to shorten. Usage: .${type} <url>` }, { quoted: message });
    }

    try {
        let apiUrl = '';
        if (type === 'bitly') {
            apiUrl = `https://api.shizo.top/tools/bitlyshort?apikey=shizo&url=${encodeURIComponent(url)}`;
        } else {
            apiUrl = `https://api.shizo.top/tools/tinyshort?apikey=shizo&url=${encodeURIComponent(url)}`;
        }

        const response = await fetch(apiUrl);
        const json = await response.json();

        if (json.data && json.data.status) {
            await sock.sendMessage(chatId, { text: `✅ *Success!*\n\n🔗 *Original:* ${url}\n✂️ *Shortened:* ${json.data.result}` }, { quoted: message });
        } else {
            await sock.sendMessage(chatId, { text: '❌ Failed to shorten URL. Please check the URL and try again.' }, { quoted: message });
        }
    } catch (error) {
        console.error(`Error in ${type} command:`, error);
        await sock.sendMessage(chatId, { text: '❌ An error occurred while shortening the URL.' }, { quoted: message });
    }
}

module.exports = shorturlCommand;
