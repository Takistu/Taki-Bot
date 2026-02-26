require('dotenv').config();
const { proto } = require('@whiskeysockets/baileys');

const BufferJSON = {
    replacer: (k, value) => {
        if (Buffer.isBuffer(value) || value instanceof Uint8Array || value?.type === 'Buffer') {
            return { type: 'Buffer', data: Buffer.from(value?.data || value).toString('base64') };
        }
        return value;
    },
    reviver: (_, value) => {
        if (typeof value === 'object' && !!value && (value.buffer === true || value.type === 'Buffer')) {
            const val = value.data || value.value;
            return typeof val === 'string' ? Buffer.from(val, 'base64') : Buffer.from(val || []);
        }
        return value;
    }
};

module.exports = async (collection) => {
    const { initAuthCreds } = require('@whiskeysockets/baileys');

    const writeData = async (data, id) => {
        try {
            const informationToStore = JSON.parse(JSON.stringify(data, BufferJSON.replacer));
            await collection.updateOne({ _id: id }, { $set: { data: informationToStore } }, { upsert: true });
        } catch (error) {
            console.error(`Error saving ${id} to MongoDB:`, error);
        }
    };

    const readData = async (id) => {
        try {
            const document = await collection.findOne({ _id: id });
            if (document && document.data) {
                const parsedData = JSON.parse(JSON.stringify(document.data), BufferJSON.reviver);
                return parsedData;
            }
            return null;
        } catch (error) {
            console.error(`Error reading ${id} from MongoDB:`, error);
            return null;
        }
    };

    const removeData = async (id) => {
        try {
            await collection.deleteOne({ _id: id });
        } catch (error) {
            console.error(`Error deleting ${id} from MongoDB:`, error);
        }
    };

    let creds = await readData('creds');
    if (!creds) {
        creds = initAuthCreds();
    }

    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const data = {};
                    await Promise.all(
                        ids.map(async (id) => {
                            let value = await readData(`${type}-${id}`);
                            if (type === 'app-state-sync-key' && value) {
                                value = proto.Message.AppStateSyncKeyData.fromObject(value);
                            }
                            data[id] = value;
                        })
                    );
                    return data;
                },
                set: async (data) => {
                    const tasks = [];
                    for (const category in data) {
                        for (const id in data[category]) {
                            const value = data[category][id];
                            const key = `${category}-${id}`;
                            tasks.push(value ? writeData(value, key) : removeData(key));
                        }
                    }
                    await Promise.all(tasks);
                }
            }
        },
        saveCreds: () => {
            return writeData(creds, 'creds');
        }
    };
};
