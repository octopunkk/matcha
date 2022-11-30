const Twit = require("twit");
const util = require("util");

const T = new Twit({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token: process.env.TWITTER_ACCESS_TOKEN,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

async function tweetWithImg(tweetTextContent, tweetImageContent) {
  const post = util.promisify(T.post).bind(T);
  const imageInB64 = tweetImageContent.toString("base64");
  try {
    const mediaData = await post("media/upload", {
      media_data: imageInB64,
    });
    const mediaIdStr = await mediaData.media_id_string;
    const meta_params = { media_id: mediaIdStr };
    await post("media/metadata/create", meta_params);
    const params = {
      status: tweetTextContent,
      media_ids: [mediaIdStr],
    };
    await post("statuses/update", params);
    console.log("tweet sent !");
  } catch (error) {
    console.log("Something went wrong, tweet wasn't sent \n", error);
  }
}

module.exports = { tweetWithImg };
