describe('', ()=> {
    const startdate = '01.01.2025';
    const enddate = '03.03.2025';

    const buildingId = 6; // Hauptstelle Dresden, Bautzner Straße ab
    const floorId = 5; // 1. Obergeschoss - Hauptstelle Dresden, Bautzner Straße ab
    const roomRemark = 'testraum';
    const deskRemark1 = 'testdesk1';
    const imgSrc = '/Assets/Hauptstelle Dresden,  Bautzner Str.19ab/1. Obergeschoss.png';
    
    it('Simple series creation as admin', ()=>{
        const should = 62;
        cy.login(Cypress.env('TEST_ADMIN_MAIL'), Cypress.env('TEST_ADMIN_PW')).then(()=>{
            cy.rmAllRooms(buildingId, floorId, roomRemark, imgSrc).then(()=>{
                cy.addRoom(buildingId, floorId, roomRemark, imgSrc).then(()=>{
                    cy.addDesk(buildingId, floorId, roomRemark, imgSrc, deskRemark1).then(()=>{
                        //cy.logout().then(()=>{
                            cy.visit('/createseries').then(()=>{
                                cy.get('#root', { timeout: 10000 }).should('exist').then(()=>{
                                    cy.get('div#dates_label').should('exist').then(()=> {//cy.get('h1').should('exist').then(()=> {
                                        Cypress.Promise.all([
                                            cy.setStr('startDate', startdate),
                                            cy.setStr('endDate', enddate),
                                        ]).then(()=>{
                                            cy.get('div#dates_label').find('span').should('have.length', should).then(()=>{
                                                cy.get(`tr[id*="${deskRemark1}"`).find('button').click().then(()=>{
                                                    cy.get('.Toastify__toast').should('be.visible').should('include.text', 'Creation of series bookings from').should('include.text', 'was successful.').then(()=>{
                                                        cy.countBookings(roomRemark).should('equal', 62);
                                                    });
                                                })
                                            })
                                        })
                                    })
                                })
                            })
                        //})
                    });
                })
            })
        })
    });

    it('Simple series creation as user', ()=>{
        const should = 62;
        cy.login(Cypress.env('TEST_ADMIN_MAIL'), Cypress.env('TEST_ADMIN_PW')).then(()=>{
            cy.rmAllRooms(buildingId, floorId, roomRemark, imgSrc).then(()=>{
                cy.addRoom(buildingId, floorId, roomRemark, imgSrc).then(()=>{
                    cy.addDesk(buildingId, floorId, roomRemark, imgSrc, deskRemark1).then(()=>{
                        //cy.logout().then(()=>{
                            cy.login(Cypress.env('TEST_USER_MAIL'), Cypress.env('TEST_USER_PW')).then(()=>{
                                cy.visit('/createseries').then(()=>{
                                    cy.get('#root', { timeout: 10000 }).should('exist').then(()=>{
                                        cy.get('div#dates_label').should('exist').then(()=> {//cy.get('h1').should('exist').then(()=> {
                                            cy.get('div#div_createSeries_selectBuilding').click().then(()=>{
                                                cy.wait(8000).then(()=>{
                                                cy.get('li#createSeries_building_all').click().then(()=>{
                                                    Cypress.Promise.all([
                                                        cy.setStr('startDate', startdate),
                                                        cy.setStr('endDate', enddate),
                                                    ]).then(()=>{
                                                    
                                                        //cy.wait(2000).then(()=>{
                                                            cy.get('div#dates_label').find('span').should('have.length', should).then(()=>{
                                                                //cy.wait(8000).then(()=>{
                                                                    cy.get(`tr[id*="${deskRemark1}"`).find('button').click().then(()=>{
                                                                        cy.get('.Toastify__toast').should('be.visible').should('include.text', 'Creation of series bookings from').should('include.text', 'was successful.').then(()=>{
                                                                            cy.login(Cypress.env('TEST_ADMIN_MAIL'), Cypress.env('TEST_ADMIN_PW')).then(()=>{
                                                                                cy.countBookings(roomRemark).should('equal', 62);
                                                                            })
                                                                        });
                            
                                                                    })
                                                                //})
                                                            })
                                                        //})
                                                    })
                                                })
                                            })
                                            })
                                        })
                                    })
                                })
                            })
                        //})
                    });
                })
            })
        })
    });

    it('simple weekly series creation for wednesday', ()=>{
        const should = 9;
        cy.login(Cypress.env('TEST_ADMIN_MAIL'), Cypress.env('TEST_ADMIN_PW')).then(()=>{
            cy.rmAllRooms(buildingId, floorId, roomRemark, imgSrc).then(()=>{
                cy.addRoom(buildingId, floorId, roomRemark, imgSrc).then(()=>{
                    cy.addDesk(buildingId, floorId, roomRemark, imgSrc, deskRemark1).then(()=>{
                        cy.logout().then(()=>{
                            cy.login(Cypress.env('TEST_USER_MAIL'), Cypress.env('TEST_USER_PW')).then(()=>{
                                cy.visit('/createseries').then(()=>{
                                    cy.get('#root', { timeout: 10000 }).should('exist').then(()=>{
                                        cy.get('div#dates_label').should('exist').then(()=> {
                                            cy.get('div#div_createSeries_selectBuilding').click().then(()=>{
                                                cy.wait(8000).then(()=>{
                                                    cy.get('li#createSeries_building_all').click().then(()=>{
                                                        Cypress.Promise.all([
                                                            cy.setStr('startDate', startdate),
                                                            cy.setStr('endDate', enddate),
                                                            cy.setStr('frequence_select', 'weekly'),
                                                            cy.setStr('dayOfTheWeek_select', '2'), //mi
                                                            cy.setStr('startTime', '08:00:00'),
                                                            cy.setStr('endTime', '11:00:00')
                                                        ]).then(()=>{
                                                            cy.get('div#dates_label').find('span', { timeout: 20000 })
                                                                .should('have.length.greaterThan', 0)
                                                                .then(() => {
                                                                    cy.get('div#dates_label').find('span').should('have.length', should).then(()=>{
                                                                    cy.get(`tr[id*="${deskRemark1}"`).find('button').click().then(()=>{
                                                                        cy.get('.Toastify__toast').should('be.visible').should('include.text', 'Creation of series bookings from').should('include.text', 'was successful.').then(()=>{
                                                                            cy.login(Cypress.env('TEST_ADMIN_MAIL'), Cypress.env('TEST_ADMIN_PW')).then(()=>{
                                                                                cy.countBookings(roomRemark).then((cnt)=>{
                                                                                    cy.wrap(cnt).should('equal', should);
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
    
    it('simple monthly series creation for friday', ()=>{
        const should = 3;
        cy.login(Cypress.env('TEST_ADMIN_MAIL'), Cypress.env('TEST_ADMIN_PW')).then(()=>{
            cy.rmAllRooms(buildingId, floorId, roomRemark, imgSrc).then(()=>{
                cy.addRoom(buildingId, floorId, roomRemark, imgSrc).then(()=>{
                    cy.addDesk(buildingId, floorId, roomRemark, imgSrc, deskRemark1).then(()=>{
                        cy.logout().then(()=>{
                            cy.login(Cypress.env('TEST_USER_MAIL'), Cypress.env('TEST_USER_PW')).then(()=>{
                                cy.visit('/createseries').then(()=>{
                                    cy.get('#root', { timeout: 10000 }).should('exist').then(()=>{
                                        cy.get('div#dates_label').should('exist').then(()=> {
                                            cy.get('div#div_createSeries_selectBuilding').click().then(()=>{
                                                cy.wait(8000).then(()=>{
                                                    cy.get('li#createSeries_building_all').click().then(()=>{
                                                        Cypress.Promise.all([
                                                            cy.setStr('startDate', startdate),
                                                            cy.setStr('endDate', enddate),
                                                            cy.setStr('frequence_select', 'monthly'),
                                                            cy.setStr('dayOfTheWeek_select', '4'), //fr
                                                            cy.setStr('startTime', '15:30:00'),
                                                            cy.setStr('endTime', '18:00:00'),
                                                        ]).then(()=>{
                                                            cy.get('div#dates_label').find('span', { timeout: 20000 }).should('have.length.greaterThan', 0).then(() => {
                                                                cy.get('div#dates_label').find('span').should('have.length', should).then(()=>{
                                                                    cy.get(`tr[id*="${deskRemark1}"`).find('button').click().then(()=>{
                                                                        cy.get('.Toastify__toast').should('be.visible').should('include.text', 'Creation of series bookings from').should('include.text', 'was successful.').then(()=>{
                                                                            cy.login(Cypress.env('TEST_ADMIN_MAIL'), Cypress.env('TEST_ADMIN_PW')).then(()=>{
                                                                                cy.countBookings(roomRemark).then((cnt)=>{
                                                                                    cy.wrap(cnt).should('equal', should);
                                                                                })
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
                                })
                            })
                        });
                    })
                })
            })
        })
    })
    
    it('test for error if startdate > enddate', ()=>{
        const should = 1;
        cy.login(Cypress.env('TEST_ADMIN_MAIL'), Cypress.env('TEST_ADMIN_PW')).then(()=>{
            cy.rmAllRooms(buildingId, floorId, roomRemark, imgSrc).then(()=>{
                cy.addRoom(buildingId, floorId, roomRemark, imgSrc).then(()=>{
                    cy.addDesk(buildingId, floorId, roomRemark, imgSrc, deskRemark1).then(()=>{
                        cy.login(Cypress.env('TEST_USER_MAIL'), Cypress.env('TEST_USER_PW')).then(()=>{
                            cy.visit('/createseries').then(()=>{
                                cy.get('#root', { timeout: 10000 }).should('exist').then(()=>{
                                    cy.get('div#dates_label').should('exist').then(()=> {
                                        cy.get('div#dates_label').find('span', { timeout: 20000 }).should('have.length.greaterThan', 0).then(() => {
                                            cy.get('div#dates_label').find('span').should('have.length', should).then(()=>{
                                                cy.get('div#dates_label').should('exist').then(()=> {
                                                    Cypress.Promise.all([
                                                        cy.setStr('startDate', enddate),
                                                        cy.setStr('endDate', startdate)
                                                    ]).then(()=>{
                                                        cy.get('div#dates_label').find('span', { timeout: 20000 }).should('have.length.greaterThan', 0).then(() => {
                                                            cy.wait(2000).then(()=>{
                                                                cy.get('.Toastify__toast').should('be.visible').should('include.text', 'Start date must not be greater than the end date.');
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

    it('test for error if startime > endtime', ()=>{
        const should = 1;
        cy.login(Cypress.env('TEST_ADMIN_MAIL'), Cypress.env('TEST_ADMIN_PW')).then(()=>{
            cy.rmAllRooms(buildingId, floorId, roomRemark, imgSrc).then(()=>{
                cy.addRoom(buildingId, floorId, roomRemark, imgSrc).then(()=>{
                    cy.addDesk(buildingId, floorId, roomRemark, imgSrc, deskRemark1).then(()=>{
                        cy.login(Cypress.env('TEST_USER_MAIL'), Cypress.env('TEST_USER_PW')).then(()=>{
                            cy.visit('/createseries').then(()=>{
                                cy.get('#root', { timeout: 10000 }).should('exist').then(()=>{
                                    cy.get('div#dates_label').should('exist').then(()=> {
                                        cy.get('div#dates_label').find('span', { timeout: 20000 }).should('have.length.greaterThan', 0).then(() => {
                                            cy.get('div#dates_label').find('span').should('have.length', should).then(()=>{
                                                cy.get('div#dates_label').should('exist').then(()=> {
                                                    Cypress.Promise.all([
                                                        cy.setStr('startTime', '18:00:00'),
                                                        cy.setStr('endTime', '15:30:00'),
                                                    ]).then(()=>{
                                                        cy.wait(2000).then(()=>{
                                                            cy.get('.Toastify__toast').should('be.visible').should('include.text', 'Start time must not be greater than the end time.');
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

    it('too long duration', ()=>{
        const newStartdate = '02.04.2025';
        const newEnddate = '31.12.2026';
        cy.login(Cypress.env('TEST_USER_MAIL'), Cypress.env('TEST_USER_PW'))
        .visit('/createseries')
        .get('#root', { timeout: 10000 }).should('exist')
        .get('div#dates_label').should('exist')
        .get('div#div_createSeries_selectBuilding').click()
        .wait(4500)
        .setStr('startDate', newStartdate)
        .setStr('endDate', newEnddate)
        .get('.Toastify__toast').should('be.visible').contains('The duration of the series booking is too long.')
    });

    it('simple daily series creation for wednesday', ()=>{
        const should = 274;
        const newStartdate = '02.04.2025';
        const newEnddate = '31.12.2025';
        const start_timeslot = 8;
        //const end_timeslot = 16; 
        const end_timeslot = 11;
        const day = '2';
        const freq = 'daily';
        cy.login(Cypress.env('TEST_ADMIN_MAIL'), Cypress.env('TEST_ADMIN_PW'))
        .rmAllRooms(buildingId, floorId, roomRemark, imgSrc)
        .addRoom(buildingId, floorId, roomRemark, imgSrc)
        .addDesk(buildingId, floorId, roomRemark, imgSrc, deskRemark1)
        .logout()
        .login(Cypress.env('TEST_USER_MAIL'), Cypress.env('TEST_USER_PW'))
        .visit('/createseries')
        .get('#root', { timeout: 10000 }).should('exist')
        .get('div#dates_label').should('exist')
        .wait(1500)
        .get('div#div_createSeries_selectBuilding').click()
        .wait(8000)
        .get('li#createSeries_building_all').click()
        .setStr('startDate', newStartdate)
        .setStr('endDate', newEnddate)
        .setStr('frequence_select', freq)
        .setStr('dayOfTheWeek_select', day) //mi
        .setStr('startTime', '08:00:00')
        .setStr('endTime', '16:00:00')
        .get('div#dates_label').find('span', { timeout: 20000 }).should('have.length', should)
        .get(`tr[id*="${deskRemark1}"`).find('button').click()
        .get('.Toastify__toast').should('be.visible').should('include.text', 'Creation of series bookings from').should('include.text', 'was successful.')
        .login(Cypress.env('TEST_ADMIN_MAIL'), Cypress.env('TEST_ADMIN_PW'))
        .countBookings(roomRemark).then((cnt)=>{
            /* 
                Check for the count of bookings. 
            */
            cy.wrap(cnt).should('equal', should)
            /*
                Check if the particular desk is not available to normal bookings.
            */
            .login(Cypress.env('TEST_USER_MAIL'), Cypress.env('TEST_USER_PW'))
            .visit('/floor')
            .setFloor(buildingId, floorId, imgSrc)
            .get(`button#icon_button_${roomRemark}`).click()
            cy.wait(2000)
            .get('p').contains(`${deskRemark1}`).click({ force: true })
            .wait(2000)
            .selectTimeRange(start_timeslot, end_timeslot)
            .get('.Toastify__toast', { timeout: 20000 }).should('be.visible') .contains('This slot overlaps')   
            /*
                Also check if the particular desk is not available for serieses.
            */
            .visit('/createseries')
            .get('#root', { timeout: 10000 }).should('exist')
            .get('div#dates_label').should('exist')
            .get('div#div_createSeries_selectBuilding').click()
            .wait(8000)
            .get('li#createSeries_building_all').click()
            .setStr('startDate', newStartdate)
            .setStr('endDate', newEnddate)
            .setStr('frequence_select', freq)
            .setStr('dayOfTheWeek_select', day) //mi
            .setStr('startTime', '08:00:00')
            .setStr('endTime', '16:00:00')
            .get('div#dates_label').find('span', { timeout: 20000 }).should('have.length', should)
            .get(`tr[id*="${deskRemark1}"]`).should('not.exist');
        })
    });
});