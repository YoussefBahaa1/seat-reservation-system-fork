describe('', ()=> {   
    const buildingId = 6; // Hauptstelle Dresden, Bautzner Straße ab
    const floorId = 5; // 1. Obergeschoss - Hauptstelle Dresden, Bautzner Straße ab
    const roomRemark = 'testraum';
    const deskRemark1 = 'testdesk1';
    const deskRemark2 = 'testdesk2';
    const imgSrc = '/Assets/Hauptstelle Dresden,  Bautzner Str.19ab/1. Obergeschoss.png';
    
    const user1Mail = 'user1.mail@lit.justiz.sachsen.de';
    const user1Pw = 'test';
    const user1Vorname = 'user1';
    const user1Nachname = 'mustermann';

    const user2Mail = 'user2.mail@lit.justiz.sachsen.de';
    const user2Pw = 'test';
    const user2Vorname = 'user2';
    const user2Nachname = 'mustermann';

    const user3Mail = 'user3.mail@lit.justiz.sachsen.de';
    const user3Pw = 'test';
    const user3Vorname = 'user3';
    const user3Nachname = 'mustermann';
    
    it('Search for colleagues', ()=>{
        const start_timeslot = 3;
        const end_timeslot = 10; 
        cy.login(Cypress.env('TEST_ADMIN_MAIL'), Cypress.env('TEST_ADMIN_PW')).then(()=>{
            cy.rmAllRooms(buildingId, floorId, roomRemark, imgSrc).then(()=>{
                cy.addRoom(buildingId, floorId, roomRemark, imgSrc).then(()=>{
                    cy.addDesk(buildingId, floorId, roomRemark, imgSrc, deskRemark1).then(()=>{
                        cy.addDesk(buildingId, floorId, roomRemark, imgSrc, deskRemark2).then(()=>{
                            cy.getAmountOfUsersForMail(user1Mail).then((ret1)=>{
                                if (ret1 > 0) {
                                    cy.deleteUser(user1Mail).then(()=>{})
                                }
                                cy.addUser(user1Mail, user1Pw, user1Vorname, user1Nachname).then(()=>{
                                    cy.getAmountOfUsersForMail(user2Mail).then((ret2)=>{
                                        if (ret2 > 0) {
                                            cy.deleteUser(user2Mail).then(()=>{})
                                        }
                                        cy.addUser(user2Mail, user2Pw, user2Vorname, user2Nachname).then(()=>{
                                            cy.getAmountOfUsersForMail(user3Mail).then((ret3)=>{
                                                if (ret3 > 0) {
                                                    cy.deleteUser(user3Mail).then(()=>{})
                                                }
                                                cy.addUser(user3Mail, user3Pw, user3Vorname, user3Nachname).then(()=>{
                                                    cy.addBooking(buildingId, floorId, roomRemark, imgSrc, deskRemark1, 2, 6).then(()=>{
                                                        cy.logout().then(()=>{
                                                            cy.login(user1Mail,user1Pw).then(()=>{
                                                                cy.addBooking(buildingId, floorId, roomRemark, imgSrc, deskRemark1, 7, 11).then(()=>{
                                                                    cy.login(user2Mail, user2Pw).then(()=>{
                                                                        cy.addBooking(buildingId, floorId, roomRemark, imgSrc, deskRemark2, 7, 11).then(()=>{
                                                                            cy.login(user3Mail, user3Pw).then(()=>{
                                                                                cy.addBooking(buildingId, floorId, roomRemark, imgSrc, deskRemark2, 1, 5).then(()=>{
                                                                                    cy.login(Cypress.env('TEST_USER_MAIL'), Cypress.env('TEST_USER_PW')).then(()=>{
                                                                                        cy.visit('/colleagues').then(()=>{
                                                                                            cy.setStrDirect('emailsString', `${user1Mail}, ${user2Mail}, ${user3Mail}, ${Cypress.env('TEST_ADMIN_MAIL')}`).then(()=>{
                                                                                                cy.get('button#searchBookingsOfColleaguesBtn').click().then(()=>{
                                                                                                    cy.wait(1000).then(()=>{
                                                                                                        cy.get('table#colleagues_table').should('exist').then(()=>{
                                                                                                            cy.get('tr').should('have.length', 5).then(()=>{
                                                                                                                Cypress.Promise.all([
                                                                                                                    cy.get(`tr[id="${Cypress.env('TEST_ADMIN_MAIL')}"]`).find(`td[id="${Cypress.env('TEST_ADMIN_MAIL')}_bookings"]`).find('span').should('have.length', 1),
                                                                                                                    cy.get(`tr[id="${user1Mail}"]`).find(`td[id="${user1Mail}_bookings"]`).find('span').should('have.length', 1),
                                                                                                                    cy.get(`tr[id="${user2Mail}"]`).find(`td[id="${user2Mail}_bookings"]`).find('span').should('have.length', 1),
                                                                                                                    cy.get(`tr[id="${user3Mail}"]`).find(`td[id="${user3Mail}_bookings"]`).find('span').should('have.length', 1)]).then(()=>{
                                                                                                                        cy.logout().then(()=>{
                                                                                                                            cy.login(Cypress.env('TEST_ADMIN_MAIL'), Cypress.env('TEST_ADMIN_PW')).then(()=>{
                                                                                                                                Cypress.Promise.all([
                                                                                                                                    cy.deleteUser(user1Mail, true),
                                                                                                                                    cy.deleteUser(user2Mail, true),
                                                                                                                                    cy.deleteUser(user3Mail, true)
                                                                                                                                ]);
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
                                                                            })
                                                                        })
                                                                    }) 
                                                                })
                                                            })
                                                        })   
                                                    })
                                                });
                                            })
                                        });
                                    })
                                });
                            })
                            /*Cypress.Promise.all([
                                cy.addUser(user1Mail, user1Pw, user1Vorname, user1Nachname),
                                cy.addUser(user2Mail, user2Pw, user2Vorname, user2Nachname),
                                cy.addUser(user3Mail, user3Pw, user3Vorname, user3Nachname)
                            ]).then(()=>{
                                cy.addBooking(buildingId, floorId, roomRemark, imgSrc, deskRemark1, 2, 6).then(()=>{
                                    cy.logout().then(()=>{
                                        cy.login(user1Mail,user1Pw).then(()=>{
                                            cy.addBooking(buildingId, floorId, roomRemark, imgSrc, deskRemark1, 7, 11).then(()=>{
                                                cy.login(user2Mail, user2Pw).then(()=>{
                                                    cy.addBooking(buildingId, floorId, roomRemark, imgSrc, deskRemark2, 7, 11).then(()=>{
                                                         cy.login(user3Mail, user3Pw).then(()=>{
                                                            cy.addBooking(buildingId, floorId, roomRemark, imgSrc, deskRemark2, 1, 5).then(()=>{
                                                                cy.login(Cypress.env('TEST_USER_MAIL'), Cypress.env('TEST_USER_PW')).then(()=>{
                                                                   cy.visit('/colleagues').then(()=>{
                                                                        cy.setStrDirect('emailsString', `${user1Mail}, ${user2Mail}, ${user3Mail}, ${Cypress.env('TEST_ADMIN_MAIL')}`).then(()=>{
                                                                            cy.get('button#searchBookingsOfColleaguesBtn').click().then(()=>{
                                                                                cy.wait(1000).then(()=>{
                                                                                    cy.get('table#colleagues_table').should('exist').then(()=>{
                                                                                        cy.get('tr').should('have.length', 5).then(()=>{
                                                                                            Cypress.Promise.all([
                                                                                                cy.get(`tr[id="${Cypress.env('TEST_ADMIN_MAIL')}"]`).find(`td[id="${Cypress.env('TEST_ADMIN_MAIL')}_bookings"]`).find('span').should('have.length', 1),
                                                                                                cy.get(`tr[id="${user1Mail}"]`).find(`td[id="${user1Mail}_bookings"]`).find('span').should('have.length', 1),
                                                                                                cy.get(`tr[id="${user2Mail}"]`).find(`td[id="${user2Mail}_bookings"]`).find('span').should('have.length', 1),
                                                                                                cy.get(`tr[id="${user3Mail}"]`).find(`td[id="${user3Mail}_bookings"]`).find('span').should('have.length', 1)]).then(()=>{
                                                                                                    cy.logout().then(()=>{
                                                                                                        cy.login(Cypress.env('TEST_ADMIN_MAIL'), Cypress.env('TEST_ADMIN_PW')).then(()=>{
                                                                                                            Cypress.Promise.all([
                                                                                                                cy.deleteUser(user1Mail, true),
                                                                                                                cy.deleteUser(user2Mail, true),
                                                                                                                cy.deleteUser(user3Mail, true)
                                                                                                            ]);
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
                                                        })
                                                    })
                                                }) 
                                            })
                                        })
                                    })   
                                })                 
                            })*/
                        })
                    })
                })
            })
        });
    });
});