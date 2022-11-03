exports.up = async function (DB) {
  await DB`
    CREATE TABLE music (
      ID SERIAL PRIMARY KEY,
      name text NOT NULL,
      artist text NOT NULL,
      genre text NOT NULL,
      date DATE NOT NULL default now(),
      spotify_id text NOT NULL,
      duration_ms integer NOT NULL
    )

  `;
};

exports.down = async function (DB) {
  await DB`DROP TABLE music`;
};
