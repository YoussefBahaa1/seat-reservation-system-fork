import { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Button, Typography, IconButton, Tooltip/*, FormControl, RadioGroup, FormControlLabel, Radio */} from '@mui/material';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-confirm-alert/src/react-confirm-alert.css';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaStar, FaRegStar } from 'react-icons/fa';

import LayoutPage from '../../Templates/LayoutPage.jsx';
import { getRequest, postRequest, deleteRequest } from '../../RequestFunctions/RequestFunctions';
import bookingPostRequest from '../../misc/bookingPostRequest.js';
//import { buildFullDaySlots } from './buildFullDaySlots.js';

const Booking = () => {
  const headers = useRef(JSON.parse(sessionStorage.getItem('headers')));
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const localizer = momentLocalizer(moment);
  const { roomId, date } = location.state;

  //Safe selection of desks
  const selectionKey = `bookingSelection:${roomId}:${date ? moment(date).format('YYYY-MM-DD') : ''}`;

  // States
  const [room, setRoom] = useState(null);
  const [desks, setDesks] = useState([]);
  const [events, setEvents] = useState([]);
  const [event, setEvent] = useState({});
  const [clickedDeskId, setClickedDeskId] = useState(null);
  const [clickedDeskRemark, setClickedDeskRemark] = useState('');
  const [isFavourite, setIsFavourite] = useState(false);

  const eventRef = useRef(event);
  const eventsRef = useRef(events);

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

  const loadBookings = useCallback(() => {
    if (!clickedDeskId) return;

    getRequest(
      `${process.env.REACT_APP_BACKEND_URL}/bookings/bookingsForDesk/${clickedDeskId}`,
      headers.current,
      (bookings) => {
        const bookingEvents = bookings.map((b) => ({
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
        setEvents(bookingEvents);
      },
      () => console.error('Failed to fetch bookings')
    );
  }, [clickedDeskId, t]);

  const selectSlot = useCallback((slotData, currentEventId) => {
    if (!slotData) return;

    const startTime = new Date(slotData.start);
    const endTime = new Date(slotData.end);
    const duration = endTime - startTime;

    // Block bookings in the past
    const now = new Date();
    // Compare only by date
    const startDay = new Date(startTime);
    startDay.setHours(0, 0, 0, 0);
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    // Past day → hard block
    if (startDay < today) {
      toast.warning(t('datePassed')); // "This date has already passed."
      return;
    }

// Today → start must be >= next 30-min slot boundary
if (startDay.getTime() === today.getTime()) {
  const earliestStart = roundUpToNextHalfHour(now);
  if (startTime < earliestStart) {
    toast.warning(t('timePassed')); // "This time has already passed."
    return;
  }
}

    if (duration < 2 * 60 * 60 * 1000) {
      toast.warning(t('minimum'));
      return;
    }

    const updatedEvents = eventsRef.current.filter((e) => e.id !== currentEventId);
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

  }, [t]);

  /** ----- EVENT FUNCTIONS ----- */
  const booking = async () => {
    if (!clickedDeskId || !event.start || !event.end) {
      toast.error(t('blank'));
      return;
    }

    const userId = localStorage.getItem('userId');
    if (!userId) return console.error('userId is null');

    const bookingDTO = {
      userId: userId,
      roomId: roomId,
      deskId: clickedDeskId,
      day: moment(event.start).format('YYYY-MM-DD'),
      begin: moment(event.start).format('HH:mm:ss'),
      end: moment(event.end).format('HH:mm:ss'),
    };

    bookingPostRequest(
      'Booking.jsx',
      bookingDTO,
      clickedDeskRemark,
      headers,
      t,
      (booking) => navigate('/home', { state: { booking }, replace: true })
    );
  };

  /** ----- EFFECTS ----- */
  // Fetch room once
  useEffect(() => { fetchRoom(); }, [fetchRoom]);

  useEffect(()=>{eventRef.current=event},[event])

  useEffect(()=>{eventsRef.current=events},[events])

  // Fetch desks when roomId changes
  useEffect(() => { if (roomId) fetchDesks(); }, [roomId, fetchDesks]);

  //Load saved desk selection from sessionStorage
  useEffect(() => {
    if (!desks.length) return;
    try {
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
  }, [desks, selectionKey]);

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
  useEffect(() => { moment.locale(i18n.language); }, [i18n.language]);

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
                      backgroundColor: desk.id === clickedDeskId ? '#ffdd00' : 'yellowgreen',
                      height: '125px',
                      width: '140px',
                      borderRadius: '7px',
                      padding: '5px',
                      cursor: 'pointer',
                      boxShadow: '0px 0px 5px rgba(0,0,0,0.2)',
                      transition: desk.id === clickedDeskId ? '0.25s' : 'box-shadow 0.3s',
                      '&:hover': { boxShadow: '0px 0px 10px rgba(0,0,0,0.4)' },
                    }}
                    onClick={() => {
                      setClickedDeskId(desk.id);
                      setClickedDeskRemark(desk.remark);

                      // Save selection to sessionStorage 
                      sessionStorage.setItem(selectionKey, JSON.stringify({ deskId: desk.id }));
                    }}
                  >
                    <Typography sx={typography_sx}>{desk.remark}</Typography>
                    <Typography sx={typography_sx}>{t(desk.equipment.equipmentName)}</Typography>
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
            defaultDate={date}
            onSelectSlot={(data) => (clickedDeskId ? selectSlot(data, event.id) : toast.warning(t('selectDeskMessage')))}
            selectable
            min={new Date(0, 0, 0, minStartTime, 0, 0)}
            max={new Date(0, 0, 0, maxEndTime, 0, 0)}
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
            }}
            onClick={booking}
          >
            {t('book')}
          </Button>
        </Box>
      </Box>
    </LayoutPage>
  );
};

export default Booking;
