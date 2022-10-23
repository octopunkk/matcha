const sql = require("./db.js");

async function displayMusic() {
  const music = await sql.sql`
    select * from music
  `;
  console.log(music);
  return music;
}

async function deleteAllMusic() {
  const music = await sql.sql`
    delete from music
  `;
  console.log(music);
  return music;
}

async function addSong(song, artist, genre) {
  const xs = await sql.sql`
  insert into music (
    name, artist, genre, date
  ) values (
    ${song}, ${artist}, ${genre}, current_date
  )

  returning *
`;
  return xs;
}

// deleteAllMusic();
displayMusic();
// addSong("Someday", "The Strokes", "alternative rock");

module.exports = { addSong };
