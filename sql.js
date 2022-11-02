const postgres = require("postgres");

const db = postgres(
  process.env.DATABASE_URL ||
    "postgres://postgres:anaisdocker@localhost:5432/postgres"
);

async function displayMusic() {
  const music = await db`
    select * from music
  `;
  console.log(music);
  return music;
}

async function deleteAllMusic() {
  const music = await db`
    delete from music
  `;
  console.log(music);
  return music;
}

async function addSong(song, artist, genre, spotify_id, duration_ms) {
  const xs = await db`
  insert into music (
    name, artist, genre, spotify_id, duration_ms
  ) values (
    ${song}, ${artist}, ${genre}, ${spotify_id}, ${duration_ms}
  )

  returning *
`;
  return xs;
}

// deleteAllMusic();
displayMusic();
// addSong("Someday", "The Strokes", "alternative rock");

module.exports = { addSong };
