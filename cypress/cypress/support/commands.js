/*
test_free_desks.cy.js  
series
*/

Cypress.Commands.add('selectTimeRange', (startSlot, endSlot) => {
  const basename = '.rbc-time-content';
  cy.get(basename).then(($el_base) => {
    const base_rect = $el_base[0].getBoundingClientRect();
    const base_rect_x = base_rect.x;
    const base_rect_y = base_rect.y;
    // The height of every element with class rbc-timeslot-group
    const timeslotgroup_height = 19.5;//timeslotgroup_rect.height;
    // Offset to jump over the time header (6:00 AM etc)
    const time_offset_x = 100;

    const pos_x = base_rect_x + time_offset_x;
    const pos_y = base_rect_y + startSlot*timeslotgroup_height
    cy.get(basename).trigger('mousemove', { force: true, 
      pageX: pos_x, 
      pageY: pos_y
    }).then(()=>{
      cy.get(basename).trigger('mousedown', { which: 1, force: true }).then(()=>{
        for (let i = 0; i < (endSlot-startSlot)*timeslotgroup_height; i++) {
          cy.get('.rbc-time-content').trigger('mousemove', { force: true,
            pageX: pos_x, 
            pageY: pos_y + i, 
          });
          cy.wait(1);
        }
        cy.get(basename).trigger('mouseup', { which: 1, force: true })
        .then(()=>{
          return cy.wrap('1');
        }); 
      }) 
    });
  });
});

Cypress.Commands.add('setStr', (id, str) => {
  cy.get(`div#${id}`).find('input').should('exist').then(()=>{
    cy.get(`div#${id}`).find('input')
    .then(($input) => {
        const input = $input[0];
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            'value'
        ).set;
        nativeInputValueSetter.call(input, str);

        // Trigger events.
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));

        //cy.wrap(input).should('have.value', str);
        cy.get(`div#${id}`).find('input').should('have.value', str)
        //cy.get(`div#${id}`).find('input').should('have.text', str)
        .then(()=>{
          return cy.wrap('1');
        });
    });
  });
});

Cypress.Commands.add('setStrDirect', (id, str) => {
  cy.get(`input#${id}`).should('exist').then(()=>{
    cy.get(`input#${id}`)
    .then(($input) => {
        const input = $input[0];
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            'value'
        ).set;
        nativeInputValueSetter.call(input, str);

        // Trigger events.
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));

        //cy.wrap(input).should('have.value', str);
        cy.get(`input#${id}`).should('have.value', str)
        //cy.get(`div#${id}`).find('input').should('have.text', str)
        .then(()=>{
          return cy.wrap('1');
        });
    });
  });
});

Cypress.Commands.add('highlightMousePosition', () => {
  cy.document().then((doc) => {
    const mouseTracker = doc.createElement('div');
    mouseTracker.setAttribute('id', 'mouse-tracker');
    Object.assign(mouseTracker.style, {
      position: 'absolute',
      width: '10px',
      height: '10px',
      backgroundColor: 'red',
      borderRadius: '50%',
      zIndex: 9999,
      pointerEvents: 'none',
    });
    doc.body.appendChild(mouseTracker);

    doc.addEventListener('mousemove', (event) => {
      mouseTracker.style.left = `${event.pageX}px`;
      mouseTracker.style.top = `${event.pageY}px`;
    });
  });
});

Cypress.Commands.add('logout', ()=>{
  cy.wait(1000).then(() => {
    cy.get('body').then(($body) => {
      const closeButtons = $body.find('button#modal_close');
      if (closeButtons.length > 0) {
        cy.get('button#modal_close').last().click({ force: true });
      }
    });
  }).then(() => {
    cy.get('a#sidebar_logout').click({ force: true }).then(() => {
      cy.get('button#logoutConfirmationModal_onConfirm').click({ force: true }).then(() => {
        return cy.wrap('1');
      });
    });
  });
});

Cypress.Commands.add('assertToastOneOf', (messages) => {
  const candidates = Array.isArray(messages) ? messages : [messages];
  cy.get('.Toastify__toast').should('be.visible').then(($toast) => {
    const text = ($toast.text() || '').trim();
    const matched = candidates.some((candidate) => text.includes(candidate));
    expect(matched, `toast to contain one of: ${candidates.join(' | ')}`).to.equal(true);
  });
});

