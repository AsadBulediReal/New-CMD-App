/**
 * Google OAuth Helper utility
 * Verifies Google ID tokens and extracts verified user credentials.
 */

async function verifyGoogleToken(credential) {
  if (!credential) {
    const error = new Error("Google credential token required");
    error.statusCode = 400;
    throw error;
  }

  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
  );
  
  if (!response.ok) {
    const error = new Error("Invalid or expired Google token");
    error.statusCode = 401;
    throw error;
  }

  const payload = await response.json();
  const { email, name, sub: googleId, picture: avatar } = payload;

  if (!email) {
    const error = new Error("Google account does not provide an email");
    error.statusCode = 400;
    throw error;
  }

  if (process.env.GOOGLE_CLIENT_ID && payload.aud !== process.env.GOOGLE_CLIENT_ID) {
    const error = new Error("Google token audience mismatch");
    error.statusCode = 401;
    throw error;
  }

  return {
    email: email.trim().toLowerCase(),
    name: name || email.trim().toLowerCase().split("@")[0],
    googleId,
    avatar: avatar || null,
  };
}

module.exports = {
  verifyGoogleToken,
};
