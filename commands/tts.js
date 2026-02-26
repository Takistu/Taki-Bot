const gTTS = require('gtts');
const fs = require('fs');
const path = require('path');
const { translate } = require('@vitalets/google-translate-api');

async function ttsCommand(sock, chatId, text, message) {
    if (!text) {
        await sock.sendMessage(chatId, { text: 'Please provide the text for TTS conversion.' });
        return;
    }

    try {
        // Detect language using Google Translate API
        const detectRes = await translate(text, { to: 'en' }).catch(() => null);
        const detectedLang = detectRes?.raw?.src || 'en';

        console.log(`TTS: Detected language for "${text.slice(0, 20)}...": ${detectedLang}`);

        const fileName = `tts-${Date.now()}.mp3`;
        const tmpDir = path.join(process.cwd(), 'tmp');
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
        const filePath = path.join(tmpDir, fileName);

        const gtts = new gTTS(text, detectedLang);

        gtts.save(filePath, async function (err) {
            if (err) {
                console.error('TTS save error:', err);
                await sock.sendMessage(chatId, { text: 'Error generating TTS audio.' });
                return;
            }

            await sock.sendMessage(chatId, {
                audio: { url: filePath },
                mimetype: 'audio/mpeg',
                ptt: true // Send as voice note
            }, { quoted: message });

            // Small delay before unlinking to ensure upload is complete
            setTimeout(() => {
                try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) { }
            }, 5000);
        });
    } catch (error) {
        console.error('TTS error:', error);
        await sock.sendMessage(chatId, { text: '❌ An error occurred during TTS conversion.' });
    }
}

module.exports = ttsCommand;
