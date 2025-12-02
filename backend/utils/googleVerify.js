const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

async function verifyIdToken(idToken) {
if (!idToken) throw new Error('Missing idToken');
    const ticket = await client.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    return {
    googleId: payload.sub,
    email: payload.email,
    username: payload.name,
    avatar: payload.picture
};
}


module.exports = { verifyIdToken };