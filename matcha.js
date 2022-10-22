const secret = require("./secret");

const Twit = require("twit");
const fs = require("fs"),
  request = require("request");
const SpotifyWebApi = require("spotify-web-api-node");

const spotifyApi = new SpotifyWebApi({
  clientId: secret.env.spotify.clientId,
  clientSecret: secret.env.spotify.clientSecret,
  redirectUri: secret.env.spotify.redirectUri,
});

spotifyApi.setAccessToken(secret.env.spotify.accessToken);

spotifyApi.setRefreshToken(secret.env.spotify.refreshToken);

const T = new Twit({
  consumer_key: secret.env.twitter.consumer_key,
  consumer_secret: secret.env.twitter.consumer_secret,
  access_token: secret.env.twitter.access_token,
  access_token_secret: secret.env.twitter.access_token_secret,
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

const download = function (uri, filename, callback) {
  request.head(uri, function (err, res, body) {
    if (res) {
      console.log("content-type:", res?.headers["content-type"]);
      console.log("content-length:", res?.headers["content-length"]);
      request(uri).pipe(fs.createWriteStream(filename)).on("close", callback);
    }
  });
};
let currentInfo = "";

const getSpotifyInfo = () => {
  spotifyApi.getMyCurrentPlayingTrack().then(
    function (data) {
      if (data?.body?.item?.name) {
        console.log("Now playing: " + data.body.item.name);
        download(
          data.body.item.album.images[0].url,
          "current_album.png",
          function () {
            console.log("done");
            if (currentInfo !== data.body.item.name) {
              // tweetMySong(
              //   data.body.item.name,
              //   data.body.item.album.name,
              //   data.body.item.album.artists[0].name
              // );
            }
            currentInfo = data.body.item.name;
          }
        );
      }
    },
    function (err) {
      console.log("Something went wrong!", err);
    }
  );
};

let refreshToken = () => {
  spotifyApi.refreshAccessToken().then(
    function (data) {
      console.log("The access token has been refreshed!");

      // Save the access token so that it's used in future calls
      spotifyApi.setAccessToken(data.body["access_token"]);
    },
    function (err) {
      console.log("Could not refresh access token", err);
    }
  );
};

var minutes = 0.1;

setInterval(function () {
  refreshToken();
  doEverything();
}, minutes * 60 * 1000);
