const sql = require("./db.js");

async function displayMusic() {
  const music = await sql.sql`
  
  select * from music
  `;
  console.log(music);
  return music;
}

async function addSong(id, song, artist, genre) {
  const xs = await sql.sql`
  insert into music (
    id, name, artist, genre, date
  ) values (
    ${id}, ${song}, ${artist}, ${genre}, current_date
  )

  returning *
`;
  return xs;
}

console.log(displayMusic());
addSong(3, "All Along The Watchtower", "Jimi Hendrix", "psychedelic rock");
console.log(displayMusic());
