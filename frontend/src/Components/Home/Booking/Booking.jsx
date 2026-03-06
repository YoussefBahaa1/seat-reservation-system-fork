import { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Button, Typography, IconButton, Tooltip/*, FormControl, RadioGroup, FormControlLabel, Radio */} from '@mui/material';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-confirm-alert/src/react-confirm-alert.css';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { confirmAlert } from 'react-confirm-alert';
import { FaStar, FaRegStar } from 'react-icons/fa';

import LayoutPage from '../../Templates/LayoutPage.jsx';
import { getRequest, postRequest, putRequest, deleteRequest } from '../../RequestFunctions/RequestFunctions';
import bookingPostRequest from '../../misc/bookingPostRequest.js';
import ReportDefectModal from '../../Defects/ReportDefectModal';
//import { buildFullDaySlots } from './buildFullDaySlots.js';

const Booking = () => {
  const headers = useRef(JSON.parse(sessionStorage.getItem('headers')));
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const localizer = momentLocalizer(moment);
  const calendarFormats = {
    timeGutterFormat: (date, culture, loc) => loc.format(date, 'HH:mm', culture),
    eventTimeRangeFormat: ({ start, end }, culture, loc) =>
      `${loc.format(start, 'HH:mm', culture)} – ${loc.format(end, 'HH:mm', culture)}`,
    agendaTimeRangeFormat: ({ start, end }, culture, loc) =>
      `${loc.format(start, 'HH:mm', culture)} – ${loc.format(end, 'HH:mm', culture)}`,
  };
  const { roomId, date, editBooking } = location.state || {};
  const isEditMode = Boolean(editBooking && editBooking.bookingId);
  const initialDate = date ? new Date(date) : new Date();

  //Safe selection of desks
  const selectionKey = `bookingSelection:${roomId}:${date ? moment(date).format('YYYY-MM-DD') : ''}`;

  // States
  const [room, setRoom] = useState(null);
  const [desks, setDesks] = useState([]);
  const [events, setEvents] = useState([]);
  const [event, setEvent] = useState({});
  const [isBookingPending, setIsBookingPending] = useState(false);
  const [clickedDeskId, setClickedDeskId] = useState(null);
  const [clickedDeskRemark, setClickedDeskRemark] = useState('');
  const [isFavourite, setIsFavourite] = useState(false);
  const [bookingSettings, setBookingSettings] = useState({
    leadTimeMinutes: 30,
    maxDurationMinutes: 360,
    maxAdvanceDays: 30,
  });
  const [isReportDefectOpen, setIsReportDefectOpen] = useState(false);

  const eventRef = useRef(event);
  const eventsRef = useRef(events);
  const bookingPendingRef = useRef(false);

  const setBookingPending = useCallback((value) => {
    bookingPendingRef.current = value;
    setIsBookingPending(value);
  }, []);

  const minStartTime = 6;
  const maxEndTime = 22;
  const typography_sx = { margin: '5px', textAlign: 'center' };

  /** ----- API FETCH FUNCTIONS ----- */
  const fetchRoom = useCallback(() => {
    getRequest(
      `${process.env.REACT_APP_BACKEND_URL}/rooms/${roomId}`,
      headers.current,
      setRoom,
      () => console.error('Failed to fetch room')
    );
  }, [roomId]);

  const fetchDesks = useCallback(() => {
    getRequest(
      `${process.env.REACT_APP_BACKEND_URL}/desks/room/${roomId}`,
      headers.current,
      setDesks,
      () => console.error('Failed to fetch desks')
    );
  }, [roomId]);

  const fetchBookingSettings = useCallback(() => {
    getRequest(
      `${process.env.REACT_APP_BACKEND_URL}/booking-settings`,
      headers.current,
      (data) => setBookingSettings(data),
      () => console.error('Failed to fetch booking settings')
    );
  }, []);

  const loadBookings = useCallback(() => {
    if (!clickedDeskId) return;

    getRequest(
      `${process.env.REACT_APP_BACKEND_URL}/bookings/bookingsForDesk/${clickedDeskId}`,
      headers.current,
      (bookings) => {
        const filteredBookings = isEditMode && editBooking?.bookingId
          ? bookings.filter((b) => b.booking_id !== editBooking.bookingId)
          : bookings;
        const bookingEvents = filteredBookings.map((b) => ({
          start: new Date(`${b.day}T${b.begin}`),
          end: new Date(`${b.day}T${b.end}`),
          title:
            b.user_id.toString() === localStorage.getItem('userId')
              ? t('you')
              : (localStorage.getItem('admin') === 'true'
                  ? `${b.name || ''} ${b.surname || ''}`.trim() || b.displayName || ''
                  : b.displayName || ''),
          id: b.booking_id,
        }));
        //setDeskEvents(bookingEvents);
        if (isEditMode && editBooking?.deskId === clickedDeskId) {
          const editStart = new Date(`${editBooking.day}T${editBooking.begin}`);
          const editEnd = new Date(`${editBooking.day}T${editBooking.end}`);
          const editSelection = { start: editStart, end: editEnd, id: 1 };
          setEvents([...bookingEvents, editSelection]);
          setEvent(editSelection);
        } else {
          setEvents(bookingEvents);
        }
      },
      () => console.error('Failed to fetch bookings')
    );
  }, [clickedDeskId, editBooking, isEditMode, t]);

  const selectSlot = useCallback((slotData, currentEventId) => {
    if (!slotData) return;

    const startTime = new Date(slotData.start);
    const endTime = new Date(slotData.end);
    const duration = endTime - startTime;

    // Block bookings in the past
    const now = new Date();
    const startDay = new Date(startTime);
    startDay.setHours(0, 0, 0, 0);
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    if (startDay < today) {
      toast.warning(t('datePassed'));
      return;
    }

    // Lead time: earliest allowed start is rounded(now + leadTime)
    const leadMinutes = bookingSettings?.leadTimeMinutes ?? 0;
    const earliestAllowed = roundUpToNextHalfHour(new Date(now.getTime() + leadMinutes * 60000));
    if (startTime < earliestAllowed) {
      toast.warning(
        t('leadTimeExceeded', {
          value: leadMinutes,
          next: moment(earliestAllowed).format('HH:mm'),
        })
      );
      return;
    }

    if (duration < 2 * 60 * 60 * 1000) {
      toast.warning(t('minimum'));
      return;
    }

    if (bookingSettings?.maxDurationMinutes !== null && bookingSettings?.maxDurationMinutes !== undefined) {
      if (duration > bookingSettings.maxDurationMinutes * 60 * 1000) {
        toast.warning(t('maxDurationExceeded', { value: bookingSettings.maxDurationMinutes / 60 }));
        return;
      }
    }

    if (bookingSettings?.maxAdvanceDays !== null && bookingSettings?.maxAdvanceDays !== undefined) {
      const maxDate = new Date(today);
      maxDate.setDate(maxDate.getDate() + bookingSettings.maxAdvanceDays);
      if (startDay > maxDate) {
        toast.warning(t('maxAdvanceExceeded', { value: bookingSettings.maxAdvanceDays }));
        return;
      }
    }

    const updatedEvents = eventsRef.current.filter((e) => {
      if (e.id === currentEventId) return false;
      if (isEditMode && editBooking?.bookingId && e.id === editBooking.bookingId) return false;
      return true;
    });

    const isOverlap = updatedEvents.some(
      (e) =>
        (e.start <= startTime && startTime < e.end) ||
        (e.start < endTime && endTime <= e.end) ||
        (startTime <= e.start && e.end <= endTime)
    );
    if (isOverlap) {
      toast.warning(t('overlap'));
      return;
    }

    const newEvent = { start: slotData.start, end: slotData.end, id: 1 };
    setEvents([
      ...eventsRef.current.filter((e) => e.id !== 1),
      newEvent,
    ]);

    setEvent(newEvent);

  }, [editBooking, isEditMode, t, bookingSettings]);

  /** ----- EVENT FUNCTIONS ----- */
  const booking = async () => {
    if (bookingPendingRef.current) return;

    if (!clickedDeskId || !event.start || !event.end) {
      toast.error(t('blank'));
      return;
    }

    const userId = localStorage.getItem('userId');
    if (!userId) return console.error('userId is null');

    const startMoment = moment(event.start).seconds(0).milliseconds(0);
    const endMoment = moment(event.end).seconds(0).milliseconds(0);
    if (startMoment.minute() % 30 !== 0 || endMoment.minute() % 30 !== 0) {
      toast.warning(t('bookingTimeAlignmentError'));
      return;
    }

    const bookingDTO = {
      userId: userId,
      roomId: roomId,
      deskId: clickedDeskId,
      day: startMoment.format('YYYY-MM-DD'),
      begin: startMoment.format('HH:mm:ss'),
      end: endMoment.format('HH:mm:ss'),
    };

    if (!isEditMode) {
      setBookingPending(true);
      bookingPostRequest(
        'Booking.jsx',
        bookingDTO,
        clickedDeskRemark,
        headers,
        t,
        (booking) => navigate('/home', { state: { booking }, replace: true }),
        {
          onFinish: () => {
            setBookingPending(false);
          },
        }
      );
      return;
    }

    const originalDay = editBooking.day;
    const originalBegin = editBooking.begin;
    const originalEnd = editBooking.end;
    const originalDeskId = editBooking.deskId;
    const newDay = bookingDTO.day;
    const newBegin = bookingDTO.begin;
    const newEnd = bookingDTO.end;

    if (
      originalDeskId === clickedDeskId &&
      originalDay === newDay &&
      originalBegin === newBegin &&
      originalEnd === newEnd
    ) {
      navigate('/mybookings', { replace: true });
      return;
    }

    const oldBookingDTO = {
      userId: userId,
      roomId: roomId,
      deskId: originalDeskId,
      day: originalDay,
      begin: originalBegin,
      end: originalEnd,
    };

    const createAndConfirm = (dto, onSuccess, onFail) => {
      postRequest(
        `${process.env.REACT_APP_BACKEND_URL}/bookings`,
        headers.current,
        (data) => {
          putRequest(
            `${process.env.REACT_APP_BACKEND_URL}/bookings/confirm/${data.id}`,
            headers.current,
            (dat) => onSuccess(dat),
            () => onFail()
          );
        },
        () => onFail(),
        JSON.stringify(dto)
      );
    };

    const tryRestoreOld = () => {
      createAndConfirm(
        oldBookingDTO,
        () => {},
        () => {}
      );
    };

    const handleCreateThenDelete = () => {
      createAndConfirm(
        bookingDTO,
        () => {
          deleteRequest(
            `${process.env.REACT_APP_BACKEND_URL}/bookings/${editBooking.bookingId}`,
            headers.current,
            () => {
              setBookingPending(false);
              navigate('/mybookings', { replace: true });
            },
            () => {
              toast.error(t('httpOther'));
              setBookingPending(false);
              navigate('/mybookings', { replace: true });
            }
          );
        },
        () => {
          toast.error(t('httpOther'));
          setBookingPending(false);
        }
      );
    };

    const handleDeleteThenCreate = () => {
      deleteRequest(
        `${process.env.REACT_APP_BACKEND_URL}/bookings/${editBooking.bookingId}`,
        headers.current,
        () => {
          createAndConfirm(
            bookingDTO,
            () => {
              setBookingPending(false);
              navigate('/mybookings', { replace: true });
            },
            () => {
              tryRestoreOld();
              toast.error(t('httpOther'));
              setBookingPending(false);
            }
          );
        },
        () => {
          toast.error(t('httpOther'));
          setBookingPending(false);
        }
      );
    };

    const overlapsOld =
      originalDeskId === clickedDeskId &&
      originalDay === newDay &&
      (moment(newBegin, 'HH:mm:ss').isSameOrBefore(moment(originalEnd, 'HH:mm:ss')) &&
        moment(newEnd, 'HH:mm:ss').isSameOrAfter(moment(originalBegin, 'HH:mm:ss')));

    confirmAlert({
      title: t('editBooking'),
      message: `${t('date')} ${newDay} ${t('from')} ${newBegin} ${t('to')} ${newEnd}`,
      buttons: [
        {
          label: t('yes'),
          onClick: () => {
            if (bookingPendingRef.current) return;
            setBookingPending(true);
            if (overlapsOld) {
              handleDeleteThenCreate();
            } else {
              handleCreateThenDelete();
            }
          },
        },
        {
          label: t('no'),
          onClick: () => {},
        },
      ],
    });
  };
  /** ----- EFFECTS ----- */
  // Fetch room once
  useEffect(() => { fetchRoom(); }, [fetchRoom]);
  useEffect(() => { fetchBookingSettings(); }, [fetchBookingSettings]);

  useEffect(()=>{eventRef.current=event},[event])

  useEffect(()=>{eventsRef.current=events},[events])

  // Fetch desks when roomId changes
  useEffect(() => { if (roomId) fetchDesks(); }, [roomId, fetchDesks]);

  //Load saved desk selection from sessionStorage
  useEffect(() => {
    if (!desks.length) return;
    try {
      if (isEditMode && editBooking?.deskId) {
        const match = desks.find((desk) => desk.id === editBooking.deskId);
        if (match) {
          setClickedDeskId(match.id);
          setClickedDeskRemark(match.remark || '');
          sessionStorage.setItem(selectionKey, JSON.stringify({ deskId: match.id }));
          return;
        }
      }
      const saved = JSON.parse(sessionStorage.getItem(selectionKey));
      if (saved?.deskId) {
        const match = desks.find((desk) => desk.id === saved.deskId);
        if (match) {
          setClickedDeskId(match.id);
          setClickedDeskRemark(match.remark || '');
        }
      }
    } catch {
      // ignore invalid stored value
    }
  }, [desks, editBooking, isEditMode, selectionKey]);

  const refreshFavouriteStatus = useCallback(() => {
    const userId = localStorage.getItem('userId');
    if (!userId || !roomId) return;
    getRequest(
      `${process.env.REACT_APP_BACKEND_URL}/favourites/${userId}/room/${roomId}/isFavourite`,
      headers.current,
      (res) => setIsFavourite(Boolean(res)),
      () => setIsFavourite(false)
    );
  }, [roomId]);

  // Check favourite status for the current room when room changes
  useEffect(() => {
    refreshFavouriteStatus();
  }, [refreshFavouriteStatus]);

  // Reload bookings when clicked desk changes
  useEffect(() => { if (clickedDeskId) loadBookings(); }, [clickedDeskId, loadBookings]);

  // Set locale for calendar
  useEffect(() => { moment.locale(i18n.language === 'en' ? 'en-gb' : i18n.language); }, [i18n.language]);

  const toggleFavourite = () => {
    const userId = localStorage.getItem('userId');
    if (!userId || !roomId) return;

    const onSuccess = () => {
      setIsFavourite((prev) => !prev);
      toast.success(!isFavourite ? t('addFavourite') : t('removeFavourite'));
    };
    const onFail = () => {
      refreshFavouriteStatus();
      toast.error(t('favouriteToggleError'));
    };

    if (isFavourite) {
      deleteRequest(
        `${process.env.REACT_APP_BACKEND_URL}/favourites/${userId}/room/${roomId}`,
        headers.current,
        onSuccess,
        onFail
      );
    } else {
      postRequest(
        `${process.env.REACT_APP_BACKEND_URL}/favourites/${userId}/room/${roomId}`,
        headers.current,
        onSuccess,
        onFail
      );
    }
  };

  /** ----- HELPER ----- */
  const getHeadline = () => t('availableDesks') + (room ? ` in ${room.remark}` : '');
  const FALLBACK_PLACEHOLDER = '—';

  const showOrPlaceholder = (value) => {
    if (value === null || value === undefined) return FALLBACK_PLACEHOLDER;
    const str = String(value).trim();
    return str ? str : FALLBACK_PLACEHOLDER;
  };

  const monitorSummary = (desk) => {
    const quantity = desk?.monitorsQuantity;
    const size = desk?.monitorsSize;
    if (quantity == null && (size == null || String(size).trim() === '')) {
      return FALLBACK_PLACEHOLDER;
    }
    if (quantity != null && size != null && String(size).trim() !== '') {
      return `${quantity} x ${String(size).trim()}`;
    }
    return showOrPlaceholder(quantity ?? size);
  };

  const deskTypeSummary = (desk) => {
    if (desk?.deskHeightAdjustable === true) return 'yes';
    if (desk?.deskHeightAdjustable === false) return 'no';
    return FALLBACK_PLACEHOLDER;
  };

  const technologySummary = (desk) => {
    const items = [];
    if (desk?.technologyDockingStation === true) items.push('docking station');
    if (desk?.technologyWebcam === true) items.push('webcam');
    if (desk?.technologyHeadset === true) items.push('headset');
    return items.length ? items.join(', ') : FALLBACK_PLACEHOLDER;
  };

  function roundUpToNextHalfHour(d) {
    const rounded = new Date(d);
    rounded.setSeconds(0);
    rounded.setMilliseconds(0);

    const m = rounded.getMinutes();
    if (m === 0 || m === 30) return rounded;

    if (m < 30) {
      rounded.setMinutes(30);
    } else {
      rounded.setMinutes(0);
      rounded.setHours(rounded.getHours() + 1);
    }
    return rounded;
  }

  /** ----- JSX ----- */
  return (
    <LayoutPage
      title={getHeadline()}
      helpText={t('helpCreateBooking')}
      useGenericBackButton
      withPaddingX
    >
      <Box sx={{ display: 'flex', width: '100%' }}>
        {/* Desks List */}
        <Box id="desks" sx={{ width: '20%', paddingRight: '20px' }}>
          {desks.length ? (
            desks.map((desk) => (
              <Box key={desk.id} sx={{ display: 'flex', margin: '25px', justifyContent: 'space-between', width: '210px' }}>
                <Box>{desk.deskNumberInRoom}.</Box>
                <Tooltip
                  arrow
                  placement="right"
                  title={
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                      {desk.blocked && (
                        <>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: '#ff9800' }}>
                            {t('defectBlocked')}
                          </Typography>
                          {desk.blockedReasonCategory && (
                            <Typography variant="caption">
                              {t('defectBlockedReason', { reason: desk.blockedReasonCategory.replace(/_/g, ' ') })}
                            </Typography>
                          )}
                          {desk.blockedEstimatedEndDate && (
                            <Typography variant="caption">
                              {t('defectBlockedUntil', { date: desk.blockedEstimatedEndDate })}
                            </Typography>
                          )}
                        </>
                      )}
                      <Typography variant="caption">{t('booking.tooltip.identifier')}: {showOrPlaceholder(desk?.workstationIdentifier)}</Typography>
                      <Typography variant="caption">{t('booking.tooltip.type')}: {showOrPlaceholder(desk?.workstationType)}</Typography>
                      <Typography variant="caption">{t('booking.tooltip.monitors')}: {monitorSummary(desk)}</Typography>
                      <Typography variant="caption">{t('booking.tooltip.deskTypeHeightAdjustable')}: {deskTypeSummary(desk)}</Typography>
                      <Typography variant="caption">{t('booking.tooltip.technology')}: {technologySummary(desk)}</Typography>
                      <Typography variant="caption">{t('booking.tooltip.specialFeatures')}: {showOrPlaceholder(desk?.specialFeatures)}</Typography>
                    </Box>
                  }
                >
                  <Box
                    sx={{
                      backgroundColor: desk.blocked
                        ? '#bdbdbd'
                        : desk.id === clickedDeskId ? '#ffdd00' : 'yellowgreen',
                      height: '125px',
                      width: '140px',
                      borderRadius: '7px',
                      padding: '5px',
                      cursor: desk.blocked ? 'not-allowed' : 'pointer',
                      opacity: desk.blocked ? 0.6 : 1,
                      boxShadow: '0px 0px 5px rgba(0,0,0,0.2)',
                      transition: desk.id === clickedDeskId ? '0.25s' : 'box-shadow 0.3s',
                      '&:hover': { boxShadow: desk.blocked ? undefined : '0px 0px 10px rgba(0,0,0,0.4)' },
                    }}
                    onClick={() => {
                      if (desk.blocked) {
                        toast.warning(t('defectAlreadyOpen'));
                        return;
                      }
                      setClickedDeskId(desk.id);
                      setClickedDeskRemark(desk.remark);
                      sessionStorage.setItem(selectionKey, JSON.stringify({ deskId: desk.id }));
                    }}
                  >
                    <Typography sx={typography_sx}>{desk.remark}</Typography>
                    <Typography sx={typography_sx}>{t(desk.equipment.equipmentName)}</Typography>
                    {desk.blocked && (
                      <Typography sx={{ ...typography_sx, fontSize: '0.7rem', color: '#d32f2f', fontWeight: 600 }}>
                        {t('defectBlocked')}
                      </Typography>
                    )}
                  </Box>
                </Tooltip>
              </Box>
            ))
          ) : (
            <Typography sx={typography_sx}>{t('noAvailableDesks')}</Typography>
          )}
        </Box>

        {/* Calendar + Controls */}
        <Box sx={{ width: '80%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, marginRight: '10px' }}>
          <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', pr: 2 }}>
            <Tooltip title={isFavourite ? t('removeFavourite') : t('addFavourite')}>
              <IconButton
                onClick={toggleFavourite}
                aria-label="toggle-favourite"
                sx={{ color: isFavourite ? '#ffb300' : '#9e9e9e', fontSize: '22px' }}
              >
                {isFavourite ? <FaStar /> : <FaRegStar />}
              </IconButton>
            </Tooltip>
          </Box>
          {/*<FormControl>
            <RadioGroup
              row
              id='radioGrouptimeRangeMode'
              name='radio-buttons-group'
              value={timeRangeMode}
              onChange={(e) => setTimeRangeMode(e.target.value)}
            >
              <FormControlLabel
                disabled={!clickedDeskId}
                value='userDefined'
                control={<Radio />}
                label={i18n.language === 'de' ? 'Nutzerdefiniert' : 'Userdefined'}
              />
              <FormControlLabel
                disabled={!clickedDeskId}
                value='fullDay'
                control={<Radio />}
                label={i18n.language === 'de' ? 'Ganztägig' : 'Whole day'}
              />
            </RadioGroup>
          </FormControl>*/}

          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            views={['day', 'week']}
            defaultView="day"
            defaultDate={initialDate}
            onSelectSlot={(data) => (clickedDeskId ? selectSlot(data, event.id) : toast.warning(t('selectDeskMessage')))}
            selectable
            min={new Date(0, 0, 0, minStartTime, 0, 0)}
            max={new Date(0, 0, 0, maxEndTime, 0, 0)}
            formats={calendarFormats}
            eventPropGetter={(event) => ({
              style: {
                backgroundColor: events.some((e) => e.id === event.id) ? 'grey' : '#008444',
              },
            })}
            messages={{
              next: t('next'),
              previous: t('back'),
              today: t('today'),
              month: t('month'),
              week: t('week'),
              day: t('day'),
              agenda: t('agenda'),
              noEventsInRange: t('noEventsInRange'),
            }}
          />

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              id="submit_booking_btn"
              sx={{
                margin: '10px',
                padding: '15px',
                backgroundColor: '#008444',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '16px',
                textAlign: 'center',
                transition: 'all 0.5s',
                '&.Mui-disabled': {
                  backgroundColor: '#7a7a7a',
                  color: '#fff',
                  opacity: 0.8,
                },
              }}
              onClick={booking}
              disabled={isBookingPending}
              aria-busy={isBookingPending ? 'true' : 'false'}
            >
              {t('book')}
            </Button>
            {clickedDeskId && (
              <Button
                id="report_defect_btn"
                sx={{
                  margin: '10px',
                  padding: '15px',
                  backgroundColor: '#d32f2f',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '16px',
                  textAlign: 'center',
                  transition: 'all 0.5s',
                  '&:hover': { backgroundColor: '#b71c1c' },
                }}
                onClick={() => {
                  const desk = desks.find(d => d.id === clickedDeskId);
                  if (desk && desk.blocked) {
                    toast.warning(t('defectAlreadyOpen'));
                    return;
                  }
                  getRequest(
                    `${process.env.REACT_APP_BACKEND_URL}/defects/active?deskId=${clickedDeskId}`,
                    headers.current,
                    () => toast.warning(t('defectAlreadyOpen')),
                    (status) => {
                      if (status === 404) {
                        setIsReportDefectOpen(true);
                      } else {
                        toast.error(t('defectReportFailed'));
                      }
                    }
                  );
                }}
              >
                {t('reportDefect')}
              </Button>
            )}
          </Box>
        </Box>
      </Box>

      <ReportDefectModal
        isOpen={isReportDefectOpen}
        onClose={() => setIsReportDefectOpen(false)}
        deskId={clickedDeskId}
      />
    </LayoutPage>
  );
};

export default Booking;
