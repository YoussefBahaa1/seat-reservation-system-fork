describe('Test the room search.', ()=> {   
    const buildingId = 6; // Hauptstelle Dresden, Bautzner Straße ab
    const floorId = 5; // 1. Obergeschoss - Hauptstelle Dresden, Bautzner Straße ab
    const roomRemark = 'testraum';
    const deskRemark1 = 'testdesk1';
    const deskRemark2 = 'testdesk2';
    const deskRemark3 = 'testdesk3';
    const deskRemark4 = 'testdesk4';
    const imgSrc = '/Assets/Hauptstelle Dresden,  Bautzner Str.19ab/1. Obergeschoss.png';
    it('', ()=>{
        const start_timeslot = 3;
        const end_timeslot = 10; 
        
        cy.login(Cypress.env('TEST_ADMIN_MAIL'), Cypress.env('TEST_ADMIN_PW')).then(()=>{
            cy.rmAllRooms(buildingId, floorId, roomRemark, imgSrc).then(()=>{
                cy.addRoom(buildingId, floorId, roomRemark, imgSrc).then(()=>{
                    cy.addDesk(buildingId, floorId, roomRemark, imgSrc, deskRemark1).then(()=>{
                        cy.addDesk(buildingId, floorId, roomRemark, imgSrc, deskRemark2).then(()=>{
                            cy.addDesk(buildingId, floorId, roomRemark, imgSrc, deskRemark3).then(()=>{
                                cy.addDesk(buildingId, floorId, roomRemark, imgSrc, deskRemark4).then(()=>{
                                    cy.logout().then(()=>{
                                        cy.login(Cypress.env('TEST_USER_MAIL'), Cypress.env('TEST_USER_PW')).then(()=>{
                                            cy.visit('roomSearch').then(()=>{
                                                cy.get('input#minimalAmountOfWorkstationsInput').should('have.value', '2').then(()=>{
                                                    cy.setStr('div_minimalAmountOfWorkstationsInput', '4').then(()=>{
                                                        cy.get('#onDate_checkbox input[type="checkbox"]').should('not.be.checked').then(()=>{
                                                            cy.get('#onDate_checkbox input[type="checkbox"]').check().then(()=>{
                                                                Cypress.Promise.all([
                                                                    //cy.setStr('roomSearch_date', '01.01.2025'),
                                                                    cy.setStr('roomSearch_endTime', '11:30:00'),
                                                                    cy.setStr('roomSearch_endTime', '18:00:00'),
                                                                ])
                                                                .then(()=>{
                                                                    cy.contains('td', roomRemark).should('exist').then(()=>{
                                                                        cy.setStr('div_minimalAmountOfWorkstationsInput', '5').then(()=>{
                                                                            cy.contains('td', roomRemark).should('not.exist').then(()=>{
                                                                                cy.addBooking(buildingId, floorId, roomRemark, imgSrc, deskRemark1, 3 , 18).then(()=>{
                                                                                    cy.visit('roomSearch').then(()=>{
                                                                                        cy.get('#onDate_checkbox input[type="checkbox"]').check().then(()=>{
                                                                                            Cypress.Promise.all([
                                                                                                //cy.setStr('roomSearch_date', '01.01.2025'),
                                                                                                cy.setStr('roomSearch_endTime', '08:00:00'),
                                                                                                cy.setStr('roomSearch_endTime', '20:00:00'),
                                                                                                cy.setStr('div_minimalAmountOfWorkstationsInput', '3')
                                                                                            ])
                                                                                            .then(()=>{
                                                                                                cy.contains('td', roomRemark).should('exist').then(()=>{
                                                                                                    cy.setStr('div_minimalAmountOfWorkstationsInput', '4').then(()=>{
                                                                                                        cy.contains('td', roomRemark).should('not.exist').then(()=>{
                                                                                                            cy.login(Cypress.env('TEST_ADMIN_MAIL'), Cypress.env('TEST_ADMIN_PW')).then(()=>{
                                                                                                                cy.rmRoom(buildingId, floorId, roomRemark, imgSrc).then(()=>{      
                                                                                                                    return cy.wrap('1');
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
                                        })
                                    })
                                });
                            });
                        });
                    });
                })
            })
        });
    });

    
});