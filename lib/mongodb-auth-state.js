const { MongoClient, Db } = require('mongodb');
const fs = require('fs');
const path = require('path');

let mongoClient;
let authDatabase;

async function initializeMongoDB() {
    if (!mongoClient) {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/takibot';
        mongoClient = new MongoClient(mongoUri, { retryWrites: true, w: 'majority' });
        await mongoClient.connect();
        authDatabase = mongoClient.db('takibot');
        console.log('✅ Connected to MongoDB');
    }
    return authDatabase;
}

async function useMongoDBAuthState(sessionName = 'session') {
    const db = await initializeMongoDB();
    const collection = db.collection('auth_state');

    const readState = async () => {
        try {
            const data = await collection.findOne({ sessionName });
            if (!data) {
                return { creds: {}, keys: {} };
            }
            return {
                creds: data.creds || {},
                keys: data.keys || {}
            };
        } catch (error) {
            console.error('Error reading auth state:', error);
            return { creds: {}, keys: {} };
        }
    };

    const saveState = async () => {
        return async (state) => {
            try {
                await collection.updateOne(
                    { sessionName },
                    { 
                        $set: {
                            sessionName,
                            creds: state.creds || {},
                            keys: state.keys || {},
                            updatedAt: new Date()
                        }
                    },
                    { upsert: true }
                );
            } catch (error) {
                console.error('Error saving auth state:', error);
            }
        };
    };

    const state = await readState();

    return {
        state,
        saveCreds: await saveState()
    };
}

module.exports = { useMongoDBAuthState, initializeMongoDB };
