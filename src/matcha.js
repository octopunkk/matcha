const sql = require("./sql");
const Twit = require("twit");
const fs = require("fs"),
  request = require("request");
const SpotifyWebApi = require("spotify-web-api-node");
const schedule = require("node-schedule");
const { createCanvas, loadImage } = require("canvas");

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

const msToBestFormat = (ms, lang) => {
  const s = ms / 1000;
  const m = s / 60;
  const h = m / 60;
  const d = h / 24;
  if (d > 2)
    return lang == "fr" ? `${Math.round(d)} jours` : `${Math.round(d)} days`;
  if (h > 2)
    return lang == "fr" ? `${Math.round(h)} heures` : `${Math.round(h)} hours`;
  if (m > 2)
    return lang == "fr"
      ? `${Math.round(m)} minutes`
      : `${Math.round(m)} minutes`;
  if (s > 2)
    return lang == "fr"
      ? `${Math.round(s)} secondes`
      : `${Math.round(s)} seconds`;
  return lang == "fr"
    ? `${Math.round(ms)} milisecondes`
    : `${Math.round(ms)} miliseconds`;
};

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

async function getMyStats(interval) {
  const stats = {
    topArtists: (await sql.getTopArtists(6, interval)).map((e) => {
      e.counting = msToBestFormat(Number(e.counting));
      return e;
    }),
    topTrack: (await sql.getTopTracks(1, interval))[0],
    listenTime: msToBestFormat(
      Number((await sql.getListenTime(interval))[0].listen_time),
      "fr"
    ),
    songCount: (await sql.getSongCount(interval))[0].counting,
    topGenres: await sql.getTopGenres(5, interval),
  };
  return stats;
}

async function generateStatsImg(interval) {
  // API CALLS
  const stats = await getMyStats(interval);
  await refreshToken();
  const topTrackURL = (await spotifyApi.getTrack(stats.topTrack.spotify_id))
    .body.album.images[0].url;
  const topAtristsData = await Promise.all(
    stats.topArtists.map((artist) => {
      return spotifyApi.getTrack(artist.spotify_id);
    })
  );
  const topAtristsURLs = await Promise.all(
    topAtristsData.map((artistData) => {
      return spotifyApi.getArtist(artistData.body.artists[0].id);
    })
  );

  // BACKGROUND
  const WIDTH = 1000;
  const HEIGHT = 1000;
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");
  const palettes = [
    { bg: "#9381ff", txt: "#f8f7ff" },
    { bg: "#7400b8", txt: "#f8f7ff" },
    { bg: "#2a9d8f", txt: "#f8f7ff" },
    { bg: "#f77f00", txt: "#f8f7ff" },
    { bg: "#ef476f", txt: "#f8f7ff" },
    { bg: "#6fffe9", txt: "#22223b" },
    { bg: "#ffd6a5", txt: "#22223b" },
    { bg: "#ffadad", txt: "#22223b" },
    { bg: "#ffc6ff", txt: "#22223b" },
    { bg: "#2b2d42", txt: "#f8f7ff" },
  ];
  const idx = Math.floor(Math.random() * 10);
  ctx.fillStyle = palettes[idx].bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // TITLE
  ctx.font = "bold 40pt ";
  ctx.textAlign = "center";
  ctx.fillStyle = palettes[idx].txt;
  ctx.fillText(
    `Stats ${interval == "month" ? "du mois" : "de la semaine"}`,
    500,
    80
  );

  // SONG COUNT + LISTEN TIME
  ctx.font = " 25pt ";
  ctx.fillText(
    `${stats.songCount} sons écoutés, soit ${stats.listenTime} de musique`,
    500,
    130
  );

  // TOP TRACK
  ctx.font = "22pt";
  ctx.textAlign = "center";

  const gradient = ctx.createLinearGradient(0, 230, 0, 530);
  gradient.addColorStop(0.6, "rgba(0,0,0,0)");
  gradient.addColorStop(1, "black");
  const topTrackImg = await loadImage(await downloadAsBuffer(topTrackURL));
  ctx.drawImage(topTrackImg, 620, 230, 300, 300);
  ctx.fillStyle = gradient;
  ctx.fillRect(620, 230, 300, 300);
  ctx.fillStyle = palettes[idx].txt;
  ctx.textAlign = "center";
  ctx.font = "bold 22pt ";
  ctx.fillText(`Top track`, 770, 210);
  ctx.font = "bold 18pt ";
  ctx.textAlign = "left";
  ctx.fillStyle = "#f8f7ff";

  ctx.fillText(`${stats.topTrack.name}`, 640, 485, 280);
  ctx.font = "14pt ";
  ctx.fillText(`${stats.topTrack.counting} écoutes`, 640, 510, 280);

  // TOP ARTISTS
  ctx.fillStyle = palettes[idx].txt;
  ctx.font = "bold 24pt ";
  ctx.textAlign = "center";

  ctx.fillText(`Artistes les plus écoutés`, 265, 210);

  for (let i = 0; i < 6; i++) {
    const url = topAtristsURLs[i].body.images[0].url;
    const artistImg = await loadImage(await downloadAsBuffer(url));
    ctx.drawImage(
      artistImg,
      20 + (i % 2) * 260,
      230 + 128 * i - 128 * (i % 2),
      250,
      250
    );
    const gradient = ctx.createLinearGradient(
      0,
      230 + 128 * i - 128 * (i % 2),
      0,
      230 + 128 * i - 128 * (i % 2) + 250
    );
    gradient.addColorStop(0.6, "rgba(0,0,0,0)");
    gradient.addColorStop(1, "black");
    ctx.fillStyle = gradient;
    ctx.fillRect(20 + (i % 2) * 260, 230 + 128 * i - 128 * (i % 2), 250, 250);
  }
  ctx.fillStyle = "#f8f7ff";

  ctx.textAlign = "left";

  stats.topArtists.forEach((artist, i) => {
    ctx.font = "bold 18pt ";
    ctx.fillText(
      `${artist.artist}`,
      40 + (i % 2) * 260,
      435 + 128 * i - 128 * (i % 2),
      240
    );
    ctx.font = "14pt ";
    ctx.fillText(
      `${artist.counting} d'écoute`,
      40 + (i % 2) * 260,
      460 + 128 * i - 128 * (i % 2),
      240
    );
  });

  // TOP GENRES
  ctx.font = "bold 24pt ";
  ctx.textAlign = "center";
  ctx.fillStyle = palettes[idx].txt;

  ctx.fillText(`Genres les plus écoutés`, 770, 600);

  stats.topGenres.forEach((genre, i) => {
    ctx.font = "bold 18pt ";
    ctx.fillText(`${genre.genre}`, 770, 650 + 70 * i, 400);
    ctx.font = "14pt ";
    ctx.fillText(`${genre.counting} écoutes`, 770, 650 + 70 * i + 30, 400);
  });

  // SAVE IMG
  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync("./current_stats.png", buffer);
}

async function tweetMyStats(interval) {
  await generateStatsImg(interval);
  const b64content = fs.readFileSync("./current_stats.png", {
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
              status: ``,
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
  console.log(`Stats tweet sent !`);
}

async function doEverything() {
  getSpotifyInfo();
}

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

const downloadAsBuffer = (uri) => {
  return new Promise((resolve, reject) => {
    request({ uri, encoding: null }, function (err, res, body) {
      if (err) {
        return reject(err);
      }
      resolve(body);
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

schedule.scheduleJob("00 18 * * 7", async () => {
  const interval = "week";
  tweetMyStats(interval);
});
