const PORT = process.env.PORT || 8888;

const Koa = require('koa');
const Router = require('@koa/router');
const { spotifyApi } = require('./spotifyApi');

const app = new Koa();
const router = new Router();

router.get('/spotify/login', (ctx, next) => {
  const authorizeUrl = spotifyApi.createAuthorizeURL(
    ['user-read-email', 'user-read-playback-state', 'user-read-currently-playing'],
    'matcha'
  );

  ctx.redirect(authorizeUrl);
});

router.get('/spotify/callback', async (ctx, next) => {
  const spotifyCode = ctx.request.query.code;
  console.log(spotifyCode);

  try {
    const data = await spotifyApi.authorizationCodeGrant(spotifyCode);
    console.log('The token expires in ' + data.body['expires_in']);
    console.log('The access token is ' + data.body['access_token']);
    console.log('The refresh token is ' + data.body['refresh_token']);

    // Set the access token on the API object to use it in later calls
    spotifyApi.setAccessToken(data.body['access_token']);
    spotifyApi.setRefreshToken(data.body['refresh_token']);
    ctx.body = 'All good! Look at the terminal output for more info';
  } catch (e) {
    console.log('Something went wrong!', e);
    ctx.body = 'Something went wrong, look at the terminal for more info'
  }
});

app
  .use(router.routes())
  .use(router.allowedMethods());

exports.startServer = () => {
  app.listen(PORT, () => {
    console.log('Server listening on port: ', PORT);
  });
}
