const request = require("request");

const msToBestFormat = (ms) => {
  const lang = process.env.STATS_LANG;
  const s = ms / 1000;
  const m = s / 60;
  const h = m / 60;
  const d = h / 24;
  if (d >= 2)
    return lang == "fr" ? `${Math.round(d)} jours` : `${Math.round(d)} days`;
  if (h >= 2)
    return lang == "fr" ? `${Math.round(h)} heures` : `${Math.round(h)} hours`;
  if (m >= 2) return `${Math.round(m)} minutes`;
  if (s >= 2)
    return lang == "fr"
      ? `${Math.round(s)} secondes`
      : `${Math.round(s)} seconds`;
  return lang == "fr"
    ? `${Math.round(ms)} milisecondes`
    : `${Math.round(ms)} miliseconds`;
};

const downloadAsBuffer = (uri) => {
  return new Promise((resolve, reject) => {
    request({ uri, encoding: null }, function (err, res, body) {
      if (err) {
        return reject(err);
      }
      resolve(body);
    });
  });
};

module.exports = {
  msToBestFormat,
  downloadAsBuffer,
};
