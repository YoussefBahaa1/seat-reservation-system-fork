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
        .get('button#addEmployee').click()
        .get('h2').should('be.visible').then(()=>{
            Cypress.Promise.all([
                cy.setStr('addEmployee-setEmail', mail),
                cy.setStr('addEmployee-setPassword', pw1),
                cy.setStr('addEmployee-setName', vorname1),
                cy.setStr('addEmployee-setSurname', nachname)
            ]).then(()=>{
                cy.get('button#modal_submit').click()
                .get('.Toastify__toast').should('be.visible').contains('Creation was not successful. Is the email already used?').then(()=>{
                    return cy.wrap('1');
                })
            })
        })
    })

    it('test register with same mail with leading whitespace', ()=>{
        cy.login()
        .visit('/admin')
        .url().should('contains', '/admin')
        .get('button#userManagement').click()
        .get('button#addEmployee').click()
        .get('h2').should('be.visible').then(()=>{
            Cypress.Promise.all([
                cy.setStr('addEmployee-setEmail', ' ' + mail),
                cy.setStr('addEmployee-setPassword', pw1),
                cy.setStr('addEmployee-setName', vorname1),
                cy.setStr('addEmployee-setSurname', nachname)
            ]).then(()=>{
                cy.get('button#modal_submit').click()
                .get('.Toastify__toast').should('be.visible').contains('Creation was not successful. Is the email already used?').then(()=>{
                    return cy.wrap('1');
                })
            });
        })                 
    })

    it('test change admin', ()=>{
        cy.login(mail, pw1).then(()=>{
        // No admin
        cy.contains('span', 'Admin').should('not.exist')
        .logout()
        .login(Cypress.env('TEST_ADMIN_MAIL'), Cypress.env('TEST_ADMIN_PW'))
        .visit('/admin')
        .get('button#userManagement').click()
        .get('button#editEmployee').click()
            // Search for user with mail
            Cypress.Promise.all([
                cy.get('input#checkbox_handleCheckboxChange').click(),
                cy.get('div#filterEmployee_handleFieldChange').click()
                    .get('[data-value="email"]').click()
                ,
                cy.get('div#filterEmployee_handleConditionChange').click()
                    .get('[data-value="is_equal"]').click()
                ,
                cy.get('div#filterEmployee_handleTextChange').find('input').type(mail)
            ]).then(()=>{
                // Set user with mail to admin
                cy.get(`[id="${mail}"]`).find('button').click()
                .get('label#radioAdmin_true').click()
                .get('button#modal_submit').click()
                .logout()
                .login(mail, pw1).then(()=>{
                    // admin
                    cy.contains('span', 'Admin').should('exist')
                    .logout()
                    .login(Cypress.env('TEST_ADMIN_MAIL'), Cypress.env('TEST_ADMIN_PW'))
                    .visit('/admin')
                    .get('button#userManagement').click()
                    .get('button#editEmployee').click()
                    Cypress.Promise.all([
                        cy.get('input#checkbox_handleCheckboxChange').click(),
                        cy.get('div#filterEmployee_handleFieldChange').click()
                            .get('[data-value="email"]').click()
                        ,
                        cy.get('div#filterEmployee_handleConditionChange').click()
                            .get('[data-value="is_equal"]').click()
                        ,
                        cy.get('div#filterEmployee_handleTextChange').find('input').type(mail)
                    ]).then(()=>{
                        // Reset user with mail to non admin
                        cy.get(`[id="${mail}"]`).find('button').click()
                        .get('label#radioAdmin_false').click()
                        .get('button#modal_submit').click()
                        .logout()
                        .login(mail, pw1).then(()=>{
                            // No admin
                            cy.contains('span', 'Admin').should('not.exist');
                        })
                    })
                })
            })
        })
    })

    
    it('test change password', ()=>{
        cy.login(mail, pw1).then(()=>{
            // No admin
            cy.contains('span', 'Admin').should('not.exist').then(()=>{
                // Change pw
                cy.get('a#sidebar_settings0').click().then(()=>{
                cy.contains('span', 'Password').click().then(()=>{
                    Cypress.Promise.all([
                        cy.setStr('changePassword_prevPassword', pw1),
                        cy.setStr('changePassword_newPassword', pw2),
                        cy.setStr('changePassword_newPasswordAgain', pw2)
                    ]).then(()=>{
                        cy.get('button#modal_submit').click().then(()=>{
                            cy.get('.Toastify__toast').should('be.visible').contains('Password changed successfully').then(()=>{ //cy.screenshot('c');
                                cy.logout().then(()=>{
                                    cy.login(mail, pw2).then(()=>{
                                        // No admin
                                        cy.contains('span', 'Admin').should('not.exist').then(()=>{
                                            // Rechange pw
                                            cy.get('a#sidebar_settings0').click().then(()=>{
                                                cy.contains('span', 'Password').click().then(()=>{
                                                    Cypress.Promise.all([
                                                        cy.setStr('changePassword_prevPassword', pw2),
                                                        cy.setStr('changePassword_newPassword', pw1),
                                                        cy.setStr('changePassword_newPasswordAgain', pw1)
                                                    ]).then(()=>{
                                                        cy.get('button#modal_submit').click().then(()=>{
                                                            cy.logout().then(()=>{                    
                                                                cy.login(mail, pw1).then(()=>{
                                                                    // No admin
                                                                    cy.contains('span', 'Admin').should('not.exist').then(()=>{
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
        cy.login().then(()=>{
        cy.visit('/admin').then(()=>{
            cy.url().should('contains', '/admin').then(()=> {
                cy.get('button#userManagement').click().then(()=>{
                    //cy.get('div.employee-button-wrapper').should('be.visible').then(()=>{
                        cy.get('button#editEmployee').click().then(()=>{
                            cy.get('input#checkbox_handleCheckboxChange').click().then(()=>{
                                Cypress.Promise.all([
                                    cy.setStr('filterEmployee_handleFieldChange', 'email'),
                                    cy.setStr('filterEmployee_handleConditionChange', 'is_equal'),
                                    cy.setStr('filterEmployee_handleTextChange', mail)
                                ]).then(()=>{
                                    cy.get('tr').find('button').click().then(()=>{
                                        cy.setStr('editEmployeeModal-setName', vorname2).then(()=>{
                                            cy.get('button#modal_submit').click().then(()=>{//cy.get('button#editEmployeeModal_updateEmployee').click().then(()=>{
                                                cy.get('.Toastify__toast').should('be.visible').contains('User updated successfully').then(()=>{
                                                        cy.logout().then(()=>{
                                                            cy.login(mail, pw1).then(()=>{
                                                                cy.contains('span',`Hello, ${vorname2}`).should('exist').then(()=>{
                                                                    cy.contains('span', 'Admin').should('not.exist').then(()=>{
                                                                        cy.logout().then(()=>{});
                                                                    });
                                                                })
                                                            });
                                                        });
                                                });
                                            })
                                        })
                                    })
                                })
                            })
                        })
                })
            })
        })
    })
})

it('test change email', ()=>{
    cy.login()
    .visit('/admin')
    .url().should('contains', '/admin')
    .get('button#userManagement').click()
    .get('button#editEmployee').click()
    .get('input#checkbox_handleCheckboxChange').click()
    Cypress.Promise.all([
        cy.setStr('filterEmployee_handleFieldChange', 'email'),
        cy.setStr('filterEmployee_handleConditionChange', 'is_equal'),
        cy.setStr('filterEmployee_handleTextChange', mail)
    ]).then(()=>{
        cy.get('tr').find('button').click()
        .setStr('editEmployeeModal-setName', vorname2)
        .setStr('editEmployee-setEmail', mail2)
        .get('button#modal_submit').click()
        .get('.Toastify__toast').should('be.visible').contains('User updated successfully')
        .logout()
        .login(mail2, pw1).then(()=>{
            cy.contains('span',`Hello, `).should('exist')
            .contains('span', 'Admin').should('not.exist')
            .logout();
    })
    })
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