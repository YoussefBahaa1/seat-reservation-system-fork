const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    retries: 3,
    env: {
      TEST_USER_MAIL: process.env.TEST_USER_MAIL,
      TEST_USER_PW: process.env.TEST_USER_PW,
      TEST_ADMIN_MAIL: process.env.TEST_ADMIN_MAIL,
      TEST_ADMIN_PW: process.env.TEST_ADMIN_PW
    },
    baseUrl: 'https://jus-srv-test30.justiz.sachsen.de:3001',
    setupNodeEvents(on, config) {
      on('after:screenshot', (details) => {
        console.log(`Screenshot taken: ${details.path}`);
      });
      on('task', {
        log(message) {
          console.log(message);
          return null; // Return null since tasks need to return something
        },
      });
      on('task', {
        setUserData: (userData) => {
          global.userData = userData;
          return null;
        },
        getUserData: () => {
          return global.userData;
        },
      });
    },
    defaultCommandTimeout: 10000,
    screenshot: {
      capture: 'fullPage', // Ensures Cypress captures the full page
    },
    specPattern: 'cypress/integration/**/*.cy.{js,jsx,ts,tsx}', // New pattern for test files
    supportFile: 'cypress/support/index.js',
    defaultCommandTimeout: 10000 
  },
  video: true,
});
