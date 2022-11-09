exports.up = async function (DB) {
  await DB`
    ALTER TABLE music 
      ALTER COLUMN date TYPE timestamp with time zone,
      ALTER COLUMN date SET default CURRENT_TIMESTAMP(0);
  `;
};

exports.down = async function (DB) {
  await DB`
  ALTER TABLE music
    ALTER COLUMN date TYPE DATE,
    ALTER COLUMN date SET default now();
  `;
};
