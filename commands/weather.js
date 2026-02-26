const { fetchJson } = require('../lib/myfunc');

module.exports = async function (sock, chatId, message, city) {
    try {
        const json = await fetchJson(`https://api.shizo.top/tools/weather?apikey=shizo&city=${encodeURIComponent(city)}`);

        // Handle both nested and flat response structures
        const data = json.data || json;

        if (data && data.status) {
            const weather = data.weather[0];
            const weatherText = `
🌍 *Weather in ${data.city}, ${data.country}*

🌡️ *Temperature:* ${data.temperature}°C
🌡️ *Feels Like:* ${data.feels_like}°C
☁️ *Condition:* ${weather.main} (${weather.description})
💧 *Humidity:* ${data.humidity}%
🌬️ *Wind:* ${data.wind.speed} m/s
👁️ *Visibility:* ${data.visibility / 1000} km
☁️ *Clouds:* ${data.clouds}%

🌅 *Sunrise:* ${new Date(data.sunrise).toLocaleTimeString()}
🌇 *Sunset:* ${new Date(data.sunset).toLocaleTimeString()}
            `.trim();

            await sock.sendMessage(chatId, { text: weatherText }, { quoted: message });
        } else {
            console.error('Weather API error:', json);
            await sock.sendMessage(chatId, { text: `❌ Could not find weather data for "${city}". Please check the city name.` }, { quoted: message });
        }
    } catch (error) {
        console.error('Error fetching weather:', error);
        await sock.sendMessage(chatId, { text: '❌ Sorry, I could not fetch the weather right now.' }, { quoted: message });
    }
};
