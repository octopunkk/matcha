exports.up = async function (DB) {
  await DB`
    CREATE TABLE spotify_token (
      ID SERIAL PRIMARY KEY,
      token text NOT NULL,
      created_at timestamp with time zone NOT NULL default now()
    )

  `;
};

exports.down = async function (DB) {
  await DB`DROP TABLE spotify_token`;
};
