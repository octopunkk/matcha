const SpotifyWebApi = require("spotify-web-api-node");

exports.spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI || "http://localhost:8888/spotify/callback",
});