Cypress.Commands.add('clickFirst', (selectors, options = {}) => {
  if (!Array.isArray(selectors) || selectors.length === 0) {
    throw new Error('clickFirst(selectors): selectors must be a non-empty array');
  }

  return cy.get('body').then(($body) => {
    const found = selectors.find((selector) => $body.find(selector).length > 0);
    if (!found) {
      throw new Error(`None of the selectors were found: ${selectors.join(', ')}`);
    }
    return cy.get(found).click(options);
  });
});

Cypress.Commands.add('filterUsersByEmail', (mail) => {
  const enableFilter = () => {
    cy.get('input#checkbox_handleCheckboxChange')
      .should('be.enabled')
      .then(($checkbox) => {
        if (!$checkbox.prop('checked')) {
          cy.wrap($checkbox).click({ force: true });
        }
      });
    cy.get('input#checkbox_handleCheckboxChange').should('be.checked');
  };

  enableFilter();

  return cy.get('body').then(($body) => {
    // New filter component (UserManagement/FilterUser.js)
    if ($body.find('div#filterUser_field_0').length > 0) {
      const selectOption = (controlId, option) => {
        cy.get(`#${controlId}`)
          .filter(':visible')
          .first()
          .should('not.have.class', 'Mui-disabled')
          .within(() => {
            cy.get('[role="button"], [role="combobox"], input')
              .first()
              .click({ force: true });
          });
        cy.get('ul[role="listbox"]')
          .should('be.visible')
          .within(() => {
            cy.contains('li', option).click({ force: true });
          });
      };

      selectOption('filterUser_field_0', /^Email$/);
      selectOption('filterUser_condition_0', /^=$/);

      cy.get('div#filterUser_text_0').find('input').clear().type(mail);
      return;
    }

    // Legacy filter component (Employee)
    cy.setStr('filterEmployee_handleFieldChange', 'email');
    cy.setStr('filterEmployee_handleConditionChange', 'is_equal');
    cy.setStr('filterEmployee_handleTextChange', mail);
  });
});

Cypress.Commands.add('login', (mail = Cypress.env('TEST_ADMIN_MAIL'), pw = Cypress.env('TEST_ADMIN_PW'), opts = {}) => {
  const { expectSuccess = true, expectErrorMessageOneOf = null } = opts;
  const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

  cy.visit('/').then(() => {
    cy.intercept('POST', '/users/login').as('loginRequest');
    Cypress.Promise.all([
      cy.get('input#email').clear().type(mail),
      cy.get('input#password').clear().type(pw),
    ]).then(() => {
      cy.get('button#login_btn').click().then(() => {
        const waitForLoginRequest = (attempt = 0) => {
          if (attempt > 5) {
            throw new Error(`Login request for ${mail} not observed`);
          }
          return cy.wait('@loginRequest').then((interception) => {
            const body = interception.request && interception.request.body;
            let email = '';
            if (body) {
              if (typeof body === 'string') {
                try {
                  email = JSON.parse(body).email || '';
                } catch {
                  email = '';
                }
              } else {
                email = body.email || '';
              }
            }
            if (normalizeEmail(email) !== normalizeEmail(mail)) {
              return waitForLoginRequest(attempt + 1);
            }
            return interception;
          });
        };

        waitForLoginRequest().then((interception) => {
          const response = interception.response;
          expect(response === null).to.equal(false);
          if (expectSuccess) {
            expect(response.statusCode).to.equal(200);
          } else {
            expect([200, 401]).to.include(response.statusCode);
          }

          const accessToken = response.body && response.body.accessToken;
          const hasAccessToken = typeof accessToken === 'string' && accessToken.length > 0;
          if (expectSuccess) {
            expect(hasAccessToken, 'access token to be present').to.equal(true);
            cy.get('#loginErrorMsg').should('not.exist');
          } else {
            if (expectErrorMessageOneOf) {
              const candidates = Array.isArray(expectErrorMessageOneOf)
                ? expectErrorMessageOneOf
                : [expectErrorMessageOneOf];
              cy.get('#loginErrorMsg').should('be.visible').then(($el) => {
                const text = ($el.text() || '').trim();
                const matched = candidates.some((candidate) => text.includes(candidate));
                expect(matched, `login error to contain one of: ${candidates.join(' | ')}`).to.equal(true);
              });
            } else {
              cy.get('#loginErrorMsg').should('be.visible');
            }
          }

          cy.wait(500).then(() => cy.wrap('1'));
        });
      });
    });
  });
});

