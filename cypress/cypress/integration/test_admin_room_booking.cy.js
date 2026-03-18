describe('Admin room booking', () => {
  const adminMail = Cypress.env('TEST_ADMIN_MAIL');
  const adminPw = Cypress.env('TEST_ADMIN_PW');
  const userMail = Cypress.env('TEST_USER_MAIL');
  const userPw = Cypress.env('TEST_USER_PW');
  const backendBaseUrl = (() => {
    const appUrl = new URL(Cypress.config('baseUrl'));
    return `${appUrl.protocol}//${appUrl.hostname}:8082`;
  })();
  const createdBookingIds = [];
  const createdFavouriteRoomRefs = [];

  const parseBody = (body) => (typeof body === 'string' ? JSON.parse(body) : body);

  const buildSession = (body) => {
    const accessToken = String(body.accessToken);
    return {
      ...body,
      accessToken,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    };
  };

  const authenticateAs = (email, password) =>
    cy.request('POST', `${backendBaseUrl}/users/login`, {
      email,
      password,
    }).then(({ body }) => buildSession(body));

  const openAppAs = (session) =>
    cy.visit('/home', {
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
      },
    });

  const loginAs = (email, password) =>
    authenticateAs(email, password).then((session) =>
      openAppAs(session).then(() => session)
    );

  const loginAsAdmin = () => loginAs(adminMail, adminPw);
  const loginAsUser = () => loginAs(userMail, userPw);

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

  const futureDate = (daysAhead = 5) => {
    const date = new Date();
    date.setDate(date.getDate() + daysAhead);
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const buildDateTimeIso = (date, time) => {
    const [hours, minutes] = String(time).split(':').map(Number);
    const next = new Date(date);
    next.setHours(hours || 0, minutes || 0, 0, 0);
    return next.toISOString();
  };

  const registerBookingForCleanup = (bookingId) => {
    if (bookingId != null) {
      createdBookingIds.push(bookingId);
    }
    return bookingId;
  };

  const registerFavouriteForCleanup = (userId, roomId) => {
    if (userId != null && roomId != null) {
      createdFavouriteRoomRefs.push({ userId, roomId });
    }
  };

  const getRoomAndDesks = (session, roomRemark) =>
    cy.request({
      method: 'GET',
      url: `${backendBaseUrl}/rooms`,
      headers: session.headers,
    }).then(({ body: rooms }) => {
      const room = (Array.isArray(rooms) ? rooms : []).find((candidate) => candidate?.remark === roomRemark);
      expect(room, `room ${roomRemark} to exist`).to.exist;

      return cy.request({
        method: 'GET',
        url: `${backendBaseUrl}/desks/room/${room.id}`,
        headers: session.headers,
      }).then(({ body: desks }) => {
        const deskMap = Object.fromEntries((Array.isArray(desks) ? desks : []).map((desk) => [desk.remark, desk]));
        return { room, desks: Array.isArray(desks) ? desks : [], deskMap };
      });
    });

  const createDeskBooking = (session, bookingData) =>
    cy.request({
      method: 'POST',
      url: `${backendBaseUrl}/bookings`,
      headers: session.headers,
      body: bookingData,
    }).then(({ status, body }) => {
      expect(status).to.eq(201);
      registerBookingForCleanup(body?.id);
      return body;
    });

  const addFavouriteRoom = (session, roomId) =>
    cy.request({
      method: 'POST',
      url: `${backendBaseUrl}/favourites/${session.id}/room/${roomId}`,
      headers: session.headers,
      body: {},
    }).then(({ status }) => {
      expect([200, 201]).to.include(status);
      registerFavouriteForCleanup(session.id, roomId);
    });

  const deleteBookingAsAdmin = (session, bookingId) =>
    cy.request({
      method: 'DELETE',
      url: `${backendBaseUrl}/admin/deleteBooking/${bookingId}`,
      headers: session.headers,
      failOnStatusCode: false,
    }).then(({ status }) => {
      expect([204, 404]).to.include(status);
    });

  const deleteFavouriteRoom = (session, userId, roomId) =>
    cy.request({
      method: 'DELETE',
      url: `${backendBaseUrl}/favourites/${userId}/room/${roomId}`,
      headers: session.headers,
      failOnStatusCode: false,
    }).then(({ status }) => {
      expect([200, 404]).to.include(status);
    });

  const findRoomByDeskCount = (session, rooms, minDeskCount, index = 0) => {
    if (index >= rooms.length) {
      throw new Error(`No room with at least ${minDeskCount} visible desks was found`);
    }

    const room = rooms[index];
    return cy.request({
      method: 'GET',
      url: `${backendBaseUrl}/desks/room/${room.id}`,
      headers: session.headers,
    }).then(({ body: desks }) => {
      const visibleDesks = Array.isArray(desks) ? desks : [];
      if (visibleDesks.length >= minDeskCount) {
        const deskMap = Object.fromEntries(visibleDesks.map((desk) => [desk.remark, desk]));
        return { room, desks: visibleDesks, deskMap };
      }
      return findRoomByDeskCount(session, rooms, minDeskCount, index + 1);
    });
  };

  const findPreviewEligibleRoom = (session, rooms, minDeskCount, day, begin, end, index = 0) => {
    if (index >= rooms.length) {
      throw new Error(`No fully available room with at least ${minDeskCount} visible desks was found`);
    }

    const room = rooms[index];
    return cy.request({
      method: 'GET',
      url: `${backendBaseUrl}/desks/room/${room.id}`,
      headers: session.headers,
    }).then(({ body: desks }) => {
      const visibleDesks = Array.isArray(desks) ? desks : [];
      if (visibleDesks.length < minDeskCount) {
        return findPreviewEligibleRoom(session, rooms, minDeskCount, day, begin, end, index + 1);
      }

      return cy.request({
        method: 'POST',
        url: `${backendBaseUrl}/admin/rooms/${room.id}/bulk-booking-preview`,
        headers: session.headers,
        body: { day, begin, end },
      }).then(({ status, body }) => {
        expect(status).to.eq(200);
        if (body?.includedDeskCount === visibleDesks.length && body?.conflictedDeskCount === 0) {
          const deskMap = Object.fromEntries(visibleDesks.map((desk) => [desk.remark, desk]));
          return { room, desks: visibleDesks, deskMap };
        }
        return findPreviewEligibleRoom(session, rooms, minDeskCount, day, begin, end, index + 1);
      });
    });
  };

  const findAvailableRoomWithMinimumDesks = (session, minDeskCount, day, begin, end) =>
    cy.request({
      method: 'POST',
      url: `${backendBaseUrl}/rooms/byMinimalAmountOfWorkstationsAndFreeOnDate/${minDeskCount}`,
      headers: session.headers,
      body: {
        dates: [day],
        startTime: begin,
        endTime: end,
      },
    }).then(({ status, body }) => {
      expect(status).to.eq(200);
      const rooms = Array.isArray(body) ? body : [];
      return findPreviewEligibleRoom(session, rooms, minDeskCount, day, begin, end);
    });

  const findCleanRoomWithMinimumDesks = (session, minDeskCount, day, begin, end) =>
    cy.request({
      method: 'GET',
      url: `${backendBaseUrl}/rooms`,
      headers: session.headers,
    }).then(({ status, body }) => {
      expect(status).to.eq(200);
      const rooms = Array.isArray(body) ? body : [];
      return findPreviewEligibleRoom(session, rooms, minDeskCount, day, begin, end);
    });

  const findAnyRoomWithMinimumDesks = (session, minDeskCount) =>
    cy.request({
      method: 'GET',
      url: `${backendBaseUrl}/rooms`,
      headers: session.headers,
    }).then(({ status, body }) => {
      expect(status).to.eq(200);
      return findRoomByDeskCount(session, Array.isArray(body) ? body : [], minDeskCount);
    });

  afterEach(() => {
    const bookingsToCleanup = createdBookingIds.splice(0, createdBookingIds.length);
    const favouritesToCleanup = createdFavouriteRoomRefs.splice(0, createdFavouriteRoomRefs.length);
    if (!bookingsToCleanup.length && !favouritesToCleanup.length) {
      return;
    }

    authenticateAs(adminMail, adminPw).then((session) => {
      favouritesToCleanup.forEach(({ userId, roomId }) => {
        deleteFavouriteRoom(session, userId, roomId);
      });
      bookingsToCleanup.forEach((bookingId) => {
        deleteBookingAsAdmin(session, bookingId);
      });
    });
  });

  it('bulk-books all eligible desks from room search and stores one shared bulk group id', () => {
    const targetDate = futureDate(5);
    const day = formatIsoDate(targetDate);
    const displayDate = formatGermanDate(targetDate);
    const begin = '09:00';
    const end = '11:00';
    let adminSession;
    let roomMeta;
    let roomRemark;
    let expectedIncludedCount;

    cy.then(() => loginAsAdmin())
      .then((session) => {
        adminSession = session;
        return findCleanRoomWithMinimumDesks(session, 2, day, begin, end);
      })
      .then((meta) => {
        roomMeta = meta;
        roomRemark = meta.room.remark;
        expectedIncludedCount = meta.desks.length;
      });
    cy.then(() => {
      cy.intercept('POST', '**/rooms/byMinimalAmountOfWorkstationsAndFreeOnDate/*').as('roomSearchTimed');
      cy.intercept('POST', '**/admin/rooms/*/bulk-booking-preview').as('roomBulkPreview');
      cy.visit('/roomSearch');
      cy.setStr('roomSearch_date', displayDate);
      cy.setStr('roomSearch_startTime', begin);
      cy.setStr('roomSearch_endTime', end);
      cy.wait('@roomSearchTimed').its('response.statusCode').should('eq', 200);
      cy.get(`#roomSearch_book_${roomMeta.room.id}`, { timeout: 20000 })
        .scrollIntoView()
        .should('be.visible')
        .click({ force: true });
      cy.url().should('include', '/desks');
      cy.get('#booking_mode_room').should('be.visible').click({ force: true });
      cy.selectTimeRange(6, 10);

      cy.wait('@roomBulkPreview').then(({ request, response }) => {
        const payload = parseBody(request.body);
        expect(payload).to.deep.include({ day, begin, end });
        expect(response.statusCode).to.eq(200);
        expect(response.body.includedDeskCount).to.eq(expectedIncludedCount);
        expect(response.body.conflictedDeskCount).to.eq(0);
      });

      cy.get('#room_bulk_booking_panel').should('be.visible');
      cy.get('#room_bulk_selected_day').should('contain', day);
      cy.get('#room_bulk_selected_begin').should('contain', begin);
      cy.get('#room_bulk_selected_end').should('contain', end);
      cy.request({
        method: 'POST',
        url: `${backendBaseUrl}/admin/rooms/${roomMeta.room.id}/bulk-bookings`,
        headers: adminSession.headers,
        body: { day, begin, end },
      }).then(({ body, status }) => {
        expect(status).to.eq(201);
        expect(body.createdCount).to.eq(expectedIncludedCount);
        expect(body.deskIds).to.have.length(expectedIncludedCount);
        expect(body.bulkGroupId).to.be.a('string').and.not.be.empty;
      });

      cy.request({
        method: 'GET',
        url: `${backendBaseUrl}/admin/room/date/${roomMeta.room.id}?day=${day}`,
        headers: adminSession.headers,
      }).then(({ body }) => {
        const matchingBookings = (Array.isArray(body) ? body : []).filter((booking) => (
          String(booking?.begin || '').startsWith(begin)
          && String(booking?.end || '').startsWith(end)
        ));
        expect(matchingBookings).to.have.length(expectedIncludedCount);

        const adminCreatedBookings = matchingBookings.filter((booking) => booking?.user?.email === adminMail);
        expect(adminCreatedBookings).to.have.length(expectedIncludedCount);
        expect(adminCreatedBookings.map((booking) => booking?.desk?.id).sort((a, b) => a - b)).to.deep.equal(
          roomMeta.desks.map((desk) => desk.id).sort((a, b) => a - b)
        );

        const bulkGroupIds = [...new Set(adminCreatedBookings.map((booking) => booking?.bulkGroupId).filter(Boolean))];
        expect(bulkGroupIds).to.have.length(1);
      });
    });
  });

  it('opens an unavailable favourite room without a prefilled period and disables submission when no desks are eligible', () => {
    const targetDate = futureDate(6);
    const day = formatIsoDate(targetDate);
    const displayDate = formatGermanDate(targetDate);
    const begin = '09:00';
    const end = '11:00';
    const beginFull = `${begin}:00`;
    const endFull = `${end}:00`;
    const preferredSlot = {
      start: buildDateTimeIso(targetDate, begin),
      end: buildDateTimeIso(targetDate, end),
    };
    let adminSession;
    let userSession;
    let roomMeta;
    let previewCount = 0;
    let roomRemark;

    cy.then(() => loginAsAdmin())
      .then((session) => {
        adminSession = session;
        return findCleanRoomWithMinimumDesks(session, 1, day, begin, end);
      })
      .then((meta) => {
        roomMeta = meta;
        roomRemark = meta.room.remark;
        return addFavouriteRoom(adminSession, roomMeta.room.id);
      })
      .then(() => authenticateAs(userMail, userPw))
      .then((session) => {
        userSession = session;
        return cy.wrap(roomMeta.desks).each((desk) => createDeskBooking(session, {
          userId: userSession.id,
          roomId: roomMeta.room.id,
          deskId: desk.id,
          day,
          begin: beginFull,
          end: endFull,
        }));
      });
    cy.then(() => {
      cy.intercept('POST', '**/series/desksForDatesAndTimes').as('favouritesAvailability');
      cy.intercept('POST', '**/admin/rooms/*/bulk-booking-preview', (req) => {
        previewCount += 1;
        req.continue();
      }).as('roomBulkPreview');

      cy.visit('/favourites');
      cy.setStr('favourites_date', displayDate);
      cy.setStr('favourites_startTime', begin);
      cy.setStr('favourites_endTime', end);
      cy.wait('@favouritesAvailability').its('response.statusCode').should('eq', 200);

      cy.get(`#favourites_room_book_${roomMeta.room.id}`)
        .scrollIntoView()
        .should('be.visible')
        .click({ force: true });
      cy.url().should('include', '/desks');
      cy.get('#booking_mode_room').should('be.visible').click({ force: true });

      cy.get('#room_bulk_selected_day').should('contain', '--');
      cy.get('#room_bulk_selected_begin').should('contain', '--:--');
      cy.get('#room_bulk_selected_end').should('contain', '--:--');
      cy.get('#room_bulk_select_period_hint').should('exist');
      cy.then(() => {
        expect(previewCount).to.eq(0);
      });

      cy.visit('/desks', {
        onBeforeLoad(win) {
          win.sessionStorage.setItem('bookingNavigationContext', JSON.stringify({
            roomId: roomMeta.room.id,
            date: targetDate.toISOString(),
            preferredSlot,
          }));
        },
      });
      cy.get('#booking_mode_room').should('be.visible').click({ force: true });
      cy.wait('@roomBulkPreview').then(({ request, response }) => {
        const payload = parseBody(request.body);
        expect(payload).to.deep.include({ day, begin, end });
        expect(response.statusCode).to.eq(200);
        expect(response.body.includedDeskCount).to.eq(0);
        expect(response.body.conflictedDeskCount).to.eq(roomMeta.desks.length);
      });

      cy.get('#room_bulk_selected_day').should('contain', day);
      cy.get('#room_bulk_selected_begin').should('contain', begin);
      cy.get('#room_bulk_selected_end').should('contain', end);
      cy.get('#room_bulk_book_all_btn').scrollIntoView().should('be.disabled');
    });
  });

  it('does not expose room mode to non-admin users', () => {
    let roomRemark;
    let roomMeta;

    cy.then(() => loginAsAdmin())
      .then((session) => {
        return findAnyRoomWithMinimumDesks(session, 1);
      })
      .then((meta) => {
        roomMeta = meta;
        roomRemark = meta.room.remark;
        return loginAsUser();
      });
    cy.then(() => {
      cy.visit('/roomSearch');
      cy.get(`#roomSearch_book_${roomMeta.room.id}`, { timeout: 20000 })
        .scrollIntoView()
        .should('be.visible')
        .click({ force: true });

      cy.url().should('include', '/desks');
      cy.get('#submit_booking_btn').scrollIntoView().should('exist');
      cy.get('#booking_mode_toggle').should('not.exist');
      cy.get('#booking_mode_room').should('not.exist');
      cy.get('#room_bulk_booking_panel').should('not.exist');
    });
  });
});
