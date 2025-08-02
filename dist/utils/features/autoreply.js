import dotenv from 'dotenv';
import UserSettings from '../../models/UserSettings.js';
import User from '../../models/User.js';
dotenv.config();
const WATERMARK = '_➤ nutterxmd_';
const replies = {
    hi: ['Sasa boss 😎', 'Mambo vipi?', 'Niaje! 🙌'],
    hello: ['Hello there 👋', 'Hey hey! 👋', 'Yoh, uko aje?'],
    hey: ['Hey! Need help? 🤔', 'Uko poa? 😄', 'Naitika bro!'],
    'who are you': ['Mimi ni bot ya mtaa 🤖', 'Built to serve – na niko rada!'],
    help: [
        'Unahitaji msaada? Type *.menu* kuona kila kitu 📋',
        'Try *.menu* for full list ya commands zako 📦',
    ],
    thanks: ['Karibu sana 🙏', 'Aisee anytime 😊', 'Hakuna shida!'],
    thankyou: ['Usijali bro 😎', 'Niko hapa kwa ajili yako! 💪'],
    bye: ['Acha niende nikachill 😂👋', 'Toodles! Tutaonana baadaye'],
    goodnight: ['Usiku mwema 😴', 'Sleep tight – usiote mabaya'],
    gm: ['Mambo ya asubuhi! ☕', 'Top of the morning! 🌄'],
    goodmorning: ['Habari ya asubuhi ☀️', 'Morning! Let’s win today 💪'],
    gn: ['Good night, champ 🌙', 'Time to log off 🛌'],
    goodafternoon: ['Saa ya lunch ama bado? 🍽️'],
    goodnightbot: ['Bot nayo inalala pia 😴'],
    'how are you': ['Niko fiti sana! Na wewe je? 😄', 'Poapoa! Na wewe?'],
    'what can you do': ['Niite super bot 💪 – try *.menu* uone 🔧'],
    'who made you': ['Nimetengenezwa na nutterxmd 🔥', 'Boss wangu ni nutterxmd 😎'],
    'what is your name': ['Mi ni nutterxmd bot 🤖', 'Naitwa bot wa nutterxmd 💼'],
};
function normalize(text) {
    return text.trim().toLowerCase();
}
function getRandomReply(replies) {
    const choice = replies[Math.floor(Math.random() * replies.length)];
    return `${choice}\n\n${WATERMARK}`;
}
function exactWordMatch(text, keyword) {
    const pattern = new RegExp(`\\b${keyword}\\b`, 'i');
    return pattern.test(text);
}
export const feature = {
    name: 'autoreply',
    enabled: () => true,
    handle: async (sock, msg) => {
        const jid = msg.key.remoteJid;
        if (msg.key.fromMe || !jid)
            return;
        const sessionPhone = sock.user?.id?.split('@')[0];
        const sessionUser = await User.findOne({ phone: sessionPhone });
        if (!sessionUser) {
            if (process.env.VERBOSE_LOGGING?.toLowerCase() === 'true') {
                console.log(`[autoreply] ❌ No session user found for ${sessionPhone}`);
            }
            return;
        }
        let settings = await UserSettings.findOne({ userId: sessionUser._id });
        if (!settings) {
            settings = await UserSettings.create({
                userId: sessionUser._id,
                username: sessionUser.username,
                phone: sessionUser.phone,
                prefix: '.',
                mode: 'PUBLIC',
                blockedUsers: [],
                features: {
                    autoReply: false,
                    typingDelay: false,
                    groupWelcome: false,
                    groupEvents: false,
                    scheduledMessages: false,
                    referralMessage: false,
                    salute: false,
                    antilink: false,
                    onlineOnlyMode: false,
                    paymentReminder: true,
                    customCommands: false,
                    menuCommand: true,
                    blockCommand: false,
                    unblockCommand: false,
                    presence: false,
                    antiDelete: false,
                    autobio: false,
                }
            });
            console.log(`[autoreply] 🆕 Created default settings for ${sessionUser.username} (${sessionPhone})`);
        }
        if (!settings.features?.autoReply) {
            if (process.env.VERBOSE_LOGGING?.toLowerCase() === 'true') {
                console.log(`[autoreply] ⛔ AutoReply is disabled for ${sessionUser.username} (${sessionPhone})`);
            }
            return;
        }
        const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text;
        if (!text)
            return;
        const lowerText = normalize(text);
        for (const keyword of Object.keys(replies)) {
            if (exactWordMatch(lowerText, keyword)) {
                const response = getRandomReply(replies[keyword]);
                await sock.sendMessage(jid, { text: response });
                console.log(`[autoreply] ✅ Replied to ${jid} for keyword "${keyword}" (session: ${sessionPhone})`);
                break;
            }
        }
    },
};
