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

async function addSong(currentPlayingTrack) {
  const q = await db`
  insert into music (
    name, artist, genre, spotify_id, duration_ms
  ) values (
    ${currentPlayingTrack.name}, ${currentPlayingTrack.artist}, ${currentPlayingTrack.genre}, ${currentPlayingTrack.id}, ${currentPlayingTrack.duration_ms}
  )
  returning *
`;
  return q;
}

async function getTopArtists(limit, interval) {
  const topArtists = await db`
  select artist, array_agg(spotify_id) as track_ids, sum(duration_ms) as listen_duration from music
  where date > (now() - ${"1 " + interval}::interval)
  group by artist
  order by listen_duration desc
  limit ${limit};
  `;
  return topArtists.map((artist) => {
    return {
      artist: artist.artist,
      listen_duration: artist.listen_duration,
      spotify_id: artist.track_ids[0],
    };
  });
}

async function getTopTracks(limit, interval) {
  const topTracks = await db`
  select name, spotify_id, count(*) as track_count from music
  where date > (now() - ${"1 " + interval}::interval)
  group by name, spotify_id
  order by track_count desc
  limit ${limit};
  `;
  return topTracks;
}
async function getTopGenres(limit, interval) {
  const topGenres = await db`
  select genre, count(*) as genre_count from music
  where date > (now() - ${"1 " + interval}::interval)
  group by genre
  order by genre_count desc
  limit ${limit};
  `;
  return topGenres;
}
async function getListenTime(interval) {
  const listen_time = await db`
  select sum(duration_ms) as listen_time from music
  where date > (now() - ${"1 " + interval}::interval);
  `;
  return listen_time;
}

async function getBusiestHour(interval) {
  const busiest_hour = await db`
  select extract(hour from date) as busiest_hour, sum(duration_ms) as listened_on_count from music
  where date > (now() - ${"1 " + interval}::interval)
  group by busiest_hour
  order by listened_on_count desc
  limit 1;
  `;
  return busiest_hour;
}

async function getSongCount(interval) {
  const songCount = await db`
  select count(*) as song_count from music
  where date > (now() - ${"1 " + interval}::interval);  `;
  return songCount;
}

async function getLastEntryID() {
  const lastEntryID = await db`
  select ID, spotify_id from music
  order by ID desc
  limit 1;
  `;
  return lastEntryID;
}

async function getLastSpotifyTokenRefresh() {
  const lastRefresh = await db`
  select created_at, token from spotify_token                   
  order by created_at desc
  limit 1;
  `;
  return lastRefresh;
}

async function refreshSpotifyToken(newAccessToken) {
  const q = await db`
  insert into spotify_token (
    token
  ) values (
    ${newAccessToken}
  )
  returning *
`;
  return q;
}

async function deleteObsoleteSpotifyTokens() {
  const q2 = await db`
DELETE FROM spotify_token
where created_at < (now() - '1 hour'::interval);
`;
  return q2;
}

module.exports = {
  addSong,
  displayMusic,
  getTopArtists,
  getTopTracks,
  getBusiestHour,
  getListenTime,
  getSongCount,
  getTopGenres,
  getLastEntryID,
  refreshSpotifyToken,
  getLastSpotifyTokenRefresh,
  deleteObsoleteSpotifyTokens,
};
