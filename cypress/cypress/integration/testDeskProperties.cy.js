describe('Test desk properties ', ()=> {

    const buildingId = 6; // Hauptstelle Dresden, Bautzner Straße ab
    const floorId = 5; // 1. Obergeschoss - Hauptstelle Dresden, Bautzner Straße ab
    const roomRemark = 'testraum';
    const newRoomRemark = roomRemark + 2;
    const deskRemark = 'testdesk1';
    const newDeskRemark = 'test_remark_desk' + 2;
    const imgSrc = '/Assets/Hauptstelle Dresden,  Bautzner Str.19ab/1. Obergeschoss.png';
    const equipment = 'withoutEquipment';
    const newEquipment = 'unknown';

    it('Create desk and change properties', ()=>{
        cy.login()
        // Setup
        .rmAllRooms(buildingId, floorId, roomRemark, imgSrc)
        .rmAllRooms(buildingId, floorId, newRoomRemark, imgSrc)
        .addRoom(buildingId, floorId, roomRemark, imgSrc)
        .addDesk(buildingId, floorId, roomRemark, imgSrc, deskRemark, equipment)
        .visit('/admin')
        // 1. check
        .get('button#roomManagement').click()
        .get('button#editWorkstation').click()
        .setFloor(buildingId, floorId, imgSrc)
        .get(`button#icon_button_${roomRemark}`).click()
        .get('div#deskSelector').click()
        .get('div').contains(`${deskRemark}`).click()
        .get('div#workstationDefinition_setEquipment').find('input').should('exist').should('have.value', equipment)
        .get('div#workStationDefinition_setRemark').find('input').should('exist').should('have.value', deskRemark)
        // 1. change
        .setStr('workstationDefinition_setEquipment', newEquipment)
        .setStr('workStationDefinition_setRemark', newDeskRemark)
        .get('button#modal_submit').click()
        .get('.Toastify__toast').should('be.visible').contains('Desk updated successfully')
        // 2. check
        .get('button#editWorkstation').click()
        .setFloor(buildingId, floorId, imgSrc)
        .get(`button#icon_button_${roomRemark}`).click()
        .get('div#deskSelector').click()
        .get('div').contains(`${newDeskRemark}`).click()
        .get('div#workstationDefinition_setEquipment').find('input').should('exist').should('have.value', newEquipment)
        .get('div#workStationDefinition_setRemark').find('input').should('exist').should('have.value', newDeskRemark)
        // 2. change
        .setStr('workstationDefinition_setEquipment', equipment)
        .setStr('workStationDefinition_setRemark', deskRemark)
        .get('button#modal_submit').click()
        .get('.Toastify__toast').should('be.visible').contains('Desk updated successfully')
        // 3. check
        .get('button#editWorkstation').click()
        .setFloor(buildingId, floorId, imgSrc)
        .get(`button#icon_button_${roomRemark}`).click()
        .get('div#deskSelector').click()
        .get('div').contains(deskRemark).click()
        .get('div#workstationDefinition_setEquipment').find('input').should('exist').should('have.value', equipment)
        .get('div#workStationDefinition_setRemark').find('input').should('exist').should('have.value', deskRemark)
        // 3. change
        .setStr('workstationDefinition_setEquipment', newEquipment)
        .setStr('workStationDefinition_setRemark', newDeskRemark)
        .get('button#modal_submit').click()
        .get('.Toastify__toast').should('be.visible').contains('Desk updated successfully')
        // Delete
        .rmDesk(buildingId, floorId, roomRemark, imgSrc, newDeskRemark)
        ;
    })

    it('test if normal user cannot access admin page', ()=>{
        cy.login(Cypress.env('TEST_USER_MAIL'), Cypress.env('TEST_USER_PW'))
        .visit('admin')
        .get('h1').contains('Error')
        .get('p').contains('You have no sufficient rights to see this page!')
        .get('button#generic_back_button').click()
        .url().should('include', '/home');
    });
});