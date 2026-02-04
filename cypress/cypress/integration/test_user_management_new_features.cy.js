describe('User management - new features', () => {
  const password = Cypress.env('TEST_USER_PW');
  const testMail = 'cypress.e2e.user@lit.justiz.sachsen.de';
  const firstName = 'cypress';
  const surname = 'user';
  const typeIntoLabeledInput = (labelRegex, value) => {
    cy.contains('label', labelRegex)
      .invoke('attr', 'for')
      .then((id) => {
        expect(id, 'input id').to.be.a('string').and.not.be.empty;
        cy.get(`[id="${id}"]`).clear().type(value);
      });
  };

  beforeEach(() => {
    cy.login().then(() => {
      cy.getAmountOfUsersForMail(testMail).then((count) => {
        if (count > 0) {
          cy.deleteUser(testMail).then(() => {});
        }
        cy.addUser(testMail, password, firstName, surname, { department: 'QA' }).then(() => cy.wrap('1'));
      });
    });
  });

  it('deactivate/reactivate blocks and restores login', () => {
    cy.visit('/admin')
      .url().should('contains', '/admin')
      .get('button#userManagement').click()
      .get('button#deactivateReactivateUser').click()
      .then(() => {
        cy.on('window:confirm', () => true);
        cy.filterUsersByEmail(testMail);
        cy.get(`[id="${testMail}"]`).find('button').click();
        cy.assertToastOneOf(['User deactivated successfully', 'Benutzer erfolgreich deaktiviert']);
        cy.get('button#modal_close').click({ force: true });
      })
      .logout()
      .login(testMail, password, {
        expectSuccess: false,
        expectErrorMessageOneOf: [
          'Login failed. Account is deactivated. Please contact an administrator.',
          'Anmeldung fehlgeschlagen. Konto ist deaktiviert. Bitte wenden Sie sich an einen Administrator.',
          'Login failed.',
          'Anmeldung fehlgeschlagen.',
        ],
      })
      .login(Cypress.env('TEST_ADMIN_MAIL'), Cypress.env('TEST_ADMIN_PW'))
      .visit('/admin')
      .get('button#userManagement').click()
      .get('button#deactivateReactivateUser').click()
      .then(() => {
        cy.on('window:confirm', () => true);
        cy.filterUsersByEmail(testMail);
        cy.get(`[id="${testMail}"]`).find('button').click();
        cy.assertToastOneOf(['User reactivated successfully', 'Benutzer erfolgreich reaktiviert']);
        cy.get('button#modal_close').click({ force: true });
      })
      .logout()
      .login(testMail, password)
      .get('#sidebar_collapse').should('contain.text', firstName);
  });

  it('admin can reset a user password', () => {
    const newPassword = `${password}1`;

    cy.visit('/admin')
      .url().should('contains', '/admin')
      .get('button#userManagement').click()
      .then(() => cy.clickFirst(['button#editUser', 'button#editEmployee']))
      .then(() => cy.filterUsersByEmail(testMail))
      .then(() => {
        cy.get(`[id="${testMail}"]`).find('button').click();
        cy.contains('button', /Reset Password|Passwort zurücksetzen/).click({ force: true });

        typeIntoLabeledInput(/New Password|Neues Passwort/, newPassword);
        typeIntoLabeledInput(/Confirm Password|Passwort bestätigen/, newPassword);

        cy.contains('button', /Confirm Reset|Zurücksetzen bestätigen/).click({ force: true });
        cy.assertToastOneOf(['Password reset successfully', 'Passwort erfolgreich zurückgesetzt']);

        // Close nested edit dialogs (inner + outer)
        cy.get('button#modal_close').last().click({ force: true });
        cy.get('body').then(($body) => {
          if ($body.find('button#modal_close').length > 0) {
            cy.get('button#modal_close').last().click({ force: true });
          }
        });
      })
      .logout()
      .login(testMail, newPassword)
      .get('#sidebar_collapse').should('contain.text', firstName);
  });
});
