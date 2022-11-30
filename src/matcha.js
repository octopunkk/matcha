const sql = require("./sql");
// use const here -> OK
const request = require("request");
const schedule = require("node-schedule");
const { createCanvas, loadImage } = require("canvas");
const twitter = require("./twitter");
const spotify = require("./spotify");
const fs = require("fs");

// Spotify could be move to a separate file -> OK
// Twitter could be move to a separate file -> OK

// Globals outside of function -> OK
const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 1000;
const CANVAS_TXT_COLOR_LIGHT = "#f8f7ff";

const CANVAS_PALETTES = [
  // CANVAS_PALETTES is a global, should be outside of function + UPPERCASE
  { bg: "#9381ff", txt: CANVAS_TXT_COLOR_LIGHT },
  { bg: "#7400b8", txt: CANVAS_TXT_COLOR_LIGHT },
  { bg: "#2a9d8f", txt: CANVAS_TXT_COLOR_LIGHT },
  { bg: "#f77f00", txt: CANVAS_TXT_COLOR_LIGHT },
  { bg: "#ef476f", txt: CANVAS_TXT_COLOR_LIGHT },
  { bg: "#6fffe9", txt: "#22223b" },
  { bg: "#ffd6a5", txt: "#22223b" },
  { bg: "#ffadad", txt: "#22223b" },
  { bg: "#ffc6ff", txt: "#22223b" },
  { bg: "#2b2d42", txt: CANVAS_TXT_COLOR_LIGHT },
];

const msToBestFormat = (ms) => {
  const lang = process.env.STATS_LANG;
  const s = ms / 1000;
  const m = s / 60;
  const h = m / 60;
  const d = h / 24;
  if (d >= 2)
    return lang == "fr" ? `${Math.round(d)} jours` : `${Math.round(d)} days`;
  if (h >= 2)
    return lang == "fr" ? `${Math.round(h)} heures` : `${Math.round(h)} hours`;
  if (m >= 2) return `${Math.round(m)} minutes`;
  if (s >= 2)
    return lang == "fr"
      ? `${Math.round(s)} secondes`
      : `${Math.round(s)} seconds`;
  return lang == "fr"
    ? `${Math.round(ms)} milisecondes`
    : `${Math.round(ms)} miliseconds`;
};

async function fetchSpotifyStats(interval) {
  // all transforms sould be in the called functions instead, will be cleaner -> OK
  const stats = {
    topArtists: await sql.getTopArtists(6, interval),
    topTrack: (await sql.getTopTracks(1, interval))[0],
    listenTime: (await sql.getListenTime(interval))[0].listen_time,
    songCount: (await sql.getSongCount(interval))[0].song_count,
    topGenres: await sql.getTopGenres(5, interval),
  };
  return stats;
}

async function applyGradientToImg(imgURL, ctx, imgSize, x, y) {
  const gradient = ctx.createLinearGradient(0, y, 0, y + imgSize);
  gradient.addColorStop(0.6, "rgba(0,0,0,0)");
  gradient.addColorStop(1, "black");
  const topTrackImg = await loadImage(await downloadAsBuffer(imgURL));
  ctx.drawImage(topTrackImg, x, y, imgSize, imgSize);
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, imgSize, imgSize);
}

const applyTextToCover = (ctx, x, y, coverSize, bigText, smallText) => {
  const leftMargin = 15;
  ctx.font = "bold 18pt ";
  ctx.textAlign = "left";
  ctx.fillStyle = CANVAS_TXT_COLOR_LIGHT;
  ctx.fillText(
    bigText,
    x + leftMargin,
    y + coverSize - 45,
    coverSize - leftMargin
  );
  ctx.font = "14pt ";
  ctx.fillText(
    smallText,
    x + leftMargin,
    y + coverSize - 20,
    coverSize - leftMargin
  );
};

