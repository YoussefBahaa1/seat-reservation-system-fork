describe('Admin MFA flow', () => {
  const adminMail = Cypress.env('TEST_ADMIN_MAIL');
  const adminPw = Cypress.env('TEST_ADMIN_PW');

  const enabledRegex = /MFA (is enabled|ist aktiviert)/;
  const disabledRegex = /MFA (is disabled|ist deaktiviert)/;

  const ensureSidebarExpanded = () => {
    cy.get('.ps-sidebar-root').then(($sidebar) => {
      if ($sidebar.width() <= 100) {
        cy.get('#sidebar_collapse').click({ force: true });
      }
    });
  };

  const openMfaSettings = () => {
    ensureSidebarExpanded();
    cy.get('#sidebar_settings0').then(($settings) => {
      const expanded =
        $settings.attr('aria-expanded') === 'true' ||
        $settings.hasClass('ps-open') ||
        $settings.closest('li').hasClass('ps-open');
      if (!expanded) {
        cy.wrap($settings).click({ force: true });
      }
    });
    cy.get('#sidebar_settings0')
      .closest('li')
      .find('.ps-submenu-content')
      .should('be.visible');
    cy.get('#sidebar_mfaSettings').should('be.visible').click({ force: true });
    cy.contains(/MFA Settings|MFA-Einstellungen/).should('be.visible');
    cy.contains(/MFA (is enabled|is disabled|ist aktiviert|ist deaktiviert)/).should('be.visible');
  };

  const typeIntoLabeledInput = (labelRegex, value) => {
    cy.contains('label', labelRegex)
      .invoke('attr', 'for')
      .then((id) => {
        expect(id, 'input id').to.be.a('string').and.not.be.empty;
        cy.get(`[id="${id}"]`).clear().type(value);
      });
  };

  const closeMfaSettings = () => {
    cy.get('button#modal_close').click({ force: true });
  };

  const ensureMfaDisabled = () => {
    openMfaSettings();
    cy.get('body').then(($body) => {
      const text = $body.text();
      if (enabledRegex.test(text)) {
        cy.contains('button', /Disable MFA|MFA deaktivieren/).click({ force: true });
        typeIntoLabeledInput(/Password|Passwort/, adminPw);
        cy.contains('button', /Disable MFA|MFA deaktivieren/).click({ force: true });
        cy.assertToastOneOf(['MFA disabled successfully', 'MFA erfolgreich deaktiviert']);
      }
    });
    closeMfaSettings();
  };

  it('admin can enable MFA and login with code', () => {
    cy.login(adminMail, adminPw).then(() => {
      ensureMfaDisabled();

      openMfaSettings();
      cy.intercept('GET', '**/users/mfa/setup').as('mfaSetup');
      cy.contains('button', /Enable MFA|MFA aktivieren/).click({ force: true });

      cy.wait('@mfaSetup').then((interception) => {
        const secret = interception.response?.body?.secret;
        expect(secret, 'mfa secret').to.be.a('string').and.not.be.empty;
        cy.wrap(secret).as('mfaSecret');

        cy.task('totp', { secret }).then((code) => {
          typeIntoLabeledInput(/Enter 6-digit|Geben Sie den 6-stelligen/, code);

          cy.contains('button', /Enable MFA|MFA aktivieren/).click({ force: true });
          cy.assertToastOneOf(['MFA enabled successfully', 'MFA erfolgreich aktiviert']);
        });
      });

      closeMfaSettings();
      cy.logout();

      cy.visit('/');
      cy.get('input#email').clear().type(adminMail);
      cy.get('input#password').clear().type(adminPw);
      cy.get('button#login_btn').click();

      cy.contains(/MFA verification required|MFA-Verifizierung erforderlich/).should('be.visible');
      cy.get('@mfaSecret').then((secret) => {
        cy.task('totp', { secret }).then((code) => {
          cy.get('#mfaCode').clear().type(code);
          cy.get('#mfa_verify_btn').click();
        });
      });

      cy.url().should('include', '/home');
      cy.get('#sidebar_admin').should('exist');

      openMfaSettings();
      cy.get('body').then(($body) => {
        const text = $body.text();
        if (disabledRegex.test(text)) {
          closeMfaSettings();
          return;
        }
        cy.contains('button', /Disable MFA|MFA deaktivieren/).click({ force: true });
        typeIntoLabeledInput(/Password|Passwort/, adminPw);
        cy.contains('button', /Disable MFA|MFA deaktivieren/).click({ force: true });
        cy.assertToastOneOf(['MFA disabled successfully', 'MFA erfolgreich deaktiviert']);
      });
      closeMfaSettings();
    });
  });
});
