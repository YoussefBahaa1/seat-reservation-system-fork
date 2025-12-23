describe('', ()=> {   
    const day='05';
    const month='February';
    const year='2026'
    const buildingId = 6; // Hauptstelle Dresden, Bautzner Straße ab
    const floorId = 5; // 1. Obergeschoss - Hauptstelle Dresden, Bautzner Straße ab
    const roomRemark = 'testraum';
    const deskRemark = 'testdesk1';
    const imgSrc = '/Assets/Hauptstelle Dresden,  Bautzner Str.19ab/1. Obergeschoss.png';
    const start_timeslot = 3;
    const end_timeslot = 25; 


      


    it('', ()=>{
        cy.login(Cypress.env('TEST_ADMIN_MAIL'), Cypress.env('TEST_ADMIN_PW'))
        .rmAllRooms(buildingId, floorId, roomRemark, imgSrc)
        .addRoom(buildingId, floorId, roomRemark, imgSrc)
        .addDesk(buildingId, floorId, roomRemark, imgSrc, deskRemark)

        .login(Cypress.env('TEST_USER_MAIL'), Cypress.env('TEST_USER_PW')).then(()=>{
            cy.addBookingOnDate(day,month,year, buildingId, floorId, roomRemark, deskRemark, imgSrc, start_timeslot, end_timeslot)
            .login(Cypress.env('TEST_ADMIN_MAIL'), Cypress.env('TEST_ADMIN_PW'))
            .countBookings(roomRemark).should('equal',1);
        })
            
    })
   
});