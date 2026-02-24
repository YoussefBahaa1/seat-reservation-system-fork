describe('Defect management and service personnel features', () => {
  const password = Cypress.env('TEST_USER_PW');
  const unique = Date.now();

  const serviceUser = {
    email: `cypress.service.${unique}@lit.justiz.sachsen.de`,
    name: 'Service',
    surname: 'Tester',
  };

  const employeeUser = {
    email: `cypress.employee.${unique}@lit.justiz.sachsen.de`,
    name: 'Employee',
    surname: 'Tester',
  };

  const deleteUserIfExists = (mail) => {
    return cy.getAmountOfUsersForMail(mail).then((count) => {
      if (count > 0) {
        return cy.deleteUser(mail, true);
      }
      return cy.wrap(null);
    });
  };

  const createUserWithRole = (user, role) => {
    return deleteUserIfExists(user.email).then(() => {
      return cy.addUser(user.email, password, user.name, user.surname, {
        department: 'QA',
        role,
      });
    });
  };

  const closeTopModalIfPresent = () => {
    cy.get('body').then(($body) => {
      if ($body.find('button#modal_close').length > 0) {
        cy.get('button#modal_close').last().click({ force: true });
      }
    });
  };

  const assertOnlyRoleChecked = (containerSelector, index) => {
    cy.get(`${containerSelector} input[type="checkbox"]:checked`).should('have.length', 1);
    cy.get(`${containerSelector} input[type="checkbox"]`).eq(index).should('be.checked');
  };

  const containsOneOf = (patterns) => {
    const regex = new RegExp(patterns.join('|'));
    return cy.contains(regex);
  };

  const openDefectsDashboard = () => {
    cy.visit('/home');
    cy.get('#sidebar_defects').should('exist').click({ force: true });
    cy.url().should('include', '/defects');
  };

  const openFreeDesks = () => {
    cy.visit('/home');
    cy.get('#sidebar_search0').click({ force: true });
    cy.get('#sidebar_freeDesks').should('exist').click({ force: true });
    cy.url().should('match', /\/freeDesks|\/freedesks/);
  };

  const navigateClientSide = (path) => {
    cy.window().then((win) => {
      win.history.pushState({}, '', path);
      win.dispatchEvent(new win.PopStateEvent('popstate'));
    });
  };

  const selectComboboxOption = (index, optionRegex, scope = 'body') => {
    cy.get(scope).find('[role="combobox"]').eq(index).click({ force: true });
    cy.contains('li', optionRegex).click({ force: true });
  };

  const setNativeInputValue = (selector, value) => {
    cy.get(selector).first().should('be.visible').then(($input) => {
      const input = $input[0];
      const view = input.ownerDocument.defaultView;
      const nativeSetter = Object.getOwnPropertyDescriptor(
        view.HTMLInputElement.prototype,
        'value'
      ).set;

      nativeSetter.call(input, value);
      input.dispatchEvent(new view.Event('input', { bubbles: true }));
      input.dispatchEvent(new view.Event('change', { bubbles: true }));
    });
  };

  const buildDefect = (id, ticketNumber, overrides = {}) => ({
    id,
    ticketNumber,
    status: 'NEW',
    urgency: 'HIGH',
    category: 'TECHNICAL_DEFECT',
    description: 'Defect description long enough for testing.',
    reportedAt: '2026-02-20T10:00:00Z',
    reporter: {
      id: 1,
      name: 'Reporter',
      surname: 'User',
      email: 'reporter@example.com',
    },
    assignedTo: null,
    desk: {
      id: 301,
      remark: 'Desk 301',
      workstationIdentifier: 'WS-301',
      room: {
        id: 21,
        remark: 'Room A',
      },
      blocked: false,
      blockedByDefectId: null,
      blockedReasonCategory: null,
      blockedEstimatedEndDate: null,
    },
    room: {
      id: 21,
      remark: 'Room A',
    },
    ...overrides,
  });

  before(() => {
    expect(password, 'TEST_USER_PW must be configured').to.be.a('string').and.not.be.empty;

    return cy.login(Cypress.env('TEST_ADMIN_MAIL'), Cypress.env('TEST_ADMIN_PW')).then(() => {
      return createUserWithRole(serviceUser, 'SERVICE_PERSONNEL').then(() => {
        return createUserWithRole(employeeUser, 'EMPLOYEE');
      });
    });
  });

  after(() => {
    return cy.login(Cypress.env('TEST_ADMIN_MAIL'), Cypress.env('TEST_ADMIN_PW')).then(() => {
      return deleteUserIfExists(serviceUser.email).then(() => {
        return deleteUserIfExists(employeeUser.email);
      });
    });
  });

  it('keeps exactly one role selected in Add User modal', () => {
    cy.login(Cypress.env('TEST_ADMIN_MAIL'), Cypress.env('TEST_ADMIN_PW'));
    cy.visit('/admin');
    cy.get('button#userManagement').click();
    cy.clickFirst(['button#addUser', 'button#addEmployee']);

    assertOnlyRoleChecked('#addUser-roles', 2);

    cy.get('#addUser-roles input[type="checkbox"]').eq(0).click({ force: true });
    assertOnlyRoleChecked('#addUser-roles', 0);

    cy.get('#addUser-roles input[type="checkbox"]').eq(1).click({ force: true });
    assertOnlyRoleChecked('#addUser-roles', 1);

    cy.get('#addUser-roles input[type="checkbox"]').eq(2).click({ force: true });
    assertOnlyRoleChecked('#addUser-roles', 2);

    closeTopModalIfPresent();
  });

  it('keeps exactly one role selected in Edit User modal', () => {
    cy.login(Cypress.env('TEST_ADMIN_MAIL'), Cypress.env('TEST_ADMIN_PW'));
    cy.visit('/admin');
    cy.get('button#userManagement').click();
    cy.clickFirst(['button#editUser', 'button#editEmployee']);
    cy.filterUsersByEmail(serviceUser.email);

    cy.get(`[id="${serviceUser.email}"]`).find('button').first().click({ force: true });

    assertOnlyRoleChecked('#editUser-roles', 1);

    cy.get('#editUser-roles input[type="checkbox"]').eq(0).click({ force: true });
    assertOnlyRoleChecked('#editUser-roles', 0);

    cy.get('#editUser-roles input[type="checkbox"]').eq(2).click({ force: true });
    assertOnlyRoleChecked('#editUser-roles', 2);

    cy.get('#editUser-roles input[type="checkbox"]').eq(1).click({ force: true });
    assertOnlyRoleChecked('#editUser-roles', 1);

    closeTopModalIfPresent();
    closeTopModalIfPresent();
  });

  it('allows service personnel to access employee features and defect dashboard, but not admin panel', () => {
    cy.login(serviceUser.email, password);

    cy.get('#sidebar_calendar').should('exist');
    cy.get('#sidebar_bookings').should('exist');
    cy.get('#sidebar_search0').should('exist');
    cy.get('#sidebar_defects').should('exist');
    cy.get('#sidebar_admin').should('not.exist');

    cy.intercept('GET', /\/defects(\?.*)?$/, []).as('serviceDefects');
    cy.intercept('GET', '**/desks', []).as('serviceDesks');
    cy.intercept('GET', '**/rooms', []).as('serviceRooms');

    openDefectsDashboard();
    cy.wait('@serviceDefects');
    cy.url().should('include', '/defects');

    navigateClientSide('/admin');
    cy.url().should('include', '/home');
  });

  it('prevents employees from accessing defect dashboard', () => {
    cy.login(employeeUser.email, password);

    cy.get('#sidebar_calendar').should('exist');
    cy.get('#sidebar_defects').should('not.exist');
    cy.get('#sidebar_admin').should('not.exist');

    cy.visit('/home');
    navigateClientSide('/defects');
    cy.url().should('include', '/home');
  });

  it('allows admins to access both admin panel and defect dashboard', () => {
    cy.login(Cypress.env('TEST_ADMIN_MAIL'), Cypress.env('TEST_ADMIN_PW'));

    cy.get('#sidebar_admin').should('exist');
    cy.get('#sidebar_defects').should('exist');

    cy.intercept('GET', /\/defects(\?.*)?$/, []).as('adminDefects');
    cy.intercept('GET', '**/desks', []).as('adminDesks');
    cy.intercept('GET', '**/rooms', []).as('adminRooms');

    openDefectsDashboard();
    cy.wait('@adminDefects');
    cy.url().should('include', '/defects');

    cy.get('#sidebar_admin').click({ force: true });
    cy.url().should('include', '/admin');
  });

  it('reports defects from free desks and handles duplicate active defect guard', () => {
    cy.login(serviceUser.email, password);

    const freeDesk = {
      id: 8801,
      remark: 'DeskFD1',
      equipment: { equipmentName: 'withEquipment' },
      room: {
        id: 91,
        remark: 'Room FD',
        floor: {
          id: 911,
          name: 'Floor FD',
          building: { id: 912, name: 'Building FD' },
        },
      },
    };

    cy.intercept('GET', '**/buildings/all', [
      { id: 912, name: 'Building FD' },
    ]).as('getBuildings');
    cy.intercept('GET', '**/defaults/getDefaultFloorForUserId/*', {
      statusCode: 200,
      body: {},
    }).as('getDefaultFloor');
    cy.intercept('POST', '**/series/desksForDatesAndTimes', [freeDesk]).as('getPossibleDesks');

    let activeCheckCount = 0;
    cy.intercept('GET', '**/defects/active?deskId=8801', (req) => {
      activeCheckCount += 1;
      if (activeCheckCount === 1) {
        req.reply({ statusCode: 404, body: {} });
        return;
      }
      req.reply({ statusCode: 200, body: { id: 777 } });
    }).as('activeDefectCheck');

    cy.intercept('POST', '**/defects', (req) => {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      expect(body.deskId).to.equal(8801);
      expect(body.category).to.equal('TECHNICAL_DEFECT');
      expect(body.urgency).to.equal('LOW');
      expect(body.description.length).to.be.gte(20);
      req.reply({ statusCode: 200, body: {} });
    }).as('createDefect');

    openFreeDesks();
    cy.wait('@getPossibleDesks');

    cy.get('#freeDesks_DeskFD1').within(() => {
      cy.contains('button', /Report Defect|Defekt melden/).click({ force: true });
    });
    cy.wait('@activeDefectCheck');

    cy.get('.MuiDialog-root').should('be.visible');
    selectComboboxOption(0, /Technical|Technisch/, '.MuiDialog-root');
    selectComboboxOption(1, /Low|Niedrig/, '.MuiDialog-root');
    cy.get('.MuiDialog-root textarea:visible')
      .first()
      .clear({ force: true })
      .type('too short', { force: true });
    cy.get('.MuiDialog-root #modal_submit').click({ force: true });
    cy.assertToastOneOf([
      'Description must be at least 20 characters',
      'Beschreibung muss mindestens 20 Zeichen lang sein',
    ]);

    cy.get('.MuiDialog-root textarea:visible')
      .first()
      .clear({ force: true })
      .type('This is a valid defect description for Cypress test.', { force: true });
    cy.get('.MuiDialog-root #modal_submit').click({ force: true });
    cy.wait('@createDefect');
    cy.assertToastOneOf(['Defect reported successfully', 'Defekt erfolgreich gemeldet']);

    cy.get('#freeDesks_DeskFD1').within(() => {
      cy.contains('button', /Report Defect|Defekt melden/).click({ force: true });
    });
    cy.wait('@activeDefectCheck');
    cy.assertToastOneOf([
      'Active defect already exists for this workstation',
      'Für diesen Arbeitsplatz existiert bereits ein aktiver Defekt',
    ]);
  });

  it('supports all/mine/history sections and history workstation filtering', () => {
    cy.login(serviceUser.email, password);

    const allDefect = buildDefect(1001, 'DF-ALL-001');
    const historyDefect = buildDefect(2001, 'DF-HISTORY-001', {
      desk: {
        id: 301,
        remark: 'Desk 301',
        workstationIdentifier: 'WS-301',
        room: { id: 21, remark: 'Room A' },
        blocked: false,
        blockedByDefectId: null,
      },
    });

    cy.intercept('GET', /\/defects(\?.*)?$/, (req) => {
      const requestUrl = new URL(req.url);
      const deskId = requestUrl.searchParams.get('deskId');
      const assignedToMe = requestUrl.searchParams.get('assignedToMe');

      if (deskId === '301') {
        req.alias = 'getDefectsHistory';
        req.reply([historyDefect]);
        return;
      }

      if (assignedToMe === 'true') {
        req.alias = 'getDefectsMine';
        req.reply([]);
        return;
      }

      req.alias = 'getDefectsAll';
      req.reply([allDefect]);
    });

    cy.intercept('GET', '**/desks', [
      {
        id: 301,
        workstationIdentifier: 'WS-301',
        remark: 'Desk 301',
        room: { id: 21, remark: 'Room A' },
      },
    ]).as('getDesks');

    cy.intercept('GET', '**/rooms', [
      { id: 21, remark: 'Room A' },
    ]).as('getRooms');

    openDefectsDashboard();
    cy.wait('@getDefectsAll');
    cy.contains('DF-ALL-001').should('be.visible');

    cy.get('button[value="mine"]').click({ force: true });
    cy.wait('@getDefectsMine');
    containsOneOf([
      'You currently have no active assigned defects',
      'Sie haben aktuell keine aktiv zugewiesenen Defekte',
    ]).should('be.visible');

    cy.get('button[value="history"]').click({ force: true });
    containsOneOf([
      'Select a workstation to view defect history',
      'Wählen Sie einen Arbeitsplatz aus, um die Defekthistorie anzuzeigen',
    ]).should('be.visible');

    cy.get('div[role="combobox"]').first().click({ force: true });
    cy.contains('li', 'Room A — WS-301').click({ force: true });

    cy.wait('@getDefectsHistory');
    cy.contains('DF-HISTORY-001').should('be.visible');

    cy.get('button[value="kanban"]').click({ force: true });
    cy.contains('DF-HISTORY-001').should('be.visible');
  });

  it('applies defect filters and age constraints in the dashboard', () => {
    cy.login(serviceUser.email, password);

    const nowIso = new Date().toISOString();
    const threeDaysAgoIso = new Date(Date.now() - (3 * 24 * 60 * 60 * 1000)).toISOString();
    const defectNew = buildDefect(1101, 'DF-FILTER-NEW', {
      urgency: 'LOW',
      status: 'NEW',
      room: { id: 21, remark: 'Room A' },
      reportedAt: nowIso,
    });
    const defectOld = buildDefect(1102, 'DF-FILTER-OLD', {
      urgency: 'HIGH',
      status: 'IN_PROGRESS',
      room: { id: 21, remark: 'Room A' },
      reportedAt: threeDaysAgoIso,
    });

    cy.intercept('GET', /\/defects(\?.*)?$/, [defectNew, defectOld]).as('getDefects');
    cy.intercept('GET', '**/desks', []).as('getDesks');
    cy.intercept('GET', '**/rooms', [{ id: 21, remark: 'Room A' }]).as('getRooms');

    openDefectsDashboard();
    cy.wait('@getDefects');
    cy.contains('DF-FILTER-NEW').should('be.visible');
    cy.contains('DF-FILTER-OLD').should('be.visible');

    selectComboboxOption(0, /High|Hoch/);
    cy.wait('@getDefects').its('request.url').should('include', 'urgency=HIGH');

    selectComboboxOption(2, /In Progress|In Bearbeitung/);
    cy.wait('@getDefects').its('request.url').should('include', 'status=IN_PROGRESS');

    selectComboboxOption(3, /Room A/);
    cy.wait('@getDefects').its('request.url').should('include', 'roomId=21');

    cy.get('input[type="number"]').eq(0).clear().type('2');
    cy.wait('@getDefects');
    cy.contains('DF-FILTER-OLD').should('be.visible');
    cy.contains('DF-FILTER-NEW').should('not.exist');
  });

  it('supports status transitions from details drawer and kanban quick actions', () => {
    cy.login(serviceUser.email, password);

    let currentStatus = 'NEW';
    const getStatusDefect = () => buildDefect(710, 'DF-STATUS-001', { status: currentStatus });

    cy.intercept('GET', /\/defects(\?.*)?$/, (req) => {
      req.reply([getStatusDefect()]);
    }).as('getDefects');
    cy.intercept('GET', '**/desks', []).as('getDesks');
    cy.intercept('GET', '**/rooms', []).as('getRooms');
    cy.intercept('GET', '**/defects/710', (req) => {
      req.reply(getStatusDefect());
    }).as('getDefectDetails');
    cy.intercept('GET', '**/defects/710/notes', []).as('getNotes');

    cy.intercept('PUT', '**/defects/710/status', (req) => {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      currentStatus = body.status;
      req.reply({ statusCode: 200, body: {} });
    }).as('statusUpdate');

    openDefectsDashboard();
    cy.wait('@getDefects');

    cy.contains('DF-STATUS-001').click({ force: true });
    cy.wait('@getNotes');
    cy.contains('button', /In Progress|In Bearbeitung/).click({ force: true });
    cy.wait('@statusUpdate').then((interception) => {
      const body = typeof interception.request.body === 'string'
        ? JSON.parse(interception.request.body)
        : interception.request.body;
      expect(body.status).to.equal('IN_PROGRESS');
    });

    cy.get('body').type('{esc}');
    cy.get('button[value="kanban"]').click({ force: true });
    cy.contains('DF-STATUS-001')
      .closest('.MuiPaper-root')
      .within(() => {
        cy.contains('button', /Resolved|Gelöst/).click({ force: true });
      });

    cy.wait('@statusUpdate').then((interception) => {
      const body = typeof interception.request.body === 'string'
        ? JSON.parse(interception.request.body)
        : interception.request.body;
      expect(body.status).to.equal('RESOLVED');
    });
  });

  it('shows future booking count from block 409 payload and retries with retain action', () => {
    cy.login(serviceUser.email, password);

    const blockDefect = buildDefect(501, 'DF-BLOCK-001', {
      status: 'IN_PROGRESS',
      desk: {
        id: 401,
        remark: 'Desk 401',
        workstationIdentifier: 'WS-401',
        room: { id: 31, remark: 'Room B' },
        blocked: false,
        blockedByDefectId: null,
      },
    });

    cy.intercept('GET', /\/defects(\?.*)?$/, [blockDefect]).as('getDefects');
    cy.intercept('GET', '**/desks', []).as('getDesks');
    cy.intercept('GET', '**/rooms', []).as('getRooms');
    cy.intercept('GET', '**/defects/501/notes', []).as('getNotes');

    let blockCallCount = 0;
    cy.intercept('PUT', '**/defects/501/block', (req) => {
      blockCallCount += 1;

      if (blockCallCount === 1) {
        req.reply({
          statusCode: 409,
          body: {
            code: 'FUTURE_BOOKINGS_EXIST',
            futureBookingCount: 4,
          },
        });
        return;
      }

      req.reply({ statusCode: 200, body: {} });
    }).as('blockDefect');

    openDefectsDashboard();
    cy.wait('@getDefects');

    cy.contains('DF-BLOCK-001').click({ force: true });
    cy.wait('@getNotes');

    cy.get('input[type="date"]').first().type('2026-12-31', { force: true });
    cy.contains('button', /Block Workstation|Arbeitsplatz sperren/).click({ force: true });

    cy.wait('@blockDefect').then((interception) => {
      expect(interception.response.statusCode).to.equal(409);
      expect(interception.response.body.futureBookingCount).to.equal(4);
    });

    containsOneOf([
      'This workstation has 4 future booking\\(s\\). Cancel them\\?',
      'Dieser Arbeitsplatz hat 4 zukünftige Buchung\\(en\\). Stornieren\\?',
    ]).should('be.visible');

    cy.get('.MuiDialog-root .MuiDialogActions-root button').eq(0).click({ force: true });

    cy.wait('@blockDefect').then((interception) => {
      const body = typeof interception.request.body === 'string'
        ? JSON.parse(interception.request.body)
        : interception.request.body;

      expect(body.cancelFutureBookings).to.equal(false);
      expect(body.estimatedEndDate).to.equal('2026-12-31');
      expect(interception.response.statusCode).to.equal(200);
    });
  });

  it('supports blocking, end-date updates, and unblocking workflows', () => {
    cy.login(serviceUser.email, password);

    let blocked = false;
    let blockedEstimatedEndDate = null;
    const getBlockDefect = () => buildDefect(820, 'DF-BLOCK-UPDATE-001', {
      status: 'IN_PROGRESS',
      desk: {
        id: 1820,
        remark: 'Desk 1820',
        workstationIdentifier: 'WS-1820',
        room: { id: 82, remark: 'Room 82' },
        blocked,
        blockedByDefectId: blocked ? 820 : null,
        blockedReasonCategory: blocked ? 'TECHNICAL_DEFECT' : null,
        blockedEstimatedEndDate,
      },
    });

    cy.intercept('GET', /\/defects(\?.*)?$/, (req) => req.reply([getBlockDefect()])).as('getDefects');
    cy.intercept('GET', '**/desks', []).as('getDesks');
    cy.intercept('GET', '**/rooms', []).as('getRooms');
    cy.intercept('GET', '**/defects/820', (req) => req.reply(getBlockDefect())).as('getDefectDetails');
    cy.intercept('GET', '**/defects/820/notes', []).as('getNotes');

    let blockCallCount = 0;
    cy.intercept('PUT', '**/defects/820/block', (req) => {
      blockCallCount += 1;
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      blocked = true;
      blockedEstimatedEndDate = body.estimatedEndDate;
      req.reply({ statusCode: 200, body: {} });
    }).as('blockDefect');

    cy.intercept('PUT', '**/defects/820/unblock', (req) => {
      blocked = false;
      blockedEstimatedEndDate = null;
      req.reply({ statusCode: 200, body: {} });
    }).as('unblockDefect');

    openDefectsDashboard();
    cy.wait('@getDefects');
    cy.contains('DF-BLOCK-UPDATE-001').click({ force: true });
    cy.wait('@getNotes');

    cy.get('input[type="date"]').first().type('2026-12-15', { force: true });
    cy.contains('button', /Block Workstation|Arbeitsplatz sperren/).click({ force: true });
    cy.wait('@blockDefect').then((interception) => {
      const body = typeof interception.request.body === 'string'
        ? JSON.parse(interception.request.body)
        : interception.request.body;
      expect(body.estimatedEndDate).to.equal('2026-12-15');
      expect(body.cancelFutureBookings).to.equal(null);
    });

    cy.wait('@getDefectDetails');
    setNativeInputValue('input[type="date"]', '2026-12-20');
    cy.get('input[type="date"]').first().should('have.value', '2026-12-20');
    cy.contains('button', /^Update$|^Aktualisieren$/).should('not.be.disabled');
    cy.contains('button', /^Update$|^Aktualisieren$/).click({ force: true });
    cy.wait('@blockDefect').then((interception) => {
      const body = typeof interception.request.body === 'string'
        ? JSON.parse(interception.request.body)
        : interception.request.body;
      expect(body.estimatedEndDate).to.equal('2026-12-20');
      expect(body.cancelFutureBookings).to.equal(false);
      expect(blockCallCount).to.equal(2);
    });

    cy.contains('button', /Unblock Workstation|Arbeitsplatz entsperren/).click({ force: true });
    cy.wait('@unblockDefect');
  });

  it('supports note add/edit and author-only edit/delete visibility with delete flow', () => {
    cy.login(serviceUser.email, password);

    const notesDefect = buildDefect(601, 'DF-NOTES-001', {
      status: 'IN_PROGRESS',
    });

    cy.window().then((win) => {
      const currentUserId = Number(win.localStorage.getItem('userId'));
      expect(Number.isFinite(currentUserId), 'localStorage userId').to.equal(true);

      cy.intercept('GET', /\/defects(\?.*)?$/, [notesDefect]).as('getDefects');
      cy.intercept('GET', '**/desks', []).as('getDesks');
      cy.intercept('GET', '**/rooms', []).as('getRooms');

      const notes = [
        {
          id: 7001,
          content: 'Own note for permissions test',
          author: { id: currentUserId, name: 'Current', surname: 'User' },
          createdAt: '2026-02-20T10:00:00Z',
          updatedAt: null,
        },
        {
          id: 7002,
          content: 'Other user note for permissions test',
          author: { id: 999999, name: 'Other', surname: 'User' },
          createdAt: '2026-02-20T11:00:00Z',
          updatedAt: null,
        },
      ];

      cy.intercept('GET', '**/defects/601/notes', (req) => {
        req.reply(notes);
      }).as('getNotes');

      cy.intercept('POST', '**/defects/601/notes', (req) => {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        notes.push({
          id: 7003,
          content: body.content,
          author: { id: currentUserId, name: 'Current', surname: 'User' },
          createdAt: '2026-02-20T12:00:00Z',
          updatedAt: null,
        });
        req.reply({ statusCode: 200, body: {} });
      }).as('addNote');

      cy.intercept('PUT', '**/defects/601/notes/7001', (req) => {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        notes[0].content = body.content;
        notes[0].updatedAt = '2026-02-20T12:30:00Z';
        req.reply({ statusCode: 200, body: {} });
      }).as('editNote');

      cy.intercept('DELETE', '**/defects/601/notes/7001', (req) => {
        const idx = notes.findIndex((n) => n.id === 7001);
        if (idx >= 0) {
          notes.splice(idx, 1);
        }
        req.reply({ statusCode: 200, body: {} });
      }).as('deleteNote');

      openDefectsDashboard();
      cy.wait('@getDefects');
      cy.contains('DF-NOTES-001').click({ force: true });
      cy.wait('@getNotes');

      cy.contains('.MuiDrawer-root button', /Add Note|Notiz hinzufügen/)
        .scrollIntoView()
        .should('be.visible');
      cy.contains('.MuiDrawer-root label', /Note content|Notizinhalt/)
        .invoke('attr', 'for')
        .then((inputId) => {
          expect(inputId, 'note input id').to.be.a('string').and.not.be.empty;
          cy.get(`[id="${inputId}"]`)
            .clear({ force: true })
            .type('Newly added note from Cypress', { force: true });
        });
      cy.contains('button', /Add Note|Notiz hinzufügen/).click({ force: true });
      cy.wait('@addNote');
      cy.contains('Newly added note from Cypress').should('be.visible');

      cy.contains('Own note for permissions test')
        .closest('.MuiPaper-root')
        .within(() => {
          cy.contains('button', /Edit Note|Notiz bearbeiten/).click({ force: true });
        });
      cy.get('.MuiDrawer-root textarea:visible')
        .first()
        .clear({ force: true })
        .type('Own note edited by Cypress', { force: true });
      cy.get('.MuiDrawer-root textarea:visible')
        .first()
        .closest('.MuiPaper-root')
        .find('button')
        .first()
        .click({ force: true });
      cy.wait('@editNote');
      cy.contains('Own note edited by Cypress').should('be.visible');

      cy.contains('Own note edited by Cypress')
        .closest('.MuiPaper-root')
        .within(() => {
          cy.contains('button', /Edit Note|Notiz bearbeiten/).should('exist');
          cy.contains('button', /Delete Note|Notiz löschen/).should('exist');
        });

      cy.contains('Other user note for permissions test')
        .closest('.MuiPaper-root')
        .within(() => {
          cy.contains('button', /Edit Note|Notiz bearbeiten/).should('not.exist');
          cy.contains('button', /Delete Note|Notiz löschen/).should('not.exist');
        });

      cy.on('window:confirm', () => true);
      cy.contains('Own note edited by Cypress')
        .closest('.MuiPaper-root')
        .within(() => {
          cy.contains('button', /Delete Note|Notiz löschen/).click({ force: true });
        });

      cy.wait('@deleteNote');
      cy.assertToastOneOf(['Note deleted', 'Notiz gelöscht']);
    });
  });
});
