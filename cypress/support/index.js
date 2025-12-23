// This is an optional file for configuring Cypress globally.

// Import any commands or custom behaviors here.
//import './commands';

// Example: You can add hooks or global error handling here.
Cypress.on('uncaught:exception', (err, runnable) => {
  // Returning false prevents Cypress from failing the test.
  return false;
});