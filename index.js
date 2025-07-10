const express = require("express");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

let accessToken = null;
let tokenExpiresAt = 0;

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
  if (!channel) return res.send("Missing ?channel parameter");

  const token = await getAppAccessToken();

  try {
    const twitchRes = await axios.get("https://api.twitch.tv/helix/streams", {
      params: { user_login: channel },
      headers: {
        "Client-ID": CLIENT_ID,
        Authorization: `Bearer ${token}`,
      },
    });

    const stream = twitchRes.data.data[0];
    if (!stream) return res.send(`${channel} is currently offline.`);

    const startedAt = new Date(stream.started_at);
    const now = new Date();
    const uptimeHours = ((now - startedAt) / 1000 / 60 / 60).toFixed(2);

    return res.send(`${channel} has been live for ${uptimeHours} hours.`);
  } catch (err) {
    console.error(err.response?.data || err.message);
    return res.status(500).send("Error fetching stream info.");
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
