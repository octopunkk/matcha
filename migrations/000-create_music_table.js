const postgres = require("postgres");

const DB = postgres(
  process.env.DATABASE_URL ||
    "postgres://postgres:anaisdocker@localhost:5432/postgres"
);

exports.up = async function () {
  await DB`
    CREATE TABLE music (
      ID SERIAL PRIMARY KEY,
      song text NOT NULL,
      artist text NOT NULL,
      genre text NOT NULL,
      date DATE NOT NULL default now(),
      spotify_id text NOT NULL,
      duration_ms integer NOT NULL
    )

  `;
};

exports.down = async function () {
  await DB`DROP TABLE music`;
};
