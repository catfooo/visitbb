// Source - https://stackoverflow.com/a/79319722
// Posted by msd, modified by community. See post 'Timeline' for change history
// Retrieved 2026-04-15, License - CC BY-SA 4.0

const {join} = require('path');

/**
* @type {import("puppeteer").Configuration}
*/
module.exports = {
  // Changes the cache location for Puppeteer.
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
