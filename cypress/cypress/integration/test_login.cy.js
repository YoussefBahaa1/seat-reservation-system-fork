describe('Test login utilities', ()=> {   
    
    it('Test wrong password message', ()=>{
        const errMsg = 'Login failed. Wrong Password.';
        cy.login(Cypress.env('TEST_ADMIN_MAIL'), 'foo', { expectSuccess: false, expectErrorMessageOneOf: [errMsg] }).then(()=>{
            cy.get('.Toastify__toast').should('be.visible').contains(errMsg).then(()=>{
                cy.get('div#loginErrorMsg').contains(errMsg).then(()=>{
                    cy.wrap('1');
                })
            })
        });
    });

    // it('Test wrong username message', ()=>{
    //     const errMsg = 'Login failed. User was not found in ad.';
    //     cy.login('foobarbatz@lit.justiz.sachsen.de', 'foo').then(()=>{
    //         cy.get('.Toastify__toast').should('be.visible').contains(errMsg).then(()=>{
    //             cy.get('div#loginErrorMsg').contains(errMsg).then(()=>{
    //                 cy.wrap('1');
    //             })
    //         })
    //     });
    // });

    it('Test enter to commit login', ()=>{
        cy.visit('/').then(()=>{
            cy.get('input#email').should('exist').type(Cypress.env('TEST_USER_MAIL')).then(()=>{
                cy.get('input#password').should('exist').type(Cypress.env('TEST_USER_PW')).then(()=>{
                    cy.get('input#password').should('exist').type('{enter}').then(()=>{
                        cy.wait(2000).then(()=>{
                            cy.url().should('include', '/home').then(()=>{
                                cy.logout().then(()=>{
                                    cy.wrap('1');
                                })
                            })
                        })
                    })
                })
            })
        });
    });
});
