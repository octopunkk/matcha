# Matcha

Matcha is a twitter bot made with node.js. It tweets every song I listen to on spotify.

The bot also tweets an image with my weekly listening stats every sunday at 6pm, and another with my monthly listening stats every 1st of the month at 9am.

You can see it in action on my [@AnaisMusicBot account](https://twitter.com/AnaisMusicBot).

It runs on a raspberry pi, with docker-compose. A postgres database stores the histoty of the tracks listened.

## Install

To use locally, clone the repo, `docker-compose build` then `docker-compose up`.

You should have [docker](https://www.docker.com/) and [docker compose](https://docs.docker.com/compose/gettingstarted/) installed on your machine.

To test new things or debug, you can run the postgres container with `docker-compose up database` and run the bot with node, by using `npm start:local` or `npm start:local:watch` (uses nodemon). This way is faster than rebuilding the image at every change.

Migrations are handled by [ley](https://github.com/lukeed/ley).

To rollback the last migration `npm down`.

## Config

You need a .env file to specify those environment variables :

Your spotify, twitter and postgres database credentials :

- SPOTIFY_CLIENT_ID
- SPOTIFY_CLIENT_SECRET
- SPOTIFY_REDIRECT_URI
- SPOTIFY_ACCESS_TOKEN
- SPOTIFY_REFRESH_TOKEN
- TWITTER_CONSUMER_KEY
- TWITTER_CONSUMER_SECRET
- TWITTER_ACCESS_TOKEN
- TWITTER_ACCESS_TOKEN_SECRET
- PGHOST
- PGUSER
- PGPASSWORD

Your timezone :

- TZ=Europe/Paris
- PGTZ=Europe/Paris

The language for the stats image :

- STATS_LANG=fr

And your app environment (local or prod)

- APP_ENV
