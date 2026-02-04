describe('', ()=>{
    const pw1 = Cypress.env('TEST_USER_PW');
    const pw2 = pw1+2;
    const vorname1 = 'max';
    const vorname2 = vorname1+1;
    const nachname = 'mustermann';
    const mail = 'user.mail@lit.justiz.sachsen.de';
    const mail2 = 'user2.mail@lit.justiz.sachsen.de';

    beforeEach(()=>{
        cy.login().then(()=>{
            cy.getAmountOfUsersForMail(mail).then((ret)=>{
                if (ret > 0) {
                    cy.deleteUser(mail).then(()=>{})
                }
                cy.addUser(mail, pw1, vorname1, nachname).then(()=>{return;});
            }).then(()=>{
                cy.getAmountOfUsersForMail(mail2).then((ret)=>{
                    if (ret > 0) {
                        cy.deleteUser(mail2).then(()=>{})
                    }
                })
            })
        });
    })
    
	    it('test register with same mail', ()=>{
	        cy.login()
	        .visit('/admin')
	        .url().should('contains', '/admin')
	        .get('button#userManagement').click()
	        .then(() => cy.clickFirst(['button#addUser', 'button#addEmployee']))
	        .get('h2').should('be.visible').then(()=>{
	          cy.get('body').then(($body) => {
	            const isNew = $body.find('div#addUser-setEmail').length > 0;
	            const prefix = isNew ? 'addUser' : 'addEmployee';
	            Cypress.Promise.all([
	              cy.setStr(`${prefix}-setEmail`, mail),
	              cy.setStr(`${prefix}-setPassword`, pw1),
	              cy.setStr(`${prefix}-setName`, vorname1),
	              cy.setStr(`${prefix}-setSurname`, nachname),
	            ]).then(()=>{
	              cy.get('button#modal_submit').click();
	              cy.assertToastOneOf([
	                'Creation was not successful. Is the email already used?',
	                'Keine Erstellung möglich. Wird die Email schon verwendet?',
	              ]).then(()=> cy.wrap('1'));
	            });
	          });
	        });
	    })

	    it('test register with same mail with leading whitespace', ()=>{
	        cy.login()
	        .visit('/admin')
	        .url().should('contains', '/admin')
	        .get('button#userManagement').click()
	        .then(() => cy.clickFirst(['button#addUser', 'button#addEmployee']))
	        .get('h2').should('be.visible').then(()=>{
	          cy.get('body').then(($body) => {
	            const isNew = $body.find('div#addUser-setEmail').length > 0;
	            const prefix = isNew ? 'addUser' : 'addEmployee';
	            Cypress.Promise.all([
	              cy.setStr(`${prefix}-setEmail`, ' ' + mail),
	              cy.setStr(`${prefix}-setPassword`, pw1),
	              cy.setStr(`${prefix}-setName`, vorname1),
	              cy.setStr(`${prefix}-setSurname`, nachname),
	            ]).then(()=>{
	              cy.get('button#modal_submit').click();
	              cy.assertToastOneOf([
	                'Creation was not successful. Is the email already used?',
	                'Keine Erstellung möglich. Wird die Email schon verwendet?',
	              ]).then(()=> cy.wrap('1'));
	            });
	          });
	        });
	    })

	    it('test change admin', ()=>{
	        cy.login(mail, pw1).then(()=>{
	        // No admin
	        cy.get('#sidebar_admin').should('not.exist');

	        cy.logout()
	        .login(Cypress.env('TEST_ADMIN_MAIL'), Cypress.env('TEST_ADMIN_PW'))
	        .visit('/admin')
	        .get('button#userManagement').click()
	        .then(() => cy.clickFirst(['button#editUser', 'button#editEmployee']))
	        .then(() => cy.filterUsersByEmail(mail))
	        // Set user with mail to admin
	        .then(() => {
	          cy.get(`[id="${mail}"]`).find('button').click();
	          cy.get('#radioAdmin_true').click({ force: true });
	          cy.get('button#modal_submit').click();
	          cy.assertToastOneOf(['User updated successfully', 'Nutzer wurde erfolgreich geändert']);
	        })
	        .logout()
	        .login(mail, pw1).then(()=>{
	            // admin
	            cy.get('#sidebar_admin').should('exist');
	            cy.logout()
	            .login(Cypress.env('TEST_ADMIN_MAIL'), Cypress.env('TEST_ADMIN_PW'))
	            .visit('/admin')
	            .get('button#userManagement').click()
	            .then(() => cy.clickFirst(['button#editUser', 'button#editEmployee']))
	            .then(() => cy.filterUsersByEmail(mail))
	            // Reset user with mail to non admin
	            .then(() => {
	              cy.get(`[id="${mail}"]`).find('button').click();
	              cy.get('#radioAdmin_false').click({ force: true });
	              cy.get('button#modal_submit').click();
	              cy.assertToastOneOf(['User updated successfully', 'Nutzer wurde erfolgreich geändert']);
	            })
	            .logout()
	            .login(mail, pw1).then(()=>{
	                // No admin
	                cy.get('#sidebar_admin').should('not.exist');
	            })
	        })
	        })
	    })

    
	    it('test change password', ()=>{
	        cy.login(mail, pw1).then(()=>{
	            // No admin
	            cy.get('#sidebar_admin').should('not.exist').then(()=>{
	                // Change pw
	                cy.get('a#sidebar_settings0').click().then(()=>{
	                cy.get('a#sidebar_changePassword').click().then(()=>{
	                    Cypress.Promise.all([
	                        cy.setStr('changePassword_prevPassword', pw1),
	                        cy.setStr('changePassword_newPassword', pw2),
	                        cy.setStr('changePassword_newPasswordAgain', pw2)
	                    ]).then(()=>{
	                        cy.get('button#modal_submit').click().then(()=>{
	                            cy.assertToastOneOf([
	                              'Password changed successfully',
	                              'Passwort erfolgreich geändert',
	                            ]).then(()=>{ //cy.screenshot('c');
	                                cy.logout().then(()=>{
	                                    cy.login(mail, pw2).then(()=>{
	                                        // No admin
	                                        cy.get('#sidebar_admin').should('not.exist').then(()=>{
	                                            // Rechange pw
	                                            cy.get('a#sidebar_settings0').click().then(()=>{
	                                                cy.get('a#sidebar_changePassword').click().then(()=>{
	                                                    Cypress.Promise.all([
	                                                        cy.setStr('changePassword_prevPassword', pw2),
	                                                        cy.setStr('changePassword_newPassword', pw1),
	                                                        cy.setStr('changePassword_newPasswordAgain', pw1)
	                                                    ]).then(()=>{
	                                                        cy.get('button#modal_submit').click().then(()=>{
	                                                            cy.logout().then(()=>{                    
	                                                                cy.login(mail, pw1).then(()=>{
	                                                                    // No admin
	                                                                    cy.get('#sidebar_admin').should('not.exist').then(()=>{
	                                                                        cy.logout().then(()=>{});
	                                                                    });
	                                                                })
	                                                            })
	                                                        })
	                                                    });
	                                                })
	                                            })
	                                        })
	                                    })
	                                });
	                            });
	                        })
	                    }) 
	                })
	                })
	            })
	        });
	    });

	    it('test change name', ()=>{
	        cy.login()
	        .visit('/admin')
	        .url().should('contains', '/admin')
	        .get('button#userManagement').click()
	        .then(() => cy.clickFirst(['button#editUser', 'button#editEmployee']))
	        .then(() => cy.filterUsersByEmail(mail))
	        .then(() => {
	          cy.get(`[id="${mail}"]`).find('button').click();
	          cy.setStr('editUserModal-setName', vorname2);
	          cy.get('button#modal_submit').click();
	          cy.assertToastOneOf(['User updated successfully', 'Nutzer wurde erfolgreich geändert']);
	        })
	        .logout()
	        .login(mail, pw1).then(()=>{
	          cy.get('#sidebar_collapse').should('contain.text', vorname2);
	          cy.get('#sidebar_admin').should('not.exist');
	          cy.logout();
	        });
	})

	it('test change email', ()=>{
	    cy.login()
	    .visit('/admin')
	    .url().should('contains', '/admin')
	    .get('button#userManagement').click()
	    .then(() => cy.clickFirst(['button#editUser', 'button#editEmployee']))
	    .then(() => cy.filterUsersByEmail(mail))
	    .then(() => {
	      cy.get(`[id="${mail}"]`).find('button').click();
	      cy.setStr('editUserModal-setName', vorname2);
	      cy.setStr('editUser-setEmail', mail2);
	      cy.get('button#modal_submit').click();
	      cy.assertToastOneOf(['User updated successfully', 'Nutzer wurde erfolgreich geändert']);
	    })
	    .logout()
	    .login(mail2, pw1).then(()=>{
	      cy.get('#sidebar_collapse').should('contain.text', vorname2);
	      cy.get('#sidebar_admin').should('not.exist');
	      cy.logout();
	    });
	})

it('test deletion of user with bookings/series', ()=>{
    const buildingId = 6; // Hauptstelle Dresden, Bautzner Straße ab
    const floorId = 5; // 1. Obergeschoss - Hauptstelle Dresden, Bautzner Straße ab
    const roomRemark = 'testraum';
    const deskRemark1 = 'testdesk1';
    const imgSrc = '/Assets/Hauptstelle Dresden,  Bautzner Str.19ab/1. Obergeschoss.png';
    
    cy.login(Cypress.env('TEST_ADMIN_MAIL'), Cypress.env('TEST_ADMIN_PW')).then(()=>{
        cy.rmAllRooms(buildingId, floorId, roomRemark, imgSrc).then(()=>{
            cy.addRoom(buildingId, floorId, roomRemark, imgSrc).then(()=>{
                cy.addDesk(buildingId, floorId, roomRemark, imgSrc, deskRemark1).then(()=>{
                    cy.logout().then(()=>{
                        cy.login(mail, pw1).then(()=>{
                            cy.visit('/createseries').then(()=>{
                                cy.get('#root', { timeout: 10000 }).should('exist').then(()=>{
                                    cy.get('div#dates_label').should('exist').then(()=> {//cy.get('h1').should('exist').then(()=> {
                                        Cypress.Promise.all([
                                            cy.setStr('startTime', '08:00:00'),
                                            cy.setStr('endTime', '11:00:00')
                                        ]).then(()=>{
                                            cy.get('div#dates_label').find('span').should('have.length', 1).then(()=>{
                                                cy.get(`tr[id*="${deskRemark1}"`).find('button').click().then(()=>{
                                                    cy.get('.Toastify__toast').should('be.visible').should('include.text', 'Creation of series bookings from').should('include.text', 'was successful.').then(()=>{
                                                        cy.addBooking(buildingId, floorId, roomRemark, imgSrc, deskRemark1, 15, 18).then(()=>{
                                                            cy.logout().then(()=>{
                                                                cy.login(Cypress.env('TEST_ADMIN_MAIL'), Cypress.env('TEST_ADMIN_PW')).then(()=>{                                                            
                                                                    cy.countBookings(roomRemark).should('equal', 2).then(()=>{
                                                                        cy.deleteUser(mail, true).then(()=>{})
                                                                    })
                                                                })
                                                            })
                                                        })
                                                    });
                                                })
                                            })
                                        })
                                    })
                                })
                            })
                        });
                    });
                });
            });
        });
    })
})


});
