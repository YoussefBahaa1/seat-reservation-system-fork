//Fake data and basic interactions for home day view tests.
describe('Home day view', () => {
  const roomsResponse = [
    { id: 1, remark: 'Zimmer 1.1' },
    { id: 2, remark: 'Zimmer 2.3' }
  ];
  const equipmentsResponse = [
    { id: 1, equipmentName: 'withEquipment' },
    { id: 2, equipmentName: 'withoutEquipment' }
  ];

  beforeEach(() => {
    cy.intercept('GET', '**/rooms', { statusCode: 200, body: roomsResponse }).as('getRooms');
    cy.intercept('GET', '**/equipments', { statusCode: 200, body: equipmentsResponse }).as('getEquipments');
    cy.intercept('GET', '**/bookings/day/**', { statusCode: 200, body: [] }).as('getBookingsDay');

    cy.login();
    cy.visit('/home');
    cy.wait(['@getRooms', '@getEquipments']);
  });

  //Ensure a day click triggers the lower list and hour rows are always present.
  it('loads the day list and shows hour rows from 06:00 to 20:00 after clicking a day', () => {
    cy.get('.rbc-day-bg:not(.rbc-off-range-bg)').first().click({ force: true });
    cy.wait('@getBookingsDay');

    cy.get('.rbc-day-bg.home-selected-day').should('have.length', 1);
    cy.get('.home-day-block-label').should('have.length', 15);
    cy.get('.home-day-block-label').first().should('contain', '06:00');
    cy.get('.home-day-block-label').last().should('contain', '20:00');
  });

  //Verify desk mode exposes Rooms and desk types filter groups.
  it('shows rooms and desk types filters in desk mode', () => {
    cy.get('.home-filter-select').click();
    cy.contains('Rooms').should('be.visible');
    cy.contains('Desk types').should('be.visible');
    cy.contains('Zimmer 1.1').should('be.visible');
    cy.contains('With equipment').should('be.visible');
  });

  //Verify parking mode hides Rooms and shows only Parking types.
  it('shows only parking types in parking mode', () => {
    cy.get('button[aria-label="Switch to parking"]').click();
    cy.get('.home-filter-select').click();

    cy.contains('Rooms').should('not.exist');
    cy.contains('Parking types').should('be.visible');
    cy.contains('Zimmer 1.1').should('not.exist');
    cy.contains('With equipment').should('not.exist');
  });
});

//Create a room and desk, add a booking, and verify it appears under the correct hour row.
describe('Home day view with bookings', () => {
  const day = '05';
  const month = 'February';
  const year = '2026';
  const date = '05.02.2026';
  const buildingId = 6;
  const floorId = 5;
  const roomRemark = 'testraum-home-day';
  const deskRemark = 'testdesk-home-day';
  const imgSrc = '/Assets/Hauptstelle Dresden,  Bautzner Str.19ab/1. Obergeschoss.png';
  const startTimeslot = 3;
  const endTimeslot = 9;

  const months = [
    'January', 'February', 'March', 'April',
    'May', 'June', 'July', 'August',
    'September', 'October', 'November', 'December'
  ];

  const navigateToMonthYear = (targetMonth, targetYear) => {
    cy.get('span.rbc-toolbar-label').then(($el) => {
      const [currMonth, currYear] = $el.text().split(' ');
      const diffYears = Number(targetYear) - Number(currYear);
      const buttonPushes =
        diffYears * 12 + (months.indexOf(targetMonth) - months.indexOf(currMonth));
      const buttonText = buttonPushes > 0 ? 'Next' : 'Back';
      for (let i = 0; i < Math.abs(buttonPushes); i += 1) {
        cy.contains('button', buttonText).click();
      }
    });
  };

  before(() => {
    cy.login(Cypress.env('TEST_ADMIN_MAIL'), Cypress.env('TEST_ADMIN_PW'))
      .rmAllRooms(buildingId, floorId, roomRemark, imgSrc)
      .addRoom(buildingId, floorId, roomRemark, imgSrc)
      .addDesk(buildingId, floorId, roomRemark, imgSrc, deskRemark);
  });

  //Create a booking and checks it renders under the hour row that matches its begin time.
  it('shows a booking under the correct hour row', () => {
    cy.login(Cypress.env('TEST_USER_MAIL'), Cypress.env('TEST_USER_PW'))
      .then(() =>
        cy.addBookingOnDate(
          day,
          month,
          year,
          buildingId,
          floorId,
          roomRemark,
          deskRemark,
          imgSrc,
          startTimeslot,
          endTimeslot
        )
      );

    cy.window().then((win) => {
      const token = win.sessionStorage.getItem('accessToken');
      expect(token, 'access token').to.exist;

      cy.request({
        method: 'GET',
        url: `/bookings/day/${date}`,
        headers: {
          Authorization: `Bearer ${token}`,
        },
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.eq(200);
        expect(resp.body).to.be.an('array');
        const event = resp.body.find((item) => item.deskRemark === deskRemark);
        expect(event, 'created booking event').to.exist;
        const eventHour = String(event.begin || '').slice(0, 2);

        cy.visit('/home');
        navigateToMonthYear(month, year);
        cy.get('div.rbc-day-bg').eq(Number(day) - 1).click({ force: true });

        cy.contains('.home-day-event', deskRemark)
          .closest('.home-day-block')
          .find('.home-day-block-label')
          .should('contain', `${eventHour}:00`);
      });
    });
  });
});