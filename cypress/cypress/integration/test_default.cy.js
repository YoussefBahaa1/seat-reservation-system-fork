describe('', ()=>{
    const pw1 = Cypress.env('TEST_USER_PW');
    const vorname1 = 'max';
    const nachname = 'mustermann';
    const mail = 'foo@lit.justiz.sachsen.de'
    const building = 'Außenstelle Chemnitz';
    const floor = '4. Dachgeschoss';
    beforeEach(()=>{
        cy.login().then(()=>{
            cy.getAmountOfUsersForMail(mail).then((ret)=>{
                if (ret > 0) {
                    cy.deleteUser(mail).then(()=>{})
                }
                cy.addUser(mail, pw1, vorname1, nachname).then(()=>{return;});
            })
        });
    })

    it('check if every floor loads correctly', ()=>{
        cy.login(Cypress.env('mail'), Cypress.env('TEST_USER_PW')).then(()=>{
            cy.visit('/floor').then(()=>{
                cy.get('img').should('exist').should('have.attr', 'src').and('include', 'Zwickau').then(()=>{
                    cy.setFloor(7,1,'Hauptstelle Dresden,  Bautzner Str.19c/1. Obergeschoss.png').then(()=>{
                        cy.setFloor(7,2,'Hauptstelle Dresden,  Bautzner Str.19c/2. Obergeschoss.png').then(()=>{
                            cy.setFloor(7,3,'Hauptstelle Dresden,  Bautzner Str.19c/3. Obergeschoss.png').then(()=>{
                                cy.setFloor(6,4,'Hauptstelle Dresden,  Bautzner Str.19ab/Erdgeschoss.png').then(()=>{
                                    cy.setFloor(6,5,'Hauptstelle Dresden,  Bautzner Str.19ab/1. Obergeschoss.png').then(()=>{
                                        cy.setFloor(1,6,'Außenstelle Zwickau/Dachgeschoss.png').then(()=>{
                                            cy.setFloor(2,7,'Außenstelle Chemnitz/2. Dachgeschoss.png').then(()=>{
                                                cy.setFloor(2,8,'Außenstelle Chemnitz/4. Dachgeschoss.png').then(()=>{
                                                    cy.setFloor(3,9,'Außenstelle Leipzig/2. Dachgeschoss.png').then(()=>{
                                                        cy.setFloor(4,10,'Außenstelle Bautzen/1. Dachgeschoss.png').then(()=>{
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
    it('test set the default building and floor as normal user', ()=>{
        cy.login(mail, Cypress.env('TEST_USER_PW')).then(()=>{
            cy.get('a#sidebar_settings0').click().then(()=>{
                cy.get('a#sidebar_defaults').should('exist').click().then(()=>{
                    // Check if default viewMode is week that has the id 2.
                    cy.get('div#formcontrol_defaultView input').should('have.value', '2').then(()=>{
                        // Change the viewMode to day that has the id 1.
                        cy.get('div#formcontrol_defaultView').click().then(()=>{
                            cy.get('li#view_1').click().then(()=>{
                                // Check if viewMode is day that has the id 1.
                                cy.get('div#formcontrol_defaultView input').should('have.value', '1').then(()=>{
                                    cy.get('div#settings_floorSelector_setBuilding').click().then(()=>{
                                        cy.get('li#settings_building_2').click().then(()=>{
                                            cy.get('div#settings_floorSelector_setFloor').click().then(()=>{
                                                cy.get('li#settings_floor_8').click().then(()=>{
                                                    cy.get('button#modal_submit').click().then(()=>{
                                                        cy.get('.Toastify__toast').should('be.visible').contains('Settings successful updated.').then(()=>{
                                                            cy.logout().then(()=>{
                                                                cy.login(mail, pw1).then(()=>{
                                                                    cy.get('a#sidebar_settings0').should('exist').click().then(()=>{
                                                                        // Check default floor.
                                                                        cy.visit('/floor').then(()=>{
                                                                            cy.get('div#Floor_FloorImage_select-building').should('have.text', building).then(()=>{
                                                                                cy.get('div#Floor_FloorImage_select-floor').should('have.text', floor).then(()=>{
                                                                                    // Check default viewmode.
                                                                                    cy.visit('/mybookings').then(()=>{
                                                                                        cy.contains('button', 'Day').should('have.class', 'rbc-active').then(()=>{
                                                                                            cy.wrap('1');                     
                                                                                        })
                                                                                    })                                              
                                                                                })
                                                                            });
                                                                        })
                                                                    });
                                                                });
                                                            });                                        
                                                        });
                                                    });                                
                                                });
                                            });
                                        });
                                    })
                                })  
                            })                        
                        })
                    })
                });
            })
        });
    })
})