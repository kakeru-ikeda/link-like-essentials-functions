const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Changes the cache location for Puppeteer.
  // We place it inside node_modules to ensure It is preserved in the Cloud Functions runtime
  // after the build step (npm install).
  cacheDirectory: join(__dirname, 'node_modules', '.puppeteer_cache'),
};
