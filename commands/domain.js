const { fetchJson } = require('../lib/myfunc');

async function domainCommand(sock, chatId, message, domain) {
    if (!domain) {
        return await sock.sendMessage(chatId, { text: '❌ Please provide a domain name. Usage: .domaine <domain.com>' }, { quoted: message });
    }

    try {
        const json = await fetchJson(`https://api.shizo.top/tools/domain-check?apikey=shizo&domain=${encodeURIComponent(domain)}`);
        const data = json.data;

        if (data) {
            const availability = data.available ? '✅ Available' : '❌ Not Available';
            let domainText = `
🌐 *Domain Info: ${data.domain}*

🔍 *Status:* ${availability}
📡 *DNS:* ${data.dns || 'N/A'}
            `.trim();

            if (data.whois) {
                domainText += `\n\n📝 *WHOIS Info:*\n🏢 *Registrar:* ${data.whois.registrar || 'N/A'}\n📅 *Created:* ${data.whois.creationDate ? new Date(data.whois.creationDate).toLocaleDateString() : 'N/A'}`;
            }

            await sock.sendMessage(chatId, { text: domainText }, { quoted: message });
        } else {
            console.error('Domain API error:', json);
            await sock.sendMessage(chatId, { text: `❌ Could not fetch information for domain "${domain}".` }, { quoted: message });
        }
    } catch (error) {
        console.error('Error in domain command:', error);
        await sock.sendMessage(chatId, { text: '❌ An error occurred while checking the domain.' }, { quoted: message });
    }
}

module.exports = domainCommand;
