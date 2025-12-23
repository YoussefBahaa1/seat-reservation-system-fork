describe('', ()=> {   
    const buildingId = 6; // Hauptstelle Dresden, Bautzner Straße ab
    const floorId = 5; // 1. Obergeschoss - Hauptstelle Dresden, Bautzner Straße ab
    const roomRemark = 'testraum';
    const deskRemark1 = 'testdesk1';
    const imgSrc = '/Assets/Hauptstelle Dresden,  Bautzner Str.19ab/1. Obergeschoss.png';
    it('simple booking as admin', ()=>{
        const start_timeslot = 3;
        const end_timeslot = 10; 
        cy.login(Cypress.env('TEST_ADMIN_MAIL'), Cypress.env('TEST_ADMIN_PW'))
        .rmAllRooms(buildingId, floorId, roomRemark, imgSrc)
        .addRoom(buildingId, floorId, roomRemark, imgSrc)
        .addDesk(buildingId, floorId, roomRemark, imgSrc, deskRemark1)
        .addBooking(buildingId, floorId, roomRemark, imgSrc, deskRemark1, start_timeslot, end_timeslot)
        .countBookings(roomRemark).should('equal', 1);
    });

    it('simple booking as user', ()=>{
        const start_timeslot = 3;
        const end_timeslot = 10; 
        cy.login(Cypress.env('TEST_ADMIN_MAIL'), Cypress.env('TEST_ADMIN_PW'))
        .rmAllRooms(buildingId, floorId, roomRemark, imgSrc)
        .addRoom(buildingId, floorId, roomRemark, imgSrc)
        .addDesk(buildingId, floorId, roomRemark, imgSrc, deskRemark1)
        .login(Cypress.env('TEST_USER_MAIL'), Cypress.env('TEST_USER_PW'))
        .addBooking(buildingId, floorId, roomRemark, imgSrc, deskRemark1, start_timeslot, end_timeslot)
        .login(Cypress.env('TEST_ADMIN_MAIL'), Cypress.env('TEST_ADMIN_PW'))
        .countBookings(roomRemark).should('equal', 1);
    });

    it('two bookings', ()=>{
        const start_timeslot1 = 3;
        const end_timeslot1 = 10; 
        const start_timeslot2 = 12;
        const end_timeslot2 = 16; 
        
        cy.login(Cypress.env('TEST_ADMIN_MAIL'), Cypress.env('TEST_ADMIN_PW'))
        .rmAllRooms(buildingId, floorId, roomRemark, imgSrc)
        .addRoom(buildingId, floorId, roomRemark, imgSrc)
        .addDesk(buildingId, floorId, roomRemark, imgSrc, deskRemark1)
        .logout()
        .login(Cypress.env('TEST_USER_MAIL'), Cypress.env('TEST_USER_PW'))
        .addBooking(buildingId, floorId, roomRemark, imgSrc, deskRemark1, start_timeslot1, end_timeslot1)
        .addBooking(buildingId, floorId, roomRemark, imgSrc, deskRemark1, start_timeslot2, end_timeslot2)
        .login(Cypress.env('TEST_ADMIN_MAIL'), Cypress.env('TEST_ADMIN_PW'))
        .countBookings(roomRemark).should('equal', 2);
    });

    it('two bookings but overlapping', ()=>{
        const start_timeslot1 = 3;
        const end_timeslot1 = 10; 
        const start_timeslot2 = 8;
        const end_timeslot2 = 16; 
        
        cy.login(Cypress.env('TEST_ADMIN_MAIL'), Cypress.env('TEST_ADMIN_PW'))
        .rmAllRooms(buildingId, floorId, roomRemark, imgSrc)
        .addRoom(buildingId, floorId, roomRemark, imgSrc)
        .addDesk(buildingId, floorId, roomRemark, imgSrc, deskRemark1)
        .login(Cypress.env('TEST_USER_MAIL'), Cypress.env('TEST_USER_PW'))
        .addBooking(buildingId, floorId, roomRemark, imgSrc, deskRemark1, start_timeslot1, end_timeslot1)
        .visit('/floor')
        .setFloor(buildingId, floorId, imgSrc)
        .get(`button#icon_button_${roomRemark}`).click()
        .get('p').contains(`${deskRemark1}`).click({ force: true })
        .selectTimeRange(start_timeslot2, end_timeslot2)
        .get('.Toastify__toast').should('be.visible').contains('This slot overlaps with another booking for this desk').then(()=>{
                                                        return cy.wrap('1');
        });
    });
});