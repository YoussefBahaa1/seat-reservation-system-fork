describe('Test room properties', ()=>{
    const buildingId = 6; // Hauptstelle Dresden, Bautzner Straße ab
    const floorId = 5; // 1. Obergeschoss - Hauptstelle Dresden, Bautzner Straße ab
    const imgSrc = '/Assets/Hauptstelle Dresden,  Bautzner Str.19ab/1. Obergeschoss.png';
    const roomRemark = 'testraum';
    const roomType = 'silence';
    const roomStatus = 'disable'; 
    const roomRemarkNew = 'testraum2';
    const roomTypeNew = 'normal';
    const roomStatusNew = 'enable'; 
    it('Create room and change properties', ()=>{
        cy.login(Cypress.env('TEST_ADMIN_MAIL'), Cypress.env('TEST_ADMIN_PW'))
        .rmAllRooms(buildingId, floorId, roomRemarkNew, imgSrc)
        .rmAllRooms(buildingId, floorId, roomRemark, imgSrc)
        .addRoom(buildingId, floorId, roomRemark, imgSrc, roomType, roomStatus)
        .visit('/admin')
        .get('button#roomManagement').click()
        .get('button#editRoom').click()
        .setFloor(buildingId, floorId, imgSrc)
        .get(`button#icon_button_${roomRemark}`).click()
        .get('h2').contains(roomRemark).then(()=>{
            Cypress.Promise.all([
                cy.get('div#roomDefinition_setType').find('input').should('have.value', roomType),
                cy.get('div#roomDefinition_setStatus').find('input').should('have.value', roomStatus),
                cy.get('div#roomDefinition_setRemark').find('input').should('have.value', roomRemark)
            ]).then(()=>{
                Cypress.Promise.all([
                    cy.setStr('roomDefinition_setType', roomTypeNew),
                    cy.setStr('roomDefinition_setStatus', roomStatusNew),
                    cy.setStr('roomDefinition_setRemark', roomRemarkNew),
                ]).then(()=>{
                    cy.get('button#modal_submit').click()
                    .get('.Toastify__toast').should('be.visible').contains('Room was changed successfully')
                    .logout()
                    .login()
                    .visit('/admin')
                    .get('button#roomManagement').click()
                    .get('button#editRoom').click()
                    .setFloor(buildingId, floorId, imgSrc)
                    .get(`button#icon_button_${roomRemarkNew}`).click()
                    .get('h2').contains(roomRemarkNew).then(()=>{
                        Cypress.Promise.all([
                            cy.get('div#roomDefinition_setType').find('input').should('have.value', roomTypeNew),
                            cy.get('div#roomDefinition_setStatus').find('input').should('have.value', roomStatusNew),
                            cy.get('div#roomDefinition_setRemark').find('input').should('have.value', roomRemarkNew)
                        ]).then(()=>{
                            cy.rmRoom(buildingId, floorId, roomRemarkNew, imgSrc).then(()=>{
                                cy.wrap('1');
                            });
                        });
                    });
                });
            });
        });
    });
});