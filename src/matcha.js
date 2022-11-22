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
    topArtists: (await sql.getTopArtists(5, interval)).map((e) => {
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
  const WIDTH = 1000;
  const HEIGHT = 1000;
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#9381ff";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  // Write "Stats de la semaine/ du mois :"
  ctx.font = "bold 40pt ";
  ctx.textAlign = "center";
  ctx.fillStyle = "#f8f7ff";
  ctx.fillText(
    `Stats ${interval == "month" ? "du mois" : "de la semaine"}`,
    500,
    100
  );
  ctx.font = " 25pt ";

  ctx.fillText(
    `${stats.songCount} sons écoutés, soit ${stats.listenTime} de musique`,
    500,
    200
  );
  ctx.font = "22pt";
  ctx.textAlign = "center";

  ctx.fillText(
    `Top track : ${stats.topTrack.name} avec ${stats.topTrack.counting} écoutes`,
    500,
    250,
    900
  );
  ctx.font = "bold 22pt ";
  ctx.fillText(`Artistes les plus écoutés`, 250, 350, 900);
  stats.topArtists.forEach((artist, i) => {
    ctx.fillText(`${artist.artist}`, 300, 420 + 110 * i, 900);
    ctx.font = "18pt ";
    ctx.fillText(`${artist.counting} d'écoute`, 300, 420 + 110 * i + 40, 900);
    ctx.font = "bold 22pt ";
  });
  for (let i = 0; i < 5; i++) {
    const url = topAtristsURLs[i].body.images[0].url;
    const artistImg = await loadImage(await downloadAsBuffer(url));
    ctx.drawImage(artistImg, 50, 380 + 110 * i, 100, 100);
  }

  ctx.font = "bold 22pt ";

  ctx.fillText(`Genres les plus écoutés`, 750, 350, 900);

  stats.topGenres.forEach((genre, i) => {
    ctx.fillText(`${genre.genre}`, 750, 420 + 110 * i, 900);
    ctx.font = "18pt ";
    ctx.fillText(`${genre.counting} écoutes`, 750, 420 + 110 * i + 40, 900);
    ctx.font = "bold 22pt ";
  });

  const topTrackImg = await loadImage(await downloadAsBuffer(topTrackURL));
  ctx.drawImage(topTrackImg, 50, 200, 100, 100);
  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync("./current_stats.png", buffer);
}

/* stats should look like : 
{
  durée : "du mois" / "de la semaine",
  songCount : '46',
  listenTime : "7 heures",
  topTrack : {name: "Machu Picchu", counting: 5 },
  topArtists : [{artist : "Arctic Monkeys", counting : "30 minutes"}, ...] (5 names)
  topGenres: Result(5) [
    { genre: 'alternative dance', counting: '21' },
    { genre: 'melodic metalcore', counting: '15' },
    { genre: 'baroque pop', counting: '7' },
    { genre: 'big beat', counting: '6' },
    { genre: 'disco house', counting: '3' }
  ]
}
*/

const tweetMyStats = (
  interval,
  topArtists,
  topTrack,
  listen_time,
  songCount,
  topGenres
) => {
  const durée = interval == "month" ? "du mois" : "de la semaine";
  // T.post(
  //   "statuses/update",
  //   {
  //     status: `Mes stats ${durée} : \n
  //   J'ai écouté ${songCount.counting} soit ${listen_time} de musique \n
  //   Top son : ${topTrack.name} \n
  //   Top artiste : ${topArtists.artist}  \n
  //   Top genre : ${topGenres.genre}
  //   `,
  //   },

  //   function (err, data, response) {
  //     console.log(data);
  //   }
  // );
};

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
      // tweetMySong(
      //   data.body.item.name,
      //   data.body.item.album.name,
      //   data.body.item.album.artists[0].name
      // );
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
const minutes = 0.05;

// setInterval(function () {
//   refreshToken();
//   doEverything();
// }, minutes * 60 * 1000);

generateStatsImg("week");
// schedule.scheduleJob("0 0 * * *", async () => {
//   const interval = "week";
//   const limit = 1;
//   tweetMyStats(
//     interval,
//     await sql.getTopArtists(limit, interval),
//     await sql.getTopTracks(limit, interval),
//     await sql.getListenTime(interval),
//     await sql.getSongCount(interval),
//     await sql.getTopGenres(limit, interval)
//   );
// });
