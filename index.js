// uptime-api/index.js
const express = require("express");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

// Replace with your actual credentials
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

let accessToken = null;
let tokenExpiresAt = 0;

// Function to get a fresh access token
async function getAppAccessToken() {
  if (accessToken && Date.now() < tokenExpiresAt) return accessToken;

  const res = await axios.post(`https://id.twitch.tv/oauth2/token`, null, {
    params: {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "client_credentials",
    },
  });

  accessToken = res.data.access_token;
  tokenExpiresAt = Date.now() + res.data.expires_in * 1000;
  return accessToken;
}

app.get("/uptime", async (req, res) => {
  const channel = req.query.channel;
  if (!channel) return res.send("Missing ?channel parameter.");

  const token = await getAppAccessToken();

  try {
    const streamRes = await axios.get("https://api.twitch.tv/helix/streams", {
      params: { user_login: channel },
      headers: {
        "Client-ID": CLIENT_ID,
        Authorization: `Bearer ${token}`,
      },
    });

    const data = streamRes.data.data;

    if (data.length === 0) return res.send(`${channel} is currently offline.`);

    const startedAt = new Date(data[0].started_at);
    const now = new Date();

    const uptimeMs = now - startedAt;
    const uptimeHours = uptimeMs / (1000 * 60 * 60); // convert ms to hours
    const uptimeDecimal = parseFloat(uptimeHours.toFixed(2)); // round to 2 decimals

   return res.send(`${uptimeHours}`);

  } catch (err) {
    console.error(err.response?.data || err.message);
    return res.status(500).send("Error fetching uptime.");
  }
});

app.listen(PORT, () => {
  console.log(`Uptime API running on port ${PORT}`);
});
