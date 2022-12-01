const sql = require("./sql");
const schedule = require("node-schedule");
const { createCanvas, loadImage } = require("canvas");
const twitter = require("./twitter");
const spotify = require("./spotify");
const utils = require("./utils");

const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 1000;
const CANVAS_TXT_COLOR_LIGHT = "#f8f7ff";

const CANVAS_PALETTES = [
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

async function fetchSpotifyStats(interval) {
  const stats = {
    topArtists: await sql.getTopArtists(6, interval),
    topTrack: await sql.getTopTracks(1, interval),
    listenTime: await sql.getListenTime(interval),
    songCount: await sql.getSongCount(interval),
    topGenres: await sql.getTopGenres(5, interval),
  };
  return stats;
}

async function applyGradientToImg(imgURL, ctx, imgSize, x, y) {
  const gradient = ctx.createLinearGradient(0, y, 0, y + imgSize);
  gradient.addColorStop(0.6, "rgba(0,0,0,0)");
  gradient.addColorStop(1, "black");
  const topTrackImg = await loadImage(await utils.downloadAsBuffer(imgURL));
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
  const stats = await fetchSpotifyStats(interval);
  if (stats.songCount[0].song_count === 0) {
    return;
  }
  await spotify.refreshSpotifyToken();
  const topTrackAlbumCoverURL = await spotify.fetchAlbumCoverUrl(
    stats.topTrack[0].spotify_id
  );
  const topArtistsImageUrls = await Promise.all(
    stats.topArtists.map((artist) => {
      return spotify.fetchArtistImageUrl(artist.spotify_id);
    })
  );

  // BACKGROUND
  const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
  const ctx = canvas.getContext("2d");
  const palette =
    CANVAS_PALETTES[Math.floor(Math.random() * CANVAS_PALETTES.length)];
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // TITLE
  ctx.font = "bold 40pt ";
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
    `${stats.songCount[0].song_count} sons écoutés, soit ${utils.msToBestFormat(
      Number(stats.listenTime[0].listen_time)
    )} de musique`,
    500,
    130
  );

  // TOP TRACK
  ctx.font = "22pt";
  ctx.textAlign = "center";
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
    `${stats.topTrack[0].name}`,
    `${stats.topTrack[0].track_count} écoutes`
  );

  // TOP ARTISTS
  ctx.fillStyle = palette.txt;
  ctx.font = "bold 24pt ";
  ctx.textAlign = "center";
  ctx.fillText(`Artistes les plus écoutés`, 265, 210);

  for (let i = 0; i < topArtistsImageUrls.length; i++) {
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
      `${utils.msToBestFormat(Number(artist.listen_duration))} d'écoute`
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
        const currentTrackAlbumCover = await utils.downloadAsBuffer(
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
    const text = `📈 Stats ${
      interval == "month" ? "du mois" : "de la semaine"
    }`;
    twitter.tweetWithImg(text, statsImgBuffer);
  }
}

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
  schedule.scheduleJob("00 18 * * 7", async () => {
    const interval = "week";
    await tweetStatsImg(interval);
  });
  schedule.scheduleJob("00 12 1 * *", async () => {
    const interval = "month";
    await tweetStatsImg(interval);
  });
}
