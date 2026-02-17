const fetch = require('node-fetch');

async function handleSsCommand(sock, chatId, message, match) {
    if (!match) {
        await sock.sendMessage(chatId, {
            text: `*SCREENSHOT TOOL*\n\n*.ss <url>*\n*.ssweb <url>*\n*.screenshot <url>*\n\nTake a screenshot of any website\n\nExample:\n.ss https://google.com\n.ssweb https://google.com\n.screenshot https://google.com`,
            quoted: message
        });
        return;
    }

    try {
        // Show typing indicator
        await sock.presenceSubscribe(chatId);
        await sock.sendPresenceUpdate('composing', chatId);

        // Extract URL from command
        const url = match.trim();
        
        // Validate URL
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            return sock.sendMessage(chatId, {
                text: '❌ Please provide a valid URL starting with http:// or https://',
                quoted: message
            });
        }

        // Get screenshot API token from environment
        const screenshotToken = process.env.SCREENSHOT_API_KEY;

        if (!screenshotToken || screenshotToken === 'your_screenshot_api_key_here') {
            await sock.sendMessage(chatId, {
                text: '⚠️ Screenshot API not configured.\n\n*To enable:*\n1. Get free token: https://screenshotapi.net\n2. Add to .env: SCREENSHOT_API_KEY=your_token\n3. Restart bot'
            }, { quoted: message });
            return;
        }

        // Use screenshotapi.net with correct format
        const apiUrl = `https://shot.screenshotapi.net/v3/screenshot?token=${screenshotToken}&fresh=true&url=${encodeURIComponent(url)}&output=image&file_type=png&wait_for_event=load`;
        
        const response = await fetch(apiUrl, { 
            timeout: 15000,
            headers: { 'accept': 'image/png' }
        });
        
        if (response.ok) {
            const imageBuffer = await response.buffer();
            await sock.sendMessage(chatId, {
                image: imageBuffer,
                caption: `🔍 Screenshot of: ${url.substring(0, 50)}${url.length > 50 ? '...' : ''}`
            }, {
                quoted: message
            });
        } else if (response.status === 401) {
            throw new Error('Invalid screenshot API token');
        } else {
            throw new Error(`Screenshot API returned: ${response.status}`);
        }

    } catch (error) {
        console.error('❌ Error in ss command:', error);
        await sock.sendMessage(chatId, {
            text: '❌ Failed to take screenshot.\n\nPossible reasons:\n• Invalid or expired API token\n• Website is blocking screenshots\n• URL is invalid or site is down\n• API service temporarily unavailable\n\n💡 Try: .ss https://google.com',
            quoted: message
        });
    }
}

module.exports = {
    handleSsCommand
}; 