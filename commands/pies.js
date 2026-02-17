const fetch = require('node-fetch');

// Using meme-api.com which provides random memes from Reddit
// This is a working alternative to the dead shizo.top API
const BASE = 'https://meme-api.com/gimme';
const VALID_COUNTRIES = ['india','malaysia', 'thailand', 'china', 'indonesia', 'japan', 'korea', 'vietnam'];

async function fetchPiesImageBuffer(country) {
	// Fetch from meme-api.com (returns random meme with image URL)
	const url = `${BASE}`;
	const res = await fetch(url);
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	const data = await res.json();
	
	// Extract image URL from meme API response
	if (!data.url) throw new Error('No image URL in response');
	
	// Fetch the actual image
	const imageRes = await fetch(data.url);
	if (!imageRes.ok) throw new Error(`Failed to fetch image: HTTP ${imageRes.status}`);
	const contentType = imageRes.headers.get('content-type') || '';
	if (!contentType.includes('image')) throw new Error('Response is not an image');
	return imageRes.buffer();
}

async function piesCommand(sock, chatId, message, args) {
	const sub = (args && args[0] ? args[0] : '').toLowerCase();
	if (!sub) {
		await sock.sendMessage(chatId, { text: `Usage: .pies <country>\nCountries: ${VALID_COUNTRIES.join(', ')}` }, { quoted: message });
		return;
	}
	if (!VALID_COUNTRIES.includes(sub)) {
		await sock.sendMessage(chatId, { text: `❌ Unsupported country: ${sub}. Try one of: ${VALID_COUNTRIES.join(', ')}` }, { quoted: message });
		return;
	}
	try {
		const imageBuffer = await fetchPiesImageBuffer(sub);
		await sock.sendMessage(
			chatId,
			{ image: imageBuffer, caption: `pies: ${sub}` },
			{ quoted: message }
		);
	} catch (err) {
		console.error('Error in pies command:', err);
		await sock.sendMessage(chatId, { text: '❌ Failed to fetch image. Please try again.' }, { quoted: message });
	}
}

async function piesAlias(sock, chatId, message, country) {
	try {
		const imageBuffer = await fetchPiesImageBuffer(country);
		await sock.sendMessage(
			chatId,
			{ image: imageBuffer, caption: `pies: ${country}` },
			{ quoted: message }
		);
	} catch (err) {
		console.error(`Error in pies alias (${country}) command:`, err);
		await sock.sendMessage(chatId, { text: '❌ Failed to fetch image. Please try again.' }, { quoted: message });
	}
}

module.exports = { piesCommand, piesAlias, VALID_COUNTRIES };