Cypress.Commands.add('addUser', (mail, pw, vorname, nachname, opts = {})=>{
  const { department = '' } = opts;
  cy.visit('/admin').then(()=>{
      cy.url().should('contains', '/admin').then(()=> {
          cy.get('button#userManagement').click().then(()=>{
              //cy.get('div.employee-button-wrapper').should('be.visible').then(()=>{
                  cy.clickFirst(['button#addUser', 'button#addEmployee']).then(()=>{
                      cy.get('h2').should('be.visible').then(()=>{
                          cy.get('body').then(($body) => {
                            const isNew = $body.find('div#addUser-setEmail').length > 0;
                            const emailId = isNew ? 'addUser-setEmail' : 'addEmployee-setEmail';
                            const passwordId = isNew ? 'addUser-setPassword' : 'addEmployee-setPassword';
                            const nameId = isNew ? 'addUser-setName' : 'addEmployee-setName';
                            const surnameId = isNew ? 'addUser-setSurname' : 'addEmployee-setSurname';
                            const departmentId = isNew ? 'addUser-setDepartment' : null;

                            Cypress.Promise.all([
                              cy.setStr(emailId, mail),
                              cy.setStr(passwordId, pw),
                              cy.setStr(nameId, vorname),
                              cy.setStr(surnameId, nachname),
                              department !== '' && departmentId ? cy.setStr(departmentId, department) : cy.wrap('1'),
                            ]).then(() => {
                              cy.get('button#modal_submit').click().then(()=>{ //cy.contains('button', /SUBMIT/).click().then(()=>{
                                cy.assertToastOneOf([
                                  'User created successfully',
                                  'Nutzer wurde erfolgreich erstellt',
                                ]).then(()=>{
                                  return cy.wrap('1');
                                })
                              });
                            });
                          });
                      });
                  });
              //});
          });
      });
  });
});

Cypress.Commands.add('deleteUser', (mail, ff=false)=>{
  cy.visit('/admin').then(()=>{
    cy.url().should('contains', '/admin').then(()=> {
      cy.get('button#userManagement').click().then(()=>{
          //cy.get('div.employee-button-wrapper').should('be.visible').then(()=>{
              cy.clickFirst(['button#deleteUser', 'button#deleteEmployee']).then(()=>{
                cy.on('window:confirm', () => true);
                cy.filterUsersByEmail(mail).then(() => {
                  cy.get(`[id="${mail}"]`).find('button').click().then(() => {
                    if (ff) {
                      cy.get('body').then(($body) => {
                        if ($body.find('button#delete_ff_btn_yes').length > 0) {
                          cy.get('button#delete_ff_btn_yes').click();
                        }
                      });
                    }

                    cy.assertToastOneOf([
                      'User deleted successfully',
                      'Nutzer wurde erfolgreich gelöscht',
                    ]).then(() => cy.wrap('1'));
                  });
                });
              });
          //})
      })
    })
  })
});

Cypress.Commands.add('getAmountOfUsersForMail', (mail) => {
  cy.visit('/admin').then(()=>{
    cy.url().should('contains', '/admin').then(()=> {
      cy.get('button#userManagement').click().then(()=>{
        //cy.get('div.employee-button-wrapper').should('be.visible').then(()=>{
          cy.clickFirst(['button#deleteUser', 'button#deleteEmployee']).then(()=>{
            cy.filterUsersByEmail(mail).then(() => {
              cy.wait(500).then(() => {
                cy.get('tbody').then(($tbody) => {
                  const length = $tbody.find('tr').length;
                  cy.get('button#modal_close').click({ force: true }).then(() => cy.wrap(length));
                });
              });
            });
          });
        //})
      })
    })   
  })
});

// ##################################################################

Cypress.Commands.add('setFloor', (buildingId, floorId, imgSrc) => {
  cy.get('div#Floor_FloorImage_floorSelector_setBuilding').click().then(()=>{
    cy.wait(1000).then(()=>{
      cy.get(`li#Floor_FloorImage_building_${buildingId}`).click().then(()=>{
        cy.wait(1000).then(()=>{
          cy.get('div#Floor_FloorImage_floorSelector_setFloor').click().then(()=>{
            cy.wait(1000).then(()=>{
              cy.get(`li#Floor_FloorImage_floor_${floorId}`).click().then(()=>{
                cy.get('img').should('exist').should('have.attr', 'src').and('include', imgSrc).then(()=>{
                  cy.wrap('1');
                })
              })
            })
          })
        })
      })
    })
  })
});

