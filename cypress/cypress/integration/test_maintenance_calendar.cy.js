describe('Maintenance Calendar', () => {
  const adminMail = Cypress.env('TEST_ADMIN_MAIL');
  const adminPw = Cypress.env('TEST_ADMIN_PW');
  const backendBaseUrl = (() => {
    const appUrl = new URL(Cypress.config('baseUrl'));
    return `${appUrl.protocol}//${appUrl.hostname}:8082`;
  })();
  const frozenNow = new Date(2026, 2, 18, 12, 0, 0).getTime();
  const todayKey = '2026-03-18';
  const futureDayKey = '2026-03-20';

  const parseBody = (body) => (typeof body === 'string' ? JSON.parse(body) : body);

  const buildDefect = (overrides = {}) => ({
    id: 9301,
    ticketNumber: 'DF-MAINT-001',
    status: 'IN_PROGRESS',
    urgency: 'HIGH',
    category: 'TECHNICAL_DEFECT',
    description: 'Maintenance calendar defect description long enough for testing.',
    reportedAt: '2026-03-16T09:00:00Z',
    reporter: {
      id: 1,
      name: 'Reporter',
      surname: 'User',
      email: 'reporter@example.com',
    },
    assignedTo: {
      id: 2,
      name: 'Service',
      surname: 'User',
      email: 'service@example.com',
    },
    desk: {
      id: 1901,
      remark: 'Desk 1901',
      room: {
        id: 93,
        remark: 'Room 93',
        floor: {
          id: 9,
          name: 'Floor 9',
          building: {
            id: 99,
            name: 'Building QA',
          },
        },
      },
      blocked: false,
      blockedByDefectId: null,
      blockedReasonCategory: null,
      blockedEstimatedEndDate: null,
      blockedEndDateTime: null,
      blockedByScheduledBlockingId: null,
    },
    room: {
      id: 93,
      remark: 'Room 93',
      floor: {
        id: 9,
        name: 'Floor 9',
        building: {
          id: 99,
          name: 'Building QA',
        },
      },
    },
    ...overrides,
  });

  const buildBlocking = (id, startDateTime, endDateTime, status = 'SCHEDULED') => ({
    id,
    startDateTime,
    endDateTime,
    status,
  });

  const openDefectsDashboard = () => {
    cy.url().should('include', '/home');
    cy.get('#sidebar_defects').should('exist').click({ force: true });
    cy.url().should('include', '/defects');
  };

  const openDefectFromList = (ticketNumber) => {
    cy.contains(ticketNumber, { timeout: 10000 }).should('be.visible').click({ force: true });
  };

  const openMaintenanceCalendar = ({ defect, countsByDay, scheduledBlockings }) => {
    cy.intercept('GET', /\/defects(\?.*)?$/, [defect]).as('getDefects');
    cy.intercept('GET', '**/desks', []).as('getDesks');
    cy.intercept('GET', `**/defects/${defect.id}`, defect).as('getMaintenanceDefect');
    cy.intercept('GET', `**/defects/${defect.id}/notes`, []).as('getNotes');
    cy.intercept('GET', `**/defects/${defect.id}/scheduled-blockings/counts*`, (req) => {
      req.reply({ statusCode: 200, body: countsByDay });
    }).as('getBlockingCounts');
    cy.intercept('GET', `**/defects/${defect.id}/scheduled-blockings`, (req) => {
      req.reply({ statusCode: 200, body: scheduledBlockings });
    }).as('getScheduledBlockings');

    openDefectsDashboard();
    openDefectFromList(defect.ticketNumber);
    cy.wait('@getNotes');

    cy.get('#defect_open_maintenance_calendar').should('be.visible').click({ force: true });
    cy.wait('@getBlockingCounts');

    cy.url().should('include', '/maintenance-calendar');
    cy.contains(/Maintenance Calendar|Wartungskalender/).should('be.visible');
  };

  const openMaintenanceCalendarDay = (dayKey) => {
    cy.get(`#maintenance_calendar_open_day_${dayKey}`).should('be.visible').click({ force: true });
    cy.wait('@getScheduledBlockings');
    cy.get('#maintenance_calendar_day_view').should('be.visible');
  };

  const dragCalendarSelection = (startSlot, slotSpan) => {
    cy.selectTimeRange(startSlot, startSlot + slotSpan);
  };

  const assertMonthCount = (dayKey, expectedCount) => {
    cy.get(`#maintenance_calendar_open_day_${dayKey}`)
      .parent()
      .invoke('text')
      .should('match', new RegExp(`:\\s*${expectedCount}\\b`));
  };

  const assertNoPendingBlockingSelection = () => {
    cy.get('.maintenance-calendar-selected-blocking').should('have.length', 0);
    cy.get('#maintenance_calendar_schedule_submit').should('be.disabled');
  };

  const submitSelectedBlocking = () => {
    cy.get('.maintenance-calendar-selected-blocking').should('have.length', 1);
    cy.get('#maintenance_calendar_schedule_submit').should('not.be.disabled').click({ force: true });
  };

  const assertSelectionCleared = () => {
    cy.get('.maintenance-calendar-selected-blocking').should('have.length', 0);
    cy.get('#maintenance_calendar_schedule_submit').should('be.disabled');
  };

  const loginAsAdmin = () => {
    cy.request('POST', `${backendBaseUrl}/users/login`, {
      email: adminMail,
      password: adminPw,
    }).then(({ body }) => {
      const accessToken = String(body.accessToken);
      const headers = JSON.stringify({
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      });

      cy.visit('/home', {
        onBeforeLoad(win) {
          win.sessionStorage.setItem('headers', headers);
          win.sessionStorage.setItem('accessToken', accessToken);
          win.localStorage.setItem('email', String(body.email));
          win.localStorage.setItem('userId', String(body.id));
          win.localStorage.setItem('name', String(body.name));
          win.localStorage.setItem('surname', String(body.surname));
          win.localStorage.setItem('admin', String(body.admin));
          win.localStorage.setItem('servicePersonnel', String(body.servicePersonnel));
          win.localStorage.setItem('visibility', String(body.visibility));
        },
      });
    });
  };

  beforeEach(() => {
    loginAsAdmin();
    cy.url().should('include', '/home');
    cy.clock(frozenNow, ['Date']);
  });

  it('opens the maintenance calendar from the defect drawer and renders month and day views', () => {
    const defect = buildDefect();
    const countsByDay = { [futureDayKey]: 2 };
    const scheduledBlockings = [
      buildBlocking(501, `${futureDayKey}T09:00:00`, `${futureDayKey}T10:00:00`, 'SCHEDULED'),
      buildBlocking(502, `${futureDayKey}T12:00:00`, `${futureDayKey}T13:00:00`, 'ACTIVE'),
    ];

    openMaintenanceCalendar({ defect, countsByDay, scheduledBlockings });

    cy.contains('Building QA / Floor 9 / Room 93 / Desk 1901').should('be.visible');
    assertMonthCount(futureDayKey, 2);

    openMaintenanceCalendarDay(futureDayKey);

    cy.get('#maintenance_calendar_selected_date').invoke('text').should('match', /20.*2026|March 20, 2026/);
    cy.get('.maintenance-calendar-existing-blocking').should('have.length', 2);
    cy.get('#maintenance_calendar_schedule_submit').should('be.disabled');
  });

  it('hides the maintenance calendar action for resolved defects', () => {
    const resolvedDefect = buildDefect({
      id: 9302,
      ticketNumber: 'DF-MAINT-RESOLVED',
      status: 'RESOLVED',
    });

    cy.intercept('GET', /\/defects(\?.*)?$/, [resolvedDefect]).as('getDefects');
    cy.intercept('GET', '**/desks', []).as('getDesks');
    cy.intercept('GET', `**/defects/${resolvedDefect.id}/notes`, []).as('getNotes');

    openDefectsDashboard();
    openDefectFromList(resolvedDefect.ticketNumber);
    cy.wait('@getNotes');
    cy.get('#defect_open_maintenance_calendar').should('not.exist');
  });

  it('prevents scheduling a blocking in the past', () => {
    const defect = buildDefect({ id: 9303, ticketNumber: 'DF-MAINT-PAST' });
    const countsByDay = { [todayKey]: 0 };
    const scheduledBlockings = [];
    let createCallCount = 0;

    cy.intercept('POST', `**/defects/${defect.id}/scheduled-blockings`, () => {
      createCallCount += 1;
    }).as('createBlocking');

    openMaintenanceCalendar({ defect, countsByDay, scheduledBlockings });
    openMaintenanceCalendarDay(todayKey);

    dragCalendarSelection(0, 1);

    assertNoPendingBlockingSelection();
    cy.then(() => {
      expect(createCallCount).to.equal(0);
    });
  });

  it('prevents too-short and overlapping selections without calling the API', () => {
    const defect = buildDefect({ id: 9304, ticketNumber: 'DF-MAINT-VALIDATION' });
    const countsByDay = { [futureDayKey]: 1 };
    const scheduledBlockings = [
      buildBlocking(601, `${futureDayKey}T09:00:00`, `${futureDayKey}T10:00:00`, 'SCHEDULED'),
    ];
    let createCallCount = 0;

    cy.intercept('POST', `**/defects/${defect.id}/scheduled-blockings`, () => {
      createCallCount += 1;
    }).as('createBlocking');

    openMaintenanceCalendar({ defect, countsByDay, scheduledBlockings });
    openMaintenanceCalendarDay(futureDayKey);

    dragCalendarSelection(7, 0.5);
    assertNoPendingBlockingSelection();

    dragCalendarSelection(3, 2);
    assertNoPendingBlockingSelection();

    cy.then(() => {
      expect(createCallCount).to.equal(0);
    });
  });

  it('retries scheduling with the retain-bookings action after a future-bookings conflict', () => {
    const defect = buildDefect({ id: 9305, ticketNumber: 'DF-MAINT-RETAIN' });
    const countsByDay = {};
    let scheduledBlockings = [];
    let createCallCount = 0;

    cy.intercept('POST', `**/defects/${defect.id}/scheduled-blockings`, (req) => {
      createCallCount += 1;
      const body = parseBody(req.body);

      if (createCallCount === 1) {
        expect(body.cancelFutureBookings).to.equal(null);
        req.reply({
          statusCode: 409,
          body: {
            code: 'FUTURE_BOOKINGS_EXIST',
            futureBookingCount: 3,
          },
        });
        return;
      }

      expect(body.cancelFutureBookings).to.equal(false);
      scheduledBlockings = [
        buildBlocking(701, body.startDateTime, body.endDateTime, 'SCHEDULED'),
      ];
      countsByDay[futureDayKey] = 1;
      req.reply({ statusCode: 201, body: { id: 701 } });
    }).as('createBlocking');

    openMaintenanceCalendar({ defect, countsByDay, scheduledBlockings });
    openMaintenanceCalendarDay(futureDayKey);

    dragCalendarSelection(4, 2);
    submitSelectedBlocking();

    cy.wait('@createBlocking');
    cy.get('#maintenance_calendar_future_bookings_dialog').should('be.visible');
    cy.contains(/3 future booking\(s\)|3 zukünftige Buchung\(en\)/).should('be.visible');

    cy.get('#maintenance_calendar_retain_bookings').click({ force: true });
    cy.wait('@createBlocking');
    cy.wait('@getScheduledBlockings');
    cy.wait('@getBlockingCounts');

    cy.assertToastOneOf([
      'Blocking scheduled successfully',
      'Sperrung erfolgreich geplant',
    ]);
    assertSelectionCleared();

    cy.get('#generic_back_button').click({ force: true });
    assertMonthCount(futureDayKey, 1);
  });

  it('retries scheduling with the cancel-bookings action after a future-bookings conflict', () => {
    const defect = buildDefect({ id: 9306, ticketNumber: 'DF-MAINT-CANCEL-BOOKINGS' });
    const countsByDay = {};
    let scheduledBlockings = [];
    let createCallCount = 0;

    cy.intercept('POST', `**/defects/${defect.id}/scheduled-blockings`, (req) => {
      createCallCount += 1;
      const body = parseBody(req.body);

      if (createCallCount === 1) {
        expect(body.cancelFutureBookings).to.equal(null);
        req.reply({
          statusCode: 409,
          body: {
            code: 'FUTURE_BOOKINGS_EXIST',
            futureBookingCount: 2,
          },
        });
        return;
      }

      expect(body.cancelFutureBookings).to.equal(true);
      scheduledBlockings = [
        buildBlocking(702, body.startDateTime, body.endDateTime, 'SCHEDULED'),
      ];
      countsByDay[futureDayKey] = 1;
      req.reply({ statusCode: 201, body: { id: 702 } });
    }).as('createBlocking');

    openMaintenanceCalendar({ defect, countsByDay, scheduledBlockings });
    openMaintenanceCalendarDay(futureDayKey);

    dragCalendarSelection(6, 2);
    submitSelectedBlocking();

    cy.wait('@createBlocking');
    cy.get('#maintenance_calendar_future_bookings_dialog').should('be.visible');
    cy.contains(/2 future booking\(s\)|2 zukünftige Buchung\(en\)/).should('be.visible');

    cy.get('#maintenance_calendar_cancel_bookings').click({ force: true });
    cy.wait('@createBlocking');
    cy.wait('@getScheduledBlockings');
    cy.wait('@getBlockingCounts');

    cy.assertToastOneOf([
      'Blocking scheduled successfully',
      'Sperrung erfolgreich geplant',
    ]);
    assertSelectionCleared();

    cy.get('#generic_back_button').click({ force: true });
    assertMonthCount(futureDayKey, 1);
  });

  it('cancels an existing scheduled blocking and refreshes the counts', () => {
    const defect = buildDefect({ id: 9307, ticketNumber: 'DF-MAINT-CANCEL' });
    const countsByDay = { [futureDayKey]: 1 };
    let scheduledBlockings = [
      buildBlocking(801, `${futureDayKey}T09:00:00`, `${futureDayKey}T10:00:00`, 'SCHEDULED'),
    ];

    cy.intercept('DELETE', `**/defects/${defect.id}/scheduled-blockings/801`, (req) => {
      scheduledBlockings = [];
      countsByDay[futureDayKey] = 0;
      req.reply({ statusCode: 204, body: {} });
    }).as('deleteBlocking');

    openMaintenanceCalendar({ defect, countsByDay, scheduledBlockings });
    openMaintenanceCalendarDay(futureDayKey);

    cy.get('.maintenance-calendar-existing-blocking').first().click({ force: true });
    cy.get('#maintenance_calendar_cancel_selected').should('exist').click({ force: true });

    cy.get('#maintenance_calendar_cancel_confirm_dialog').should('be.visible');
    cy.get('#maintenance_calendar_cancel_confirm_yes').click({ force: true });

    cy.wait('@deleteBlocking');
    cy.wait('@getScheduledBlockings');
    cy.wait('@getBlockingCounts');

    cy.assertToastOneOf([
      'Scheduled blocking cancelled',
      'Geplante Sperrung storniert',
    ]);

    cy.get('#generic_back_button').click({ force: true });
    assertMonthCount(futureDayKey, 0);
  });
});
