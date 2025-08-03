import { MongoClient, Db, Collection } from 'mongodb';
import {
    AuthenticationCreds,
    SignalDataTypeMap,
    initAuthCreds,
    BufferJSON
} from '@whiskeysockets/baileys';

const MONGO_URI = process.env.MONGO_URI!;
const DB_NAME = 'baileysSessions';

let mongoClient: MongoClient | null = null;

async function connectMongo(): Promise<Db> {
    if (!mongoClient) {
        mongoClient = new MongoClient(MONGO_URI);
        await mongoClient.connect();
    }
    return mongoClient.db(DB_NAME);
}

// Safe SignalKeyStore type
type SignalKeyStore = {
    [T in keyof SignalDataTypeMap]?: Record<string, SignalDataTypeMap[T][keyof SignalDataTypeMap[T]]>;
};

interface AuthCredsDoc {
    sessionId: string;
    creds: ReturnType<typeof BufferJSON.replacer>;
}

interface AuthKeysDoc {
    sessionId: string;
    keys: ReturnType<typeof BufferJSON.replacer>;
}

export const useMongoAuthState = async (
    sessionId: string
): Promise<{
    state: {
        creds: AuthenticationCreds;
        keys: {
            get: <T extends keyof SignalDataTypeMap>(
                type: T,
                ids: string[]
            ) => Promise<Partial<Record<string, SignalDataTypeMap[T][keyof SignalDataTypeMap[T]]>>>;
            set: (data: SignalKeyStore) => Promise<void>;
        };
    };
    saveCreds: () => Promise<void>;
}> => {
    const db = await connectMongo();
    const credsCol: Collection<AuthCredsDoc> = db.collection('authCreds');
    const keysCol: Collection<AuthKeysDoc> = db.collection('authKeys');

    const credsDoc = await credsCol.findOne({ sessionId });
    const keysDoc = await keysCol.findOne({ sessionId });

    const creds: AuthenticationCreds = credsDoc
        ? BufferJSON.reviver('', credsDoc.creds)
        : initAuthCreds();

    const keysData: SignalKeyStore = keysDoc
        ? BufferJSON.reviver('', keysDoc.keys)
        : {};

    const state = {
        creds,
        keys: {
            get: async <T extends keyof SignalDataTypeMap>(
                type: T,
                ids: string[]
            ): Promise<Partial<Record<string, SignalDataTypeMap[T][keyof SignalDataTypeMap[T]]>>> => {
                const result: Partial<Record<string, SignalDataTypeMap[T][keyof SignalDataTypeMap[T]]>> = {};
                const category = keysData[type];

                if (category) {
                    for (const id of ids) {
                        if (category[id]) {
                            result[id] = category[id];
                        }
                    }
                }
                return result;
            },

            set: async (data: SignalKeyStore) => {
                for (const _type in data) {
                    const type = _type as keyof SignalDataTypeMap;
                    if (!keysData[type]) {
                        keysData[type] = {};
                    }
                    Object.assign(keysData[type]!, data[type]);
                }

                await keysCol.updateOne(
                    { sessionId: sessionId },
                    { $set: { keys: BufferJSON.replacer('', keysData) } },
                    { upsert: true }
                );
            }
        }
    };

    const saveCreds = async () => {
        await credsCol.updateOne(
            { sessionId: sessionId },
            { $set: { creds: BufferJSON.replacer('', state.creds) } },
            { upsert: true }
        );
    };

    return { state, saveCreds };
};