Cypress.Commands.add('rmRoom', (buildingId, floorId, roomRemark, imgSrc) => {
  cy.visit('/admin').then(()=>{
    cy.get('button#roomManagement').click().then(()=>{
      cy.get('button#deleteRoom').click().then(()=>{
        cy.setFloor(buildingId, floorId, imgSrc).then(()=>{    
          cy.get(`#icon_button_${roomRemark}`).should('exist').click().then(()=>{
            cy.wait(1000).then(()=>{
              const delete_ff_btn_yes = Cypress.$('button#delete_ff_btn_yes');
              if (0 !== delete_ff_btn_yes.length) {
                cy.get('button#delete_ff_btn_yes').click().then(()=>{
                  cy.get('.Toastify__toast').should('be.visible').contains('Room was deleted successfully').then(()=>{
                    return cy.wrap('1');
                  })
                })
              }
              else {
                cy.get('.Toastify__toast').should('be.visible').contains('Room was deleted successfully').then(()=>{
                  return cy.wrap('1');
                })
              }
            })
          })
        })
      })
    })
  })
});

Cypress.Commands.add('addRoom', (buildingId, floorId, roomRemark, imgSrc, roomType='normal', status='enable') => {
  cy.visit('/admin')
  .get('button#roomManagement').click()
  .get('button#addRoom').click()
  .setFloor(buildingId, floorId, imgSrc).then(()=>{
    Cypress.Promise.all([
      cy.setStr('roomDefinition_setType', roomType),
      cy.setStr('roomDefinition_setStatus', status),
      cy.setStr('roomDefinition_setRemark', roomRemark)
    ]).then(()=> {
      cy.get('img').click()
      .get('button#modal_submit').click()
      .get('.Toastify__toast').should('be.visible').contains('Room was created successfully').then(()=>{
        return cy.wrap('1');
      });
    });   
  }); 
});

Cypress.Commands.add('rmDesk', (buildingId, floorId, roomRemark, imgSrc, deskRemark) => {
  cy.visit('/admin')
  .get('button#roomManagement').click()
  .get('button#deleteWorkstation').click()
  .setFloor(buildingId, floorId, imgSrc)
  .get(`button#icon_button_${roomRemark}`).click()
  .get('div#deskSelector').click()
  .get('div').contains(`${deskRemark}`).click()
  .get('button#modal_submit').click()
  cy.wait(1000).then(()=>{
      const delete_ff_btn_yes = Cypress.$('button#delete_ff_btn_yes');
      if (0 !== delete_ff_btn_yes.length) {
        cy.get('button#delete_ff_btn_yes').click().then(()=>{
          cy.get('.Toastify__toast').should('be.visible').contains('Desk deleted successfully').then(()=>{
            return cy.wrap('1');
          })
        })
      }
      else {
        cy.get('.Toastify__toast').should('be.visible').contains('Desk deleted successfully').then(()=>{
          return cy.wrap('1');
        })
      }
    });
});

/**
 * Must be logged in as admin.
 */
Cypress.Commands.add('addDesk', (buildingId, floorId, roomRemark, imgSrc, deskRemark, equipment='withEquipment')=>{
  cy.visit('/admin').then(()=>{
    cy.get('button#roomManagement').click().then(()=>{
      cy.get('button#addWorkstation').click().then(()=>{
        cy.setFloor(buildingId, floorId, imgSrc).then(()=>{ 
          cy.get(`button#icon_button_${roomRemark}`).click().then(()=>{
            Cypress.Promise.all([
              cy.setStr('workstationDefinition_setEquipment', equipment),
              cy.setStr('workStationDefinition_setRemark', deskRemark)
            ]).then(()=>{
              cy.get('button#modal_submit').click().then(()=>{
                cy.get('.Toastify__toast').should('be.visible').contains('Desk created successfully').then(()=>{
                  return cy.wrap('1');
                })
              })
            })
          })
        })
      })
    })
  })
});

Cypress.Commands.add('rmAllRooms', (buildingId, floorId, roomRemark, imgSrc)=>{
  cy.visit('/admin')
  .get('button#roomManagement').click()
  .get('button#deleteRoom').click()
  .setFloor(buildingId, floorId, imgSrc)
  .wait(1000).then(()=>{ // !
    Cypress.$(`button#icon_button_${roomRemark}`).each((_, el)=>{
      cy.wrap(el).click({force: true}).then(()=>{
        cy.wait(1000).then(()=>{ // !
          const delete_ff_btn_yes = Cypress.$('button#delete_ff_btn_yes');
          if (0 !== delete_ff_btn_yes.length) {
            cy.get('button#delete_ff_btn_yes').click().then(()=>{})
          }
          else {
            cy.get('.Toastify__toast').should('be.visible').contains('Room was deleted successfully').then(()=>{})
          }
        })
      })
    })
  })    
});

