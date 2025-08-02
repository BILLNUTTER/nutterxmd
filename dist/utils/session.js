// ✅ Generate secure session ID with embedded pair code
export const generateSecureSessionId = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    const digits = '0123456789';
    // Generate 4-letter + 4-digit pair code
    let pairCode = '';
    for (let i = 0; i < 4; i++) {
        pairCode += letters.charAt(Math.floor(Math.random() * letters.length));
        pairCode += digits.charAt(Math.floor(Math.random() * digits.length));
    }
    // Generate long secure string
    const length = 1000 + Math.floor(Math.random() * 100);
    let sessionString = '';
    for (let i = 0; i < length; i++) {
        sessionString += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return `nutter-xmd-${pairCode}-${sessionString}`;
};
