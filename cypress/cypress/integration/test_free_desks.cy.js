describe('Test the search utility for free desks', ()=> {
    const buildingId = 6; // Hauptstelle Dresden, Bautzner Straße ab
    const floorId = 5; // 1. Obergeschoss - Hauptstelle Dresden, Bautzner Straße ab
    const roomRemark = 'testraum';
    const deskRemark1 = 'testdesk1';
    const imgSrc = '/Assets/Hauptstelle Dresden,  Bautzner Str.19ab/1. Obergeschoss.png';
    
    const day = '01.01.2025';
    const day2 = '02.01.2025';
    const start = '08:30:00';
    const end = '14:15:00';

    it('simple booking on free desks as admin', () => {
        cy.login(Cypress.env('TEST_ADMIN_MAIL'), Cypress.env('TEST_ADMIN_PW'))
        .rmAllRooms(buildingId, floorId, roomRemark, imgSrc)
        .addRoom(buildingId, floorId, roomRemark, imgSrc)
        .addDesk(buildingId, floorId, roomRemark, imgSrc, deskRemark1)
        .visit('freeDesks').then(()=>{
            Cypress.Promise.all([
                cy.setStr('freeDesks_bookingDate', day),
                cy.setStr('freeDesks_startTime', start),
                cy.setStr('freeDesks_endTime', end)
            ]).then(()=>{
                cy.wait(1000)
                .get('div#freeDesks_selectBuilding').click()
                .get(`li#createSeries_building_${buildingId}`).click()
                .wait(5000)
                .get(`tr#freeDesks_${deskRemark1}`).should('exist').find('button').click()
                .get('.react-confirm-alert').should('be.visible').contains(deskRemark1).get('button').contains('Yes').click()
                .get('.Toastify__toast').should('be.visible').contains('Booking saved successfully')
                .countBookings(roomRemark).should('equal', 1).then(()=>{
                    return cy.wrap('1');
                })
            })
        })
    });

    it('simple booking on free desks as user', () => {
        cy.login()
        .login(Cypress.env('TEST_ADMIN_MAIL'), Cypress.env('TEST_ADMIN_PW'))
        .rmAllRooms(buildingId, floorId, roomRemark, imgSrc)
        .addRoom(buildingId, floorId, roomRemark, imgSrc)
        .addDesk(buildingId, floorId, roomRemark, imgSrc, deskRemark1)
        .login(Cypress.env('TEST_USER_MAIL'), Cypress.env('TEST_USER_PW'))
        .visit('freeDesks').then(()=>{
            Cypress.Promise.all([
                cy.setStr('freeDesks_bookingDate', day),
                cy.setStr('freeDesks_startTime', start),
                cy.setStr('freeDesks_endTime', end)
            ]).then(()=>{
                cy.wait(2000)
                .get('div#freeDesks_selectBuilding').click()
                .get(`li#createSeries_building_${buildingId}`).click()
                .wait(5000)
                .get(`tr#freeDesks_${deskRemark1}`).should('exist').find('button').click()
                .get('.react-confirm-alert').should('be.visible').contains(deskRemark1).get('button').contains('Yes').click()
                .get('.Toastify__toast').should('be.visible').contains('Booking saved successfully')
                .login(Cypress.env('TEST_ADMIN_MAIL'), Cypress.env('TEST_ADMIN_PW'))
                .countBookings(roomRemark).should('equal', 1).then(()=>{
                    return cy.wrap('1');
                })
            })
        })
    })

    it('two bookings on free desks as admin', () => {
        cy.login(Cypress.env('TEST_ADMIN_MAIL'), Cypress.env('TEST_ADMIN_PW'))
        .rmAllRooms(buildingId, floorId, roomRemark, imgSrc)
        .addRoom(buildingId, floorId, roomRemark, imgSrc)
        .addDesk(buildingId, floorId, roomRemark, imgSrc, deskRemark1)
        .visit('freeDesks').then(()=>{
            Cypress.Promise.all([
                cy.setStr('freeDesks_bookingDate', day),
                cy.setStr('freeDesks_startTime', start),
                cy.setStr('freeDesks_endTime', end)
            ]).then(()=>{
                cy.wait(1000)
                .get('div#freeDesks_selectBuilding').click()
                .get(`li#createSeries_building_${buildingId}`).click()
                .wait(5000)
                .get(`tr#freeDesks_${deskRemark1}`).should('exist').find('button').click()
                .get('.react-confirm-alert').should('be.visible').contains(deskRemark1).get('button').contains('Yes').click()
                .get('.Toastify__toast').should('be.visible').contains('Booking saved successfully')
                .get(`tr#freeDesks_${deskRemark1}`).should('not.exist')
                .setStr('freeDesks_bookingDate', day2)
                .get(`tr#freeDesks_${deskRemark1}`).should('exist').find('button').click()
                .countBookings(roomRemark).should('equal', 2).then(()=>{                  
                    return cy.wrap('1');
                })
            })
        })                  
    });

    it('two bookings on free desks as user', () => {
        cy.login(Cypress.env('TEST_ADMIN_MAIL'), Cypress.env('TEST_ADMIN_PW'))
        .rmAllRooms(buildingId, floorId, roomRemark, imgSrc)
        .addRoom(buildingId, floorId, roomRemark, imgSrc)
        .addDesk(buildingId, floorId, roomRemark, imgSrc, deskRemark1)
        .login(Cypress.env('TEST_USER_MAIL'), Cypress.env('TEST_USER_PW'))
        .visit('freeDesks').then(()=>{
            Cypress.Promise.all([
                cy.setStr('freeDesks_bookingDate', day),
                cy.setStr('freeDesks_startTime', start),
                cy.setStr('freeDesks_endTime', end)
            ]).then(()=>{
                cy.wait(2000) //!
                cy.get('div#freeDesks_selectBuilding').click()
                .get(`li#createSeries_building_${buildingId}`).click()
                .wait(5000)
                .get(`tr#freeDesks_${deskRemark1}`).should('exist').find('button').click()
                .get('.react-confirm-alert').should('be.visible').contains(deskRemark1).get('button').contains('Yes').click()
                .get('.Toastify__toast').should('be.visible').contains('Booking saved successfully')
                .get(`tr#freeDesks_${deskRemark1}`).should('not.exist')
                .setStr('freeDesks_bookingDate', day2)
                .get(`tr#freeDesks_${deskRemark1}`).should('exist').find('button').click()
                .login(Cypress.env('TEST_ADMIN_MAIL'), Cypress.env('TEST_ADMIN_PW'))
                cy.countBookings(roomRemark).should('equal', 2).then(()=>{              
                    return cy.wrap('1');
                })
            })
        })
    })                  
});