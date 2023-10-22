const sql = require("./sql");
const spotify = require("./spotify");
const { startServer } = require('./httpserver');

async function handleCurrentPlayingTrack() {
  try {
    const currentPlayingTrack = await spotify.fetchSpotifyCurrentPlayingTrack();
    const previousTrack = await sql.getLastEntryID();
    if (
      currentPlayingTrack &&
      (!previousTrack[0] || currentPlayingTrack.id !== previousTrack[0].spotify_id)
    ) {
      console.log('Registering song in database:', currentPlayingTrack.name);
      await sql.addSong(currentPlayingTrack);
    }
  } catch (err) {
    console.log(err);
  }
}

// set max tweet frequency
const minutes = 0.5;
const main = async () => {
  startServer();

  while (true) {
    await handleCurrentPlayingTrack();
    await new Promise((resolve) => setTimeout(resolve, minutes * 60 * 1000));
  }
};
main();
