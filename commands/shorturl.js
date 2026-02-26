const { fetchJson } = require('../lib/myfunc');

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

        const json = await fetchJson(apiUrl);

        // Handle both nested and flat response structures
        const status = json.data ? json.data.status : json.status;
        const result = json.data ? json.data.result : json.result;

        if (status) {
            await sock.sendMessage(chatId, { text: `✅ *Success!*\n\n🔗 *Original:* ${url}\n✂️ *Shortened:* ${result}` }, { quoted: message });
        } else {
            console.error(`Shorten API error (${type}):`, json);
            await sock.sendMessage(chatId, { text: '❌ Failed to shorten URL. The service might be down or the URL is invalid.' }, { quoted: message });
        }
    } catch (error) {
        console.error(`Error in ${type} command:`, error);
        await sock.sendMessage(chatId, { text: '❌ An error occurred while shortening the URL.' }, { quoted: message });
    }
}

module.exports = shorturlCommand;