async function generateStatsImg(interval) {
  // API CALLS
  // getMyStats is super generic, maybe something like "fetchSpotifyHistoricalStats" -> OK
  const stats = await fetchSpotifyStats(interval);
  // what happens if nothing was listen during the week? -> OK (return, don't tweet)
  if (stats.songCount === 0) {
    return;
  }
  stats.topArtists = stats.topArtists.map((artist) => {
    artist.listen_duration = msToBestFormat(Number(artist.listen_duration));
    return artist;
  });
  stats.listenTime = msToBestFormat(Number(stats.listenTime));
  // do not refresh if not needed ? "refreshToken" is too generic, maybe "refreshTwitterToken" -> OK
  await spotify.refreshSpotifyToken();
  // "topTrackAlbumCoverURL" instead? -> OK
  const topTrackAlbumCoverURL = await spotify.fetchAlbumCoverUrl(
    stats.topTrack.spotify_id
  );
  const topArtistsImageUrls = await Promise.all(
    // could do both operation in a single function and then call Promise.all on this function that does getTrack + getArtist -> OK
    stats.topArtists.map((artist) => {
      return spotify.fetchArtistImageUrl(artist.spotify_id);
    })
  );

  // BACKGROUND
  const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
  const ctx = canvas.getContext("2d");
  const palette =
    CANVAS_PALETTES[Math.floor(Math.random() * CANVAS_PALETTES.length)];
  // * CANVAS_PALETTES.length instead of 10 -> OK
  // idx is super generic, instead just use it with const palette = CANVAS_PALETTES[Math.random() * CANVAS_PALETTES.length] -> OK
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // TITLE
  ctx.font = "bold 40pt "; // space at the end of quote
  ctx.textAlign = "center";
  ctx.fillStyle = palette.txt;
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
  // logic to draw an image with a gradient is hard to follow
  // would be bette to create a helper function that takes the image URL + coordinates + ctx to do it -> OK
  await applyGradientToImg(topTrackAlbumCoverURL, ctx, 300, 620, 230);
  ctx.fillStyle = palette.txt;
  ctx.textAlign = "center";
  ctx.font = "bold 22pt ";
  ctx.fillText(`Top track`, 770, 210);
  applyTextToCover(
    ctx,
    620,
    230,
    300,
    `${stats.topTrack.name}`,
    `${stats.topTrack.track_count} écoutes`
  );

  // TOP ARTISTS
  ctx.fillStyle = palette.txt;
  ctx.font = "bold 24pt ";
  ctx.textAlign = "center";
  ctx.fillText(`Artistes les plus écoutés`, 265, 210);

  for (let i = 0; i < topArtistsImageUrls.length; i++) {
    // what happens if less than 6 artists? would be better to use topAtristsURLs.length -> OK
    // same here, better to use helper fct -> OK
    await applyGradientToImg(
      topArtistsImageUrls[i],
      ctx,
      250,
      20 + (i % 2) * 260,
      230 + 128 * i - 128 * (i % 2)
    );
  }
  stats.topArtists.forEach((artist, i) => {
    applyTextToCover(
      ctx,
      20 + (i % 2) * 260,
      230 + 128 * i - 128 * (i % 2),
      250,
      `${artist.artist}`,
      `${artist.listen_duration} d'écoute`
    );
  });

  // TOP GENRES
  ctx.font = "bold 24pt ";
  ctx.textAlign = "center";
  ctx.fillStyle = palette.txt;
  ctx.fillText(`Genres les plus écoutés`, 770, 600);

  stats.topGenres.forEach((genre, i) => {
    ctx.font = "bold 18pt ";
    ctx.fillText(`${genre.genre}`, 770, 650 + 70 * i, 400);
    ctx.font = "14pt ";
    ctx.fillText(`${genre.genre_count} écoutes`, 770, 650 + 70 * i + 30, 400);
  });
  const buffer = canvas.toBuffer("image/png");
  return buffer;
}

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

async function handleCurrentPlayingTrack() {
  try {
    const currentPlayingTrack = await spotify.fetchSpotifyCurrentPlayingTrack();
    const previousTrack = await sql.getLastEntryID();
    if (
      currentPlayingTrack &&
      currentPlayingTrack.id !== previousTrack[0].spotify_id
    ) {
      await sql.addSong(currentPlayingTrack);
      if (process.env.APP_ENV === "prod") {
        const tweetTextContent = `🎶 Actuellement en train d'écouter : ${currentPlayingTrack.name} \n💿 Album : ${currentPlayingTrack.album} \n🎸 Artiste : ${currentPlayingTrack.artist}`;
        const currentTrackAlbumCover = await downloadAsBuffer(
          currentPlayingTrack.albumCoverUrl
        );
        twitter.tweetWithImg(tweetTextContent, currentTrackAlbumCover);
      }
    }
  } catch (err) {
    console.log(err);
  }
}

async function tweetStatsImg(interval) {
  const statsImgBuffer = await generateStatsImg(interval);
  if (statsImgBuffer) {
    twitter.tweetWithImg("", statsImgBuffer);
  }
}

// would be better organized as a always running async function like:
// this way, if getSpotifyInfo takes 10 seconds, you're still waiting 30 seconds between each check -> OK

// set max tweet frequency
const minutes = 0.5;
const loop = async () => {
  while (true) {
    await handleCurrentPlayingTrack();
    await new Promise((resolve) => setTimeout(resolve, minutes * 60 * 1000));
  }
};
loop();
if (process.env.APP_ENV === "prod") {
  schedule.scheduleJob("00 12 * * 7", async () => {
    const interval = "week";
    // always await promise -> OK
    await tweetStatsImg(interval);
  });
  schedule.scheduleJob("00 9 1 * *", async () => {
    const interval = "month";
    await tweetStatsImg(interval);
  });
}
