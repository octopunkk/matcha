const sql = require("./sql");

const Twit = require("twit");
const fs = require("fs"),
  request = require("request");
const SpotifyWebApi = require("spotify-web-api-node");

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.spotify_clientId,
  clientSecret: process.env.spotify_clientSecret,
  redirectUri: process.env.spotify_redirectUri || "http://localhost:8888/",
});

spotifyApi.setAccessToken(process.env.spotify_accessToken);

spotifyApi.setRefreshToken(process.env.spotify_refreshToken);

const T = new Twit({
  consumer_key: process.env.twitter_consumer_key,
  consumer_secret: process.env.twitter_consumer_secret,
  access_token: process.env.twitter_access_token,
  access_token_secret: process.env.twitter_access_token_secret,
});

const tweetMySong = (song, album, artist) => {
  var b64content = fs.readFileSync("./current_album.png", {
    encoding: "base64",
  });
  T.post(
    "media/upload",
    { media_data: b64content },
    function (err, data, response) {
      var mediaIdStr = data.media_id_string;
      var meta_params = { media_id: mediaIdStr };

      T.post(
        "media/metadata/create",
        meta_params,
        function (err, data, response) {
          if (!err) {
            var params = {
              status: `🎶 Actuellement en train d'écouter : ${song} \n💿 Album : ${album} \n🎸 Artiste : ${artist}`,
              media_ids: [mediaIdStr],
            };

            T.post("statuses/update", params, function (err, data, response) {
              console.log(data);
            });
          }
        }
      );
    }
  );
  console.log(`Tweet about ${song} sent !`);
};

const doEverything = () => {
  getSpotifyInfo();
};

const download = (uri, filename) => {
  return new Promise((resolve, reject) => {
    request.head(uri, function (err, res, body) {
      if (res) {
        request(uri)
          .pipe(fs.createWriteStream(filename))
          .on("close", () => resolve());
      } else return reject(err);
    });
  });
};

let currentInfo = "";

async function getSpotifyInfo() {
  try {
    const data = await spotifyApi.getMyCurrentPlayingTrack();
    if (!data.body.item.album.artists[0].id || !data.body.item.name)
      throw new Error(`Error : didn't fetch data`);
    const genredata = await spotifyApi.getArtist(
      data.body.item.album.artists[0].id
    );
    if (!genredata) throw new Error(`Error : didn't fetch genre data`);
    console.log("Now playing: " + data.body.item.name);
    if (currentInfo !== data.body.item.name) {
      await download(data.body.item.album.images[0].url, "current_album.png");

      await sql.addSong(
        data.body.item.name,
        data.body.item.album.artists[0].name,
        genredata.body.genres[0],
        data.body.item.id,
        data.body.item.duration_ms
      );
      sql.displayMusic();
      tweetMySong(
        data.body.item.name,
        data.body.item.album.name,
        data.body.item.album.artists[0].name
      );
    }
    currentInfo = data.body.item.name;
  } catch (err) {
    console.log(err);
  }
}

async function refreshToken() {
  try {
    const data = await spotifyApi.refreshAccessToken();
    console.log("The access token has been refreshed!");
    // Save the access token so that it's used in future calls
    spotifyApi.setAccessToken(data.body["access_token"]);
  } catch (err) {
    console.log("Could not refresh access token", err);
  }
}

const minutes = 0.5;

setInterval(function () {
  refreshToken();
  doEverything();
}, minutes * 60 * 1000);
