describe('Booking Management dashboard', () => {
  const adminMail = Cypress.env('TEST_ADMIN_MAIL');
  const adminPw = Cypress.env('TEST_ADMIN_PW');
  const userMail = Cypress.env('TEST_USER_MAIL');
  const userPw = Cypress.env('TEST_USER_PW');
  const backendBaseUrl = (() => {
    const appUrl = new URL(Cypress.config('baseUrl'));
    return `${appUrl.protocol}//${appUrl.hostname}:8082`;
  })();

  const createdBookingIds = [];
  const createdParkingReservationIds = [];

  const parseBody = (body) => (typeof body === 'string' ? JSON.parse(body) : body);

  const buildSession = (body) => {
    const payload = parseBody(body);
    const accessToken = String(payload.accessToken);
    return {
      ...payload,
      accessToken,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    };
  };

  const authenticateAs = (email, password) =>
    cy.request('POST', `${backendBaseUrl}/users/login`, { email, password }).then(({ body }) => buildSession(body));

  const visitAs = (session, path = '/admin/booking-management') =>
    cy.visit(path, {
      onBeforeLoad(win) {
        const serializedHeaders = JSON.stringify(session.headers);
        win.sessionStorage.setItem('headers', serializedHeaders);
        win.sessionStorage.setItem('accessToken', session.accessToken);
        win.localStorage.setItem('email', String(session.email));
        win.localStorage.setItem('userId', String(session.id));
        win.localStorage.setItem('name', String(session.name));
        win.localStorage.setItem('surname', String(session.surname));
        win.localStorage.setItem('admin', String(session.admin));
        win.localStorage.setItem('servicePersonnel', String(session.servicePersonnel));
        win.localStorage.setItem('visibility', String(session.visibility));
        win.localStorage.setItem(`language_${session.id}`, 'en');
      },
    });

  const futureDate = (daysAhead) => {
    const date = new Date();
    date.setDate(date.getDate() + daysAhead);
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const addDays = (date, days) => {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + days);
    nextDate.setHours(0, 0, 0, 0);
    return nextDate;
  };

  const formatIsoDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatGermanDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${day}.${month}.${year}`;
  };

  const buildDeskDashboardBooking = ({
    id,
    day,
    begin,
    end,
    email,
    building,
    roomRemark,
    deskRemark,
  }) => ({
    booking_id: id,
    day,
    begin,
    end,
    email,
    name: 'Dashboard',
    surname: 'User',
    roleName: 'EMPLOYEE',
    department: 'QA',
    building,
    roomRemark,
    deskRemark,
    seriesId: null,
    deskId: id,
  });

  const buildParkingDashboardBooking = ({
    id,
    day,
    begin,
    end,
    email,
    spotLabel,
  }) => ({
    id,
    day,
    begin,
    end,
    email,
    name: 'Dashboard',
    surname: 'Driver',
    roleName: 'EMPLOYEE',
    department: 'QA',
    spotLabel,
    justification: `Justification ${id}`,
  });

  const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const registerBookingForCleanup = (bookingId) => {
    if (bookingId != null) {
      createdBookingIds.push(bookingId);
    }
    return bookingId;
  };

  const registerParkingReservationForCleanup = (reservationId) => {
    if (reservationId != null) {
      createdParkingReservationIds.push(reservationId);
    }
    return reservationId;
  };

  const deleteBookingAsAdmin = (session, bookingId) =>
    cy.request({
      method: 'DELETE',
      url: `${backendBaseUrl}/admin/deleteBooking/${bookingId}`,
      headers: session.headers,
      failOnStatusCode: false,
    }).then(({ status }) => {
      expect([204, 404]).to.include(status);
    });

  const cancelParkingReservationAsAdmin = (session, reservationId) =>
    cy.request({
      method: 'DELETE',
      url: `${backendBaseUrl}/admin/cancelParkingReservation/${reservationId}`,
      headers: session.headers,
      failOnStatusCode: false,
      body: { justification: 'Cypress cleanup' },
    }).then(({ status }) => {
      expect([204, 404, 500]).to.include(status);
    });

  const getRooms = (session) =>
    cy.request({
      method: 'GET',
      url: `${backendBaseUrl}/rooms`,
      headers: session.headers,
    }).then(({ status, body }) => {
      expect(status).to.eq(200);
      return Array.isArray(body) ? body : [];
    });

  const getDesksForRoom = (session, roomId) =>
    cy.request({
      method: 'GET',
      url: `${backendBaseUrl}/desks/room/${roomId}`,
      headers: session.headers,
    }).then(({ status, body }) => {
      expect(status).to.eq(200);
      return Array.isArray(body) ? body : [];
    });

  const getDeskId = (desk) => desk?.id ?? desk?.deskId;

  const findPreviewEligibleRoom = (session, rooms, minDeskCount, day, begin, end, index = 0) => {
    if (index >= rooms.length) {
      throw new Error(`No room with at least ${minDeskCount} bookable desks was found`);
    }

    const room = rooms[index];
    return getDesksForRoom(session, room.id).then((desks) => {
      if (desks.length < minDeskCount) {
        return findPreviewEligibleRoom(session, rooms, minDeskCount, day, begin, end, index + 1);
      }

      return cy.request({
        method: 'POST',
        url: `${backendBaseUrl}/admin/rooms/${room.id}/bulk-booking-preview`,
        headers: session.headers,
        body: { day, begin, end },
      }).then(({ status, body }) => {
        expect(status).to.eq(200);

        const bookableIds = (Array.isArray(body?.deskStatuses) ? body.deskStatuses : [])
          .filter((entry) => entry?.status === 'BOOKABLE')
          .map((entry) => String(entry.deskId));
        const bookableDesks = desks.filter((desk) => bookableIds.includes(String(getDeskId(desk))));

        if (bookableDesks.length >= minDeskCount) {
          return { room, desks: bookableDesks.slice(0, minDeskCount) };
        }

        return findPreviewEligibleRoom(session, rooms, minDeskCount, day, begin, end, index + 1);
      });
    });
  };

  const findRoomWithAvailableDesks = (session, day, begin, end, minDeskCount = 2) =>
    getRooms(session).then((rooms) =>
      findPreviewEligibleRoom(session, rooms, minDeskCount, day, begin, end)
    );

  const createDeskBooking = (session, { roomId, deskId, day, begin, end }) =>
    cy.request({
      method: 'POST',
      url: `${backendBaseUrl}/bookings`,
      headers: session.headers,
      body: {
        userId: session.id,
        roomId,
        deskId,
        day,
        begin: `${begin}:00`,
        end: `${end}:00`,
      },
    }).then(({ status, body }) => {
      expect(status).to.eq(201);
      registerBookingForCleanup(body?.id);
      return body;
    });

  const getActiveParkingSpots = (session) =>
    cy.request({
      method: 'GET',
      url: `${backendBaseUrl}/parking/spots?includeInactive=false`,
      headers: session.headers,
    }).then(({ status, body }) => {
      expect(status).to.eq(200);
      return (Array.isArray(body) ? body : []).filter(
        (spot) => spot?.active && !spot?.manuallyBlocked && spot?.spotType !== 'SPECIAL_CASE'
      );
    });

  const getAvailableParkingSpots = (session, day, begin, end) =>
    getActiveParkingSpots(session).then((spots) => {
      const requestedLabels = spots.map((spot) => spot.spotLabel);
      expect(requestedLabels.length, 'active parking spots').to.be.greaterThan(0);

      return cy.request({
        method: 'POST',
        url: `${backendBaseUrl}/parking/availability`,
        headers: session.headers,
        body: {
          spotLabels: requestedLabels,
          day,
          begin,
          end,
        },
      }).then(({ status, body }) => {
        expect(status).to.eq(200);
        const availableLabels = (Array.isArray(body) ? body : [])
          .filter((entry) => entry?.status === 'AVAILABLE')
          .map((entry) => entry.spotLabel);
        return spots.filter((spot) => availableLabels.includes(spot.spotLabel));
      });
    });

  const findAvailableParkingSpots = (session, day, begin, end, minCount = 2) =>
    getAvailableParkingSpots(session, day, begin, end).then((availableSpots) => {
      expect(availableSpots.length, `available parking spots on ${day} ${begin}-${end}`).to.be.at.least(minCount);
      return availableSpots.slice(0, minCount);
    });

  const findAvailableParkingSpotsOnOrAfter = (session, startDate, begin, end, minCount = 1, maxOffsetDays = 14, offset = 0) => {
    if (offset > maxOffsetDays) {
      throw new Error(`No day with at least ${minCount} available parking spots was found within ${maxOffsetDays} days`);
    }

    const candidateDate = addDays(startDate, offset);
    const day = formatIsoDate(candidateDate);

    return getAvailableParkingSpots(session, day, begin, end).then((availableSpots) => {
      if (availableSpots.length >= minCount) {
        return {
          day,
          date: candidateDate,
          spots: availableSpots.slice(0, minCount),
        };
      }

      return findAvailableParkingSpotsOnOrAfter(session, startDate, begin, end, minCount, maxOffsetDays, offset + 1);
    });
  };

  const createParkingReservation = (session, { spotLabel, day, begin, end, justification }) =>
    cy.request({
      method: 'POST',
      url: `${backendBaseUrl}/parking/reservations`,
      headers: session.headers,
      body: {
        spotLabel,
        day,
        begin,
        end,
        locale: 'en',
        justification,
      },
    }).then(({ status, body }) => {
      expect(status).to.eq(201);
      registerParkingReservationForCleanup(body?.id);
      return body;
    });

  const openBookingManagement = (session) => {
    cy.intercept('GET', '**/admin/bookingFor').as('loadDeskBookings');
    cy.intercept('GET', '**/parking/review/pending/count').as('loadPendingCount');
    visitAs(session, '/admin/booking-management');
    cy.wait('@loadDeskBookings').its('response.statusCode').should('eq', 200);
    cy.wait('@loadPendingCount');
    cy.contains('h6', 'Desk bookings').should('be.visible');
  };

  const openParkingBookingsView = () => {
    cy.intercept('GET', '**/admin/parkingBookings').as('loadParkingBookings');
    cy.contains('button', /^Parking bookings$/).click({ force: true });
    cy.wait('@loadParkingBookings').its('response.statusCode').should('eq', 200);
    cy.contains('h6', 'Parking bookings').should('be.visible');
  };

  const openParkingRequestsView = () => {
    cy.intercept('GET', '**/parking/review/pending').as('loadPendingRequests');
    cy.contains('button', /^Parking Requests(?: \(\d+\))?$/).click({ force: true });
    cy.wait('@loadPendingRequests').its('response.statusCode').should('eq', 200);
    cy.contains('h6', 'Parking Requests').should('be.visible');
  };

  const setFieldByLabel = (scopeSelector, labelRegex, value) => {
    cy.get(scopeSelector)
      .contains('label', labelRegex)
      .scrollIntoView()
      .should('be.visible')
      .invoke('attr', 'for')
      .then((id) => {
        expect(id, `field id for ${labelRegex}`).to.be.a('string').and.not.be.empty;
        cy.get(scopeSelector)
          .find(`[id="${id}"]`)
          .scrollIntoView()
          .should('exist')
          .then(($input) => {
            const input = $input[0];
            const view = input.ownerDocument.defaultView;
            const prototype = input.tagName.toLowerCase() === 'textarea'
              ? view.HTMLTextAreaElement.prototype
              : view.HTMLInputElement.prototype;
            const nativeSetter = Object.getOwnPropertyDescriptor(prototype, 'value').set;

            nativeSetter.call(input, value);
            input.dispatchEvent(new view.Event('input', { bubbles: true }));
            input.dispatchEvent(new view.Event('change', { bubbles: true }));
          });
      });
  };

  const setVisibleTextareaValue = (scopeSelector, value) => {
    cy.get(scopeSelector)
      .find('.MuiDialogContent-root textarea, textarea')
      .first()
      .scrollIntoView()
      .should('exist')
      .clear({ force: true })
      .type(value, { force: true })
      .should('have.value', value);
  };

  const selectOptionByLabel = (scopeSelector, labelRegex, option) => {
    const matcher = option instanceof RegExp ? option : new RegExp(`^${escapeRegex(option)}$`);
    cy.get(scopeSelector)
      .contains('label', labelRegex)
      .closest('.MuiFormControl-root')
      .find('[role="combobox"]')
      .click({ force: true });
    cy.contains('li', matcher).click({ force: true });
  };

  const selectFirstNonEmptyOptionByLabel = (scopeSelector, labelRegex) => {
    cy.get(scopeSelector)
      .contains('label', labelRegex)
      .closest('.MuiFormControl-root')
      .find('[role="combobox"]')
      .click({ force: true });
    cy.get('ul[role="listbox"]')
      .should('be.visible')
      .find('li')
      .then(($items) => {
        expect($items.length, `${labelRegex} options`).to.be.greaterThan(1);
        cy.wrap($items.eq(1)).click({ force: true });
      });
  };

  const selectDeskLocation = (scopeSelector, room) => {
    const buildingName = room?.floor?.building?.name || room?.building?.name || room?.buildingName;

    if (buildingName) {
      selectOptionByLabel(scopeSelector, /^Building$/, buildingName);
    } else {
      selectFirstNonEmptyOptionByLabel(scopeSelector, /^Building$/);
    }

    cy.get(scopeSelector)
      .contains('label', /^Room$/)
      .closest('.MuiFormControl-root')
      .find('[role="combobox"]')
      .should('not.have.attr', 'aria-disabled', 'true');

    if (room?.remark) {
      selectOptionByLabel(scopeSelector, /^Room$/, room.remark);
    } else {
      selectFirstNonEmptyOptionByLabel(scopeSelector, /^Room$/);
    }
  };

  const tableRowByCellText = (text) => cy.contains('tbody td', text).parents('tr').first();
  const tableRowByCells = (texts) => cy.get('tbody tr').filter((_, row) => (
    texts.every((text) => row.innerText.includes(String(text)))
  )).first();
  const getResultsSummary = () => cy.contains(/^Results:\s+\d+$/);

  afterEach(() => {
    const bookingsToCleanup = createdBookingIds.splice(0, createdBookingIds.length);
    const reservationsToCleanup = createdParkingReservationIds.splice(0, createdParkingReservationIds.length);

    if (!bookingsToCleanup.length && !reservationsToCleanup.length) {
      return;
    }

    authenticateAs(adminMail, adminPw).then((adminSession) => {
      cy.wrap(reservationsToCleanup, { log: false }).each((reservationId) => {
        cancelParkingReservationAsAdmin(adminSession, reservationId);
      });
      cy.wrap(bookingsToCleanup, { log: false }).each((bookingId) => {
        deleteBookingAsAdmin(adminSession, bookingId);
      });
    });
  });

  it('shows desk bookings with dependent filters and without the bulk-group field', () => {
    const bookingDate = futureDate(3);
    const day = formatIsoDate(bookingDate);
    const visibleDate = formatGermanDate(bookingDate);
    let initialResultsCount = 0;

    authenticateAs(adminMail, adminPw).then((adminSession) => {
      authenticateAs(userMail, userPw).then((userSession) => {
        findRoomWithAvailableDesks(adminSession, day, '09:00', '11:00', 2).then(({ room, desks }) => {
          const firstDesk = desks[0];
          const secondDesk = desks[1];

          createDeskBooking(userSession, {
            roomId: room.id,
            deskId: getDeskId(firstDesk),
            day,
            begin: '09:00',
            end: '11:00',
          }).then(() => {
            createDeskBooking(adminSession, {
              roomId: room.id,
              deskId: getDeskId(secondDesk),
              day,
              begin: '11:30',
              end: '13:30',
            }).then(() => {
              openBookingManagement(adminSession);

              cy.contains('th', /^Bulk Group$/).should('not.exist');
              cy.contains('label', /^Bulk Group$/).should('not.exist');
              getResultsSummary()
                .invoke('text')
                .then((text) => {
                  initialResultsCount = Number(text.match(/\d+/u)?.[0]);
                  expect(initialResultsCount, 'initial desk booking count').to.be.greaterThan(1);
                });

              setFieldByLabel('body', /^Date$/, day);
              getResultsSummary()
                .invoke('text')
                .then((text) => {
                  const dateFilteredCount = Number(text.match(/\d+/u)?.[0]);
                  expect(dateFilteredCount, 'desk bookings on selected date').to.be.at.least(2);
                });

              selectDeskLocation('body', room);
              selectOptionByLabel('body', /^Desk$/, firstDesk.remark);
              setFieldByLabel('body', /^Email$/, userMail);

              getResultsSummary().should('have.text', 'Results: 1');
              cy.get('tbody tr').should('have.length', 1);
              tableRowByCellText(firstDesk.remark).within(() => {
                cy.contains('td', visibleDate).should('exist');
                cy.contains('td', '09:00').should('exist');
                cy.contains('td', '11:00').should('exist');
                cy.contains('td', userMail).should('exist');
              });

              cy.contains('button', /^Clear filters$/).click({ force: true });
              getResultsSummary().should(($summary) => {
                expect($summary.text()).to.eq(`Results: ${initialResultsCount}`);
              });
              cy.get('input[type="date"]').should('have.value', '');
              cy.get('body')
                .contains('label', /^Room$/)
                .closest('.MuiFormControl-root')
                .find('[role="combobox"]')
                .should('have.attr', 'aria-disabled', 'true');
              cy.get('body')
                .contains('label', /^Desk$/)
                .closest('.MuiFormControl-root')
                .find('[role="combobox"]')
                .should('have.attr', 'aria-disabled', 'true');
              cy.contains('button', /^Clear filters$/).should('be.disabled');
            });
          });
        });
      });
    });
  });

  it('opens the desk booking edit dialog from the desk bookings view', () => {
    const bookingDate = futureDate(4);
    const day = formatIsoDate(bookingDate);

    authenticateAs(adminMail, adminPw).then((adminSession) => {
      authenticateAs(userMail, userPw).then((userSession) => {
        findRoomWithAvailableDesks(adminSession, day, '09:00', '11:00', 2).then(({ room, desks }) => {
          const originalDesk = desks[0];
          const targetDesk = desks[1];
          const buildingId = Number(
            room?.floor?.building?.id
            ?? room?.building?.id
            ?? room?.buildingId
            ?? 1
          );
          const buildingName = room?.floor?.building?.name || room?.building?.name || room?.buildingName || '';

          createDeskBooking(userSession, {
            roomId: room.id,
            deskId: getDeskId(originalDesk),
            day,
            begin: '09:00',
            end: '11:00',
          }).then(() => {
            openBookingManagement(adminSession);

            setFieldByLabel('body', /^Date$/, day);
            selectDeskLocation('body', room);
            selectOptionByLabel('body', /^Desk$/, originalDesk.remark);

            cy.intercept('POST', '**/candidate-desks', {
              statusCode: 200,
              body: [
                {
                  deskId: getDeskId(originalDesk),
                  deskLabel: originalDesk.remark,
                  roomId: room.id,
                  roomLabel: room.remark,
                  buildingId,
                  buildingName,
                },
                {
                  deskId: getDeskId(targetDesk),
                  deskLabel: targetDesk.remark,
                  roomId: room.id,
                  roomLabel: room.remark,
                  buildingId,
                  buildingName,
                },
              ],
            }).as('candidateDesks');

            cy.get('tbody tr').should('have.length', 1).within(() => {
              cy.contains('button', /^Edit$/).click({ force: true });
            });

            cy.wait('@candidateDesks').its('response.statusCode').should('eq', 200);

            cy.get('[role="dialog"]').should('be.visible').within(() => {
              cy.contains('Current assignment').should('be.visible');
              cy.contains(buildingName).should('be.visible');
              cy.contains(room.remark).should('be.visible');
              cy.contains(originalDesk.remark).should('be.visible');
              cy.contains('button', /^Save Changes$/).should('be.disabled');
              cy.contains('button', /^Cancel$/).click({ force: true });
            });
            cy.get('[role="dialog"]').should('not.exist');
            cy.get('tbody tr').should('have.length', 1);
            tableRowByCellText(originalDesk.remark).should('exist');
          });
        });
      });
    });
  });

  it('cancels a desk booking with a required justification', () => {
    const bookingDate = futureDate(5);
    const day = formatIsoDate(bookingDate);

    authenticateAs(adminMail, adminPw).then((adminSession) => {
      authenticateAs(userMail, userPw).then((userSession) => {
        findRoomWithAvailableDesks(adminSession, day, '13:00', '15:00', 2).then(({ room, desks }) => {
          const desk = desks[0];

          createDeskBooking(userSession, {
            roomId: room.id,
            deskId: getDeskId(desk),
            day,
            begin: '13:00',
            end: '15:00',
          }).then(() => {
            openBookingManagement(adminSession);

            setFieldByLabel('body', /^Date$/, day);
            selectDeskLocation('body', room);
            selectOptionByLabel('body', /^Desk$/, desk.remark);
            setFieldByLabel('body', /^Email$/, userMail);

            cy.intercept('DELETE', '**/admin/cancelBooking/*').as('cancelDeskBooking');
            cy.intercept('GET', '**/admin/bookingFor').as('reloadDeskBookings');

            tableRowByCellText(userMail).within(() => {
              cy.contains('td', desk.remark).should('exist');
              cy.contains('td', '13:00').should('exist');
              cy.contains('td', '15:00').should('exist');
              cy.contains('button', /^Cancel$/).click({ force: true });
            });

            cy.get('[role="dialog"]').should('be.visible').within(() => {
              cy.contains('button', /^Confirm Cancellation$/).should('be.disabled');
            });

            setVisibleTextareaValue('[role="dialog"]', 'Removing booking for dashboard cancellation coverage');
            cy.contains('[role="dialog"] button', /^Confirm Cancellation$/)
              .should('not.be.disabled')
              .click({ force: true });

            cy.wait('@cancelDeskBooking').its('response.statusCode').should('eq', 204);
            cy.wait('@reloadDeskBookings').its('response.statusCode').should('eq', 200);
            cy.contains('.Toastify__toast', 'Booking cancelled successfully').should('be.visible');
            cy.contains('No bookings found').should('be.visible');
          });
        });
      });
    });
  });

  it('shows approved parking booking details, opens the edit dialog, and cancels the booking', () => {
    const bookingDate = futureDate(6);
    const justification = `Approved parking justification ${Date.now()}`;

    authenticateAs(adminMail, adminPw).then((adminSession) => {
      findAvailableParkingSpotsOnOrAfter(adminSession, bookingDate, '10:00', '11:00', 1).then(({ day, spots }) => {
        const originalSpot = spots[0];

        createParkingReservation(adminSession, {
          spotLabel: originalSpot.spotLabel,
          day,
          begin: '10:00',
          end: '11:00',
          justification,
        }).then(() => {
          openBookingManagement(adminSession);
          openParkingBookingsView();

          setFieldByLabel('body', /^Date$/, day);
          selectOptionByLabel('body', /^Spot Number$/, originalSpot.spotLabel);
          cy.contains('body', 'Results: 1').should('be.visible');

          cy.get('tbody tr').should('have.length', 1).within(() => {
            cy.contains('button', /^View Justification$/).click({ force: true });
          });
          cy.get('[role="dialog"]').should('be.visible').within(() => {
            cy.contains(justification).should('be.visible');
            cy.contains('button', /^Close$/).click({ force: true });
          });

          cy.intercept('POST', '**/candidate-spots').as('candidateSpots');

          cy.get('tbody tr').within(() => {
            cy.contains('button', /^Edit$/).click({ force: true });
          });

          cy.wait('@candidateSpots').its('response.statusCode').should('eq', 200);
          cy.get('[role="dialog"]').should('be.visible').within(() => {
            cy.contains('Current assignment').should('be.visible');
            cy.contains(originalSpot.spotLabel).should('be.visible');
            cy.contains('button', /^Save Changes$/).should('be.disabled');
            cy.contains('button', /^Cancel$/).click({ force: true });
          });

          cy.get('[role="dialog"]').should('not.exist');
          tableRowByCellText(originalSpot.spotLabel).should('exist');

          cy.get('tbody tr').within(() => {
            cy.contains('button', /^Cancel$/).click({ force: true });
          });

          cy.get('[role="dialog"]').should('be.visible').within(() => {
            cy.contains('button', /^Confirm Cancellation$/).should('be.disabled');
          });

          setVisibleTextareaValue('[role="dialog"]', 'Removing approved reservation after dashboard coverage');
          cy.contains('[role="dialog"] button', /^Confirm Cancellation$/)
            .should('not.be.disabled')
            .and('be.visible');
          cy.contains('[role="dialog"] button', /^Cancel$/).click({ force: true });
          cy.get('[role="dialog"]').should('not.exist');
          tableRowByCellText(originalSpot.spotLabel).should('exist');
        });
      });
    });
  });

  it('shows filtered pending parking requests with approve and reject actions', () => {
    const bookingDate = futureDate(14);

    authenticateAs(adminMail, adminPw).then((adminSession) => {
      authenticateAs(userMail, userPw).then((userSession) => {
        findAvailableParkingSpotsOnOrAfter(adminSession, bookingDate, '12:00', '13:00', 1).then(({ day, spots }) => {
          const spot = spots[0];

          createParkingReservation(userSession, {
            spotLabel: spot.spotLabel,
            day,
            begin: '12:00',
            end: '13:00',
            justification: 'Pending request justification A',
          }).then(() => {
            openBookingManagement(adminSession);
            openParkingRequestsView();

            setFieldByLabel('body', /^Date$/, day);
            setFieldByLabel('body', /^Email$/, userMail);
            setFieldByLabel('body', /^Start Time$/, '12:00');
            setFieldByLabel('body', /^End Time$/, '13:00');
            selectOptionByLabel('body', /^Spot Number$/, spot.spotLabel);

            getResultsSummary().should('have.text', 'Results: 1');
            tableRowByCells(['12:00', '13:00', spot.spotLabel, userMail]).should('exist');
            cy.contains('button', /^Approve$/).should('exist');
            cy.contains('button', /^Reject$/).should('exist');
          });
        });
      });
    });
  });

  it('shows only future desk and parking bookings', () => {
    const today = futureDate(0);
    const yesterday = addDays(today, -1);
    const tomorrow = addDays(today, 1);
    const yesterdayDay = formatIsoDate(yesterday);
    const todayDay = formatIsoDate(today);
    const tomorrowDay = formatIsoDate(tomorrow);

    const pastDeskBooking = buildDeskDashboardBooking({
      id: 9101,
      day: yesterdayDay,
      begin: '09:00:00',
      end: '11:00:00',
      email: 'past.desk@example.com',
      building: 'Building Past',
      roomRemark: 'Room Past',
      deskRemark: 'Desk Past',
    });
    const activeDeskBooking = buildDeskDashboardBooking({
      id: 9102,
      day: todayDay,
      begin: '00:00:00',
      end: '23:59:00',
      email: 'active.desk@example.com',
      building: 'Building Active',
      roomRemark: 'Room Active',
      deskRemark: 'Desk Active',
    });
    const futureDeskBooking = buildDeskDashboardBooking({
      id: 9103,
      day: tomorrowDay,
      begin: '09:00:00',
      end: '11:00:00',
      email: 'future.desk@example.com',
      building: 'Building Future',
      roomRemark: 'Room Future',
      deskRemark: 'Desk Future',
    });

    const pastParkingBooking = buildParkingDashboardBooking({
      id: 9201,
      day: yesterdayDay,
      begin: '09:00:00',
      end: '10:00:00',
      email: 'past.parking@example.com',
      spotLabel: 'P-PAST',
    });
    const activeParkingBooking = buildParkingDashboardBooking({
      id: 9202,
      day: todayDay,
      begin: '00:00:00',
      end: '23:59:00',
      email: 'active.parking@example.com',
      spotLabel: 'P-ACTIVE',
    });
    const futureParkingBooking = buildParkingDashboardBooking({
      id: 9203,
      day: tomorrowDay,
      begin: '10:00:00',
      end: '11:00:00',
      email: 'future.parking@example.com',
      spotLabel: 'P-FUTURE',
    });

    authenticateAs(adminMail, adminPw).then((adminSession) => {
      cy.intercept('GET', '**/admin/bookingFor', {
        statusCode: 200,
        body: [pastDeskBooking, activeDeskBooking, futureDeskBooking],
      }).as('stubDeskBookings');
      cy.intercept('GET', '**/admin/parkingBookings', {
        statusCode: 200,
        body: [pastParkingBooking, activeParkingBooking, futureParkingBooking],
      }).as('stubParkingBookings');
      cy.intercept('GET', '**/parking/review/pending/count', {
        statusCode: 200,
        body: 0,
      }).as('stubPendingCount');

      visitAs(adminSession, '/admin/booking-management');
      cy.wait('@stubDeskBookings').its('response.statusCode').should('eq', 200);
      cy.wait('@stubPendingCount').its('response.statusCode').should('eq', 200);
      cy.contains('h6', 'Desk bookings').should('be.visible');

      getResultsSummary().should('have.text', 'Results: 1');
      cy.get('tbody tr').should('have.length', 1);
      tableRowByCellText('future.desk@example.com').within(() => {
        cy.contains('td', 'Desk Future').should('exist');
        cy.contains('button', /^Edit$/).should('exist');
        cy.contains('button', /^Cancel$/).should('exist');
      });
      cy.contains('tbody', 'past.desk@example.com').should('not.exist');
      cy.contains('tbody', 'active.desk@example.com').should('not.exist');

      cy.contains('button', /^Parking bookings$/).click({ force: true });
      cy.wait('@stubParkingBookings').its('response.statusCode').should('eq', 200);
      cy.contains('h6', 'Parking bookings').should('be.visible');

      getResultsSummary().should('have.text', 'Results: 1');
      cy.get('tbody tr').should('have.length', 1);
      tableRowByCellText('future.parking@example.com').within(() => {
        cy.contains('td', 'P-FUTURE').should('exist');
        cy.contains('button', /^Edit$/).should('exist');
        cy.contains('button', /^Cancel$/).should('exist');
      });
      cy.contains('tbody', 'past.parking@example.com').should('not.exist');
      cy.contains('tbody', 'active.parking@example.com').should('not.exist');
    });
  });

  it('shows bulk approve count for filtered pending parking requests', () => {
    const bookingDate = futureDate(8);

    authenticateAs(adminMail, adminPw).then((adminSession) => {
      authenticateAs(userMail, userPw).then((userSession) => {
        findAvailableParkingSpotsOnOrAfter(adminSession, bookingDate, '09:30', '10:30', 1).then(({ day, spots }) => {
          const spot = spots[0];

          createParkingReservation(userSession, {
            spotLabel: spot.spotLabel,
            day,
            begin: '09:30',
            end: '10:30',
            justification: 'Bulk approve request A',
	          }).then(() => {
	            openBookingManagement(adminSession);
	            openParkingRequestsView();
	
	            setFieldByLabel('body', /^Date$/, day);
	            setFieldByLabel('body', /^Email$/, userMail);
	            setFieldByLabel('body', /^Start Time$/, '09:30');
	            setFieldByLabel('body', /^End Time$/, '10:30');
	            selectOptionByLabel('body', /^Spot Number$/, spot.spotLabel);
	            getResultsSummary().should('have.text', 'Results: 1');
	            cy.contains('button', /^Bulk Approve \(1\)$/).should('be.visible');
	          });
	        });
	      });
    });
  });
});
