const { defineConfig } = require('cypress');
const crypto = require('crypto');

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32ToBuffer(secret) {
  const cleaned = String(secret || '')
    .toUpperCase()
    .replace(/=+$/g, '')
    .replace(/[^A-Z2-7]/g, '');

  let bits = 0;
  let value = 0;
  const output = [];

  for (const char of cleaned) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return Buffer.from(output);
}

function generateTotp(secret, step = 30, digits = 6) {
  const key = base32ToBuffer(secret);
  const epochSeconds = Math.floor(Date.now() / 1000);
  const counter = Math.floor(epochSeconds / step);

  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeUInt32BE(0, 0);
  counterBuffer.writeUInt32BE(counter, 4);

  const hmac = crypto.createHmac('sha1', key).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % (10 ** digits);

  return String(code).padStart(digits, '0');
}

module.exports = defineConfig({
  e2e: {
    retries: 3,
    env: {
      TEST_USER_MAIL: process.env.TEST_USER_MAIL,
      TEST_USER_PW: process.env.TEST_USER_PW,
      TEST_ADMIN_MAIL: process.env.TEST_ADMIN_MAIL,
      TEST_ADMIN_PW: process.env.TEST_ADMIN_PW,
      TEST_SERVICE_PERSONNEL_MAIL: process.env.TEST_SERVICE_PERSONNEL_MAIL,
      TEST_SERVICE_PERSONNEL_PW: process.env.TEST_SERVICE_PERSONNEL_PW,
    },
    baseUrl: process.env.CYPRESS_BASE_URL || 'https://jus-srv-test30.justiz.sachsen.de:3001',
    setupNodeEvents(on, config) {
      on('after:screenshot', (details) => {
        console.log(`Screenshot taken: ${details.path}`);
      });
      on('task', {
        log(message) {
          console.log(message);
          return null; // Return null since tasks need to return something
        },
        setUserData: (userData) => {
          global.userData = userData;
          return null;
        },
        getUserData: () => {
          return global.userData;
        },
        totp({ secret, step = 30, digits = 6 } = {}) {
          if (!secret) {
            throw new Error('totp task requires a secret');
          }
          return generateTotp(secret, step, digits);
        },
      });
    },
    screenshot: {
      capture: 'fullPage', // Ensures Cypress captures the full page
    },
    specPattern: 'cypress/integration/**/*.cy.{js,jsx,ts,tsx}', // New pattern for test files
    supportFile: 'cypress/support/index.js',
    defaultCommandTimeout: 10000,
  },
  video: true,
});
