const postgres = require("postgres");

const db = postgres({
  host: process.env.PGHOST,
  port: 5432,
  username: process.env.PGUSER,
  password: process.env.PGPASSWORD,
});

async function displayMusic() {
  const music = await db`
    select * from music
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

async function getTopArtists(limit, interval) {
  const topArtists = await db`
  select artist, sum(duration_ms) as counting from music
  where date > now() - ${interval}::interval
  group by artist
  order by counting desc
  limit ${limit};
  `;
  return topArtists;
  // topArtists =  [{ artist: 'The Cure', counting: '3' },{ artist: 'Tyler, The Creator', counting: '2' }]
}

async function getTopTracks(limit, interval) {
  const topTrack = await db`
  select name, count(*) as counting from music
  where date > now() -  ${interval}::interval
  group by name
  order by counting desc
  limit ${limit};
  `;
  return topTrack;
}

async function getListenTime(interval) {
  const listen_time = await db`
  select sum(duration_ms) as listen_time from music
  where date > now() -  ${interval}::interval
  `;
  return listen_time;
}

async function getBusiestHour(interval) {
  const busiest_hour = await db`
  select extract(hour from date), sum(duration_ms) as listened_on_count from music
  where date > now() -  ${interval}::interval
  group by extract(hour from date)
  order by listened_on_count desc
  limit 1;
  `;
}

module.exports = {
  addSong,
  displayMusic,
  getTopArtists,
  getTopTracks,
  getBusiestHour,
  getListenTime,
};