const months = [
  'January', 'February', 'March', 'April',
  'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December'
]

function compareMonths(m1, m2) {
  return months.indexOf(m1) - months.indexOf(m2)
}

Cypress.Commands.add('addBookingOnDate', (day, month, year, buildingId, floorId, roomRemark, deskRemark, imgSrc, start_timeslot, end_timeslot) => {
  cy.url().should('contains', '/home')
  .get('span.rbc-toolbar-label').then($el=>{
      const arrDate = $el.text().split(' ');
      const currMonth = arrDate[0];
      const currYear = arrDate[1];
      const diffYears = Number(year) - Number(currYear);
      const buttonPushes = diffYears*12+compareMonths(month, currMonth);
      const buttonText = buttonPushes > 0 ? 'Next' : 'Back';
      for (let i = 0; i <  buttonPushes; i++) {
          cy.contains('button', buttonText).click().then(()=>{
              cy.wait(200);
          })
      }
      cy.get('div.rbc-day-bg')
      .eq(Number(day) - 1)
      .click()
      .wait(1000)
      .setFloor(buildingId, floorId, imgSrc)
      .wait(1000)
      .get(`button#icon_button_${roomRemark}`).click()
      .wait(1000)
      .get('p').contains(`${deskRemark}`).click({ force: true })
      .selectTimeRange(start_timeslot, end_timeslot)
      .get('button#submit_booking_btn').click()
      .wait(1000)
      .get('.react-confirm-alert').should('be.visible').contains(deskRemark).get('button').contains('Yes').click()
      cy.get('.Toastify__toast').should('be.visible').contains('Booking saved successfully')
      .then(()=>{
          return cy.wrap('1');
      })
              
    
  })
});

Cypress.Commands.add('addBooking', (buildingId, floorId, roomRemark, imgSrc, deskRemark, start_timeslot, end_timeslot, checkForSuccess) => {
  cy.visit('/floor').then(()=>{
    cy.setFloor(buildingId, floorId, imgSrc).then(()=>{
      cy.get(`button#icon_button_${roomRemark}`).click().then(()=>{
        cy.get('p').contains(`${deskRemark}`).click({ force: true }).then(()=>{
          cy.selectTimeRange(start_timeslot, end_timeslot).then(()=>{
            cy.get('button#submit_booking_btn').click().then(()=>{
              cy.wait(1000).then(()=>{
                cy.get('.react-confirm-alert').should('be.visible').contains(deskRemark).get('button').contains('Yes').click().then(()=>{
                  cy.get('.Toastify__toast').should('be.visible').contains('Booking saved successfully').then(()=>{
                    return cy.wrap('1');
                  })
                })
              })
            })
          })
        })
      })
    })
  });
});

Cypress.Commands.add('countBookings', (roomRemark) => {
  cy.visit('/admin').then(()=>{
      cy.url().should('contains', '/admin').then(()=> {
      cy.get('button#bookingManagement').click().then(()=>{
        cy.wait(2000).then(()=>{
          //cy.get('button#overviewBooking').click().then(()=>{
            cy.wait(2000).then(()=>{
              Cypress.Promise.all([
                cy.setStr('overviewBookings_setFilter','/roomRemark/'),
                cy.setStr('textfield_overviewbooking', roomRemark)
              ]).then(()=>{
                cy.wait(3000).then(()=>{
                  cy.get('table tr').then((rows) => {
                    cy.wait(3000).then(()=>{
                      // -1 cause the head of the table also contains a row
                      return cy.wrap(rows.length - 1);
                    });
                  })
                })
              })
            })
          //})
        })
      })
    })
  })
});

// ##################################################################

Cypress.Commands.add('buildUp', (building, floor, roomRemark, deskRemark)=>{
  cy.login().then(()=>{
    cy.visit('/floor').then(()=> {
      cy.wait(1000).then(()=> { // !
        cy.rmAllRooms(building, floor, roomRemark).then(()=>{
          cy.addRoom(building, floor, roomRemark).then(()=>{
            cy.addDesk(building, floor, roomRemark, deskRemark).then(()=>{
              return cy.wrap('1');
            })
          })
        })
      })
    })
  })
});

Cypress.Commands.add('tearDown', (building, floor, roomRemark)=>{
  cy.login().then(()=>{
    cy.visit('/floor').then(()=> {
      cy.wait(1000).then(()=> { // !
        cy.rmAllRooms(building, floor, roomRemark).then(()=>{
          return cy.wrap('1');
        })
      })
    })
  })
});
