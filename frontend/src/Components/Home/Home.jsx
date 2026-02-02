import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/de';
import './Home.css';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useTranslation } from 'react-i18next';
import { getRequest, postRequest } from '../RequestFunctions/RequestFunctions';
import LayoutPage from '../Templates/LayoutPage';
import { toast } from 'react-toastify';
import { FormControl, InputLabel, Select, MenuItem, Tooltip, IconButton, ListSubheader, Checkbox, ListItemText } from '@mui/material';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import DesktopWindowsIcon from '@mui/icons-material/DesktopWindows';

const Home = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [now, setNow] = useState(moment());
  const [selectedDate, setSelectedDate] = useState(moment().startOf('day').toDate());
  const [dayEvents, setDayEvents] = useState([]);
  const [mode, setMode] = useState(() => sessionStorage.getItem('homeDayMode') || 'desk');
  const [selectedRooms, setSelectedRooms] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('homeDayRooms') || '[]');
    } catch {
      return [];
    }
  });
  const [selectedDeskTypes, setSelectedDeskTypes] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('homeDayDeskTypes') || '[]');
    } catch {
      return [];
    }
  });
  const [selectedParkingTypes, setSelectedParkingTypes] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('homeDayParkingTypes') || '[]');
    } catch {
      return [];
    }
  });
  const headers = useRef(JSON.parse(sessionStorage.getItem('headers')));

  const handleSelectSlot = ({ start }) => {
    setSelectedDate(moment(start).startOf('day').toDate());
  };

  // Generate days of the month and fetch bookings
  const generateMonthDays = useCallback(
    async (date) => {
      const currentMonth = moment(date).startOf('month');
      const daysInMonth = [];
      const eventsForMonth = [];
  
      // Erstellen der Tage des Monats
      for (let i = 0; i < currentMonth.daysInMonth(); i++) {
        const day = currentMonth.clone().add(i, 'days');
        daysInMonth.push(day.format('YYYY-MM-DD'));
      }
  
      // Load bookings for the month
      postRequest(
        `${process.env.REACT_APP_BACKEND_URL}/bookings/getAllBookingsForDate`,
        headers.current,
        (data) => {
          for (const day in data) {
            const newEvent = {
              start: moment(day).startOf('day').toDate(),
              end: moment(day).endOf('day').toDate(),
              title: `${t('bookingsSum')}: ${data[day]}`,
              allDay: true,
              resource: { count: data[day] }
            };
            eventsForMonth.push(newEvent);
          }
          setEvents(eventsForMonth);  // Ereignisse für den Monat setzen
          setNow(date);  // Aktuelles Datum setzen
        },
        (errorCode) => { 
          console.log('Fehler beim Abrufen der Buchungen:', errorCode);
          toast.error(t(errorCode+''));          
        },
        JSON.stringify(daysInMonth)  // Tage des Monats an den Server senden
      );
    },
    [headers, t, setEvents, setNow]  // Abhängigkeiten, die sich ändern könnten
  );

  // Call generateMonthDays when changes occur
  useEffect(() => {
    generateMonthDays(now);
  }, [t, generateMonthDays, now]);

  // Handle different month navigation
  const handleNavigate = (newDate, view) => {
    if (view === 'month') {
      generateMonthDays(newDate);
    }
  };

  const localizer = momentLocalizer(moment);

  useEffect(() => {
    // Change moment locale whenever language changes
    moment.locale(i18n.language);
  }, [i18n.language]);

  useEffect(() => {
    const dayString = moment(selectedDate).format('YYYY-MM-DD');
    getRequest(
      `${process.env.REACT_APP_BACKEND_URL}/bookings/day/${dayString}`,
      headers.current,
      (data) => setDayEvents(Array.isArray(data) ? data : []),
      (errorCode) => {
        console.log('Error fetching day bookings:', errorCode);
        toast.error(t(errorCode + ''));
      }
    );
  }, [selectedDate, headers, t]);

  useEffect(() => {
    sessionStorage.setItem('homeDayMode', mode);
    sessionStorage.setItem('homeDayRooms', JSON.stringify(selectedRooms));
    sessionStorage.setItem('homeDayDeskTypes', JSON.stringify(selectedDeskTypes));
    sessionStorage.setItem('homeDayParkingTypes', JSON.stringify(selectedParkingTypes));
  }, [mode, selectedRooms, selectedDeskTypes, selectedParkingTypes]);

  const roomOptions = useMemo(() => {
    const map = new Map();
    dayEvents.forEach((event) => {
      if (event.roomId && event.roomRemark) {
        map.set(String(event.roomId), event.roomRemark);
      }
    });
    return Array.from(map.entries()).map(([id, label]) => ({
      value: `room:${id}`,
      label
    }));
  }, [dayEvents]);

  const typeOptions = useMemo(() => {
    const set = new Set();
    dayEvents.forEach((event) => {
      const typeValue = mode === 'desk' ? event.workspaceType : event.parkingType;
      if (typeValue) {
        set.add(typeValue);
      }
    });
    return Array.from(set.values()).map((typeValue) => ({
      value: `type:${typeValue}`,
      label: t(typeValue)
    }));
  }, [dayEvents, mode, t]);

  const selectedValues = useMemo(() => {
    const roomValues = selectedRooms.map((roomId) => `room:${roomId}`);
    const typeValues =
      mode === 'desk'
        ? selectedDeskTypes.map((typeValue) => `type:${typeValue}`)
        : selectedParkingTypes.map((typeValue) => `type:${typeValue}`);
    return [...roomValues, ...typeValues];
  }, [selectedRooms, selectedDeskTypes, selectedParkingTypes, mode]);

  const handleFilterChange = (event) => {
    const values = event.target.value;
    const nextRooms = values
      .filter((value) => value.startsWith('room:'))
      .map((value) => value.replace('room:', ''));
    const nextTypes = values
      .filter((value) => value.startsWith('type:'))
      .map((value) => value.replace('type:', ''));

    setSelectedRooms(nextRooms);
    if (mode === 'desk') {
      setSelectedDeskTypes(nextTypes);
    } else {
      setSelectedParkingTypes(nextTypes);
    }
  };

  const timeBlocks = useMemo(
    () => [
      { label: '06:00 - 08:00', start: 6, end: 8 },
      { label: '08:00 - 10:00', start: 8, end: 10 },
      { label: '10:00 - 12:00', start: 10, end: 12 },
      { label: '12:00 - 14:00', start: 12, end: 14 },
      { label: '14:00 - 16:00', start: 14, end: 16 },
      { label: '16:00 - 18:00', start: 16, end: 18 },
      { label: '18:00 - 21:00', start: 18, end: 21 }
    ],
    []
  );

  const filteredDayEvents = useMemo(() => {
    const selectedRoomSet = new Set(selectedRooms.map(String));
    const selectedTypeSet =
      mode === 'desk'
        ? new Set(selectedDeskTypes)
        : new Set(selectedParkingTypes);

    return dayEvents
      .filter((event) => event.mode === mode)
      .filter((event) => {
        const begin = event.begin || '';
        const parts = begin.split(':');
        const hour = parseInt(parts[0], 10);
        if (Number.isNaN(hour) || hour < 6 || hour >= 21) {
          return false;
        }
        return true;
      })
      .filter((event) => {
        if (selectedRoomSet.size === 0 && selectedTypeSet.size === 0) {
          return true;
        }
        const roomMatch = event.roomId && selectedRoomSet.has(String(event.roomId));
        const typeValue = mode === 'desk' ? event.workspaceType : event.parkingType;
        const typeMatch = typeValue && selectedTypeSet.has(typeValue);
        return roomMatch || typeMatch;
      });
  }, [dayEvents, mode, selectedRooms, selectedDeskTypes, selectedParkingTypes]);

  const groupedDayEvents = useMemo(() => {
    const groups = timeBlocks.map((block) => ({ ...block, events: [] }));
    filteredDayEvents.forEach((event) => {
      const begin = event.begin || '';
      const hour = parseInt(begin.split(':')[0], 10);
      if (Number.isNaN(hour) || hour < 6 || hour >= 21) {
        return;
      }
      let index = null;
      if (hour < 8) index = 0;
      else if (hour < 10) index = 1;
      else if (hour < 12) index = 2;
      else if (hour < 14) index = 3;
      else if (hour < 16) index = 4;
      else if (hour < 18) index = 5;
      else if (hour < 21) index = 6;
      if (index !== null) {
        groups[index].events.push(event);
      }
    });
    groups.forEach((group) => {
      group.events.sort((a, b) => {
        const aTime = a.begin || '';
        const bTime = b.begin || '';
        if (aTime < bTime) return -1;
        if (aTime > bTime) return 1;
        return 0;
      });
    });
    return groups;
  }, [filteredDayEvents, timeBlocks]);

  const BookingEvent = ({ event }) => {
    const count = event?.resource?.count ?? 0;
    const date = event?.start;

    const handleAddBookingClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      navigate("/floor", { state: { date } });
    };

    return (
      <div className="home-booking-event">
        <button
          type="button"
          className="home-add-booking-btn"
          onClick={handleAddBookingClick}
        >
          {t('addBooking')}
        </button>
        <div className="home-bookings-sum">
          {t('bookingsSum')}: {count}
        </div>
      </div>
    );
  };

  return (
    <LayoutPage
      title={t('home')}
      helpText={''}
    >
      <Calendar
        data-testid='abc'
        localizer={localizer}
        events={events}
        startAccessor='start'
        endAccessor='end'
        views={['month']}
        style={{ height: 500 }}
        onSelectSlot={handleSelectSlot}
        selectable={true}
        onKeyPressEvent={(data) => console.log(data)}
        messages={{
          next: t('next'),
          previous: t('back'),
          today: t('today'),
          month: t('month'),
          week: t('week'),
          day: t('day'),
          agenda: t('agenda'),
          noEventsInRange: t('noEventsInRange')
        }}
        onNavigate={handleNavigate}
        components={{ event: BookingEvent }}
      />
      <div className="home-calendar-footer">
        <div className="home-calendar-controls">
          <Tooltip title={mode === 'desk' ? t('switchToParking') : t('switchToDesk')}>
            <IconButton
              className="home-mode-toggle"
              onClick={() => setMode(mode === 'desk' ? 'parking' : 'desk')}
              aria-label={mode === 'desk' ? t('switchToParking') : t('switchToDesk')}
            >
              {mode === 'desk' ? <DirectionsCarIcon /> : <DesktopWindowsIcon />}
            </IconButton>
          </Tooltip>
          <FormControl size="small" className="home-filter-select">
            <InputLabel>{t('filter')}</InputLabel>
            <Select
              multiple
              value={selectedValues}
              onChange={handleFilterChange}
              label={t('filter')}
              renderValue={(selected) =>
                selected
                  .map((value) => {
                    if (value.startsWith('room:')) {
                      const roomId = value.replace('room:', '');
                      const room = roomOptions.find((option) => option.value === value);
                      return room ? room.label : roomId;
                    }
                    if (value.startsWith('type:')) {
                      const typeValue = value.replace('type:', '');
                      const type = typeOptions.find((option) => option.value === value);
                      return type ? type.label : typeValue;
                    }
                    return value;
                  })
                  .join(', ')
              }
            >
              <ListSubheader>{t('rooms')}</ListSubheader>
              {roomOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  <Checkbox checked={selectedValues.includes(option.value)} />
                  <ListItemText primary={option.label} />
                </MenuItem>
              ))}
              <ListSubheader>
                {mode === 'desk' ? t('deskTypes') : t('parkingTypes')}
              </ListSubheader>
              {typeOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  <Checkbox checked={selectedValues.includes(option.value)} />
                  <ListItemText primary={option.label} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>
        <div className="home-selected-date">
          {t('selectedDateLabel')}: {moment(selectedDate).format('L')}
        </div>
      </div>
      <div className="home-day-events">
        {groupedDayEvents.map((block) => (
          <div key={block.label} className="home-day-block">
            <div className="home-day-block-label">{block.label}</div>
            <div className="home-day-block-events">
              {block.events.map((event) => (
                <div key={event.id} className="home-day-event">
                  <div className="home-day-event-title">
                    {mode === 'desk'
                      ? `${t('desk')}: ${event.deskRemark || event.deskId}`
                      : `${t('parking')}: ${event.parkingId || '-'}`}
                  </div>
                  <div className="home-day-event-time">
                    {(event.begin || '').slice(0, 5)} - {(event.end || '').slice(0, 5)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </LayoutPage>
  );


  /*return (
    <Box sx={{
      width: '100vw',
      height: '100vh',
      backgroundColor: 'aliceblue',
      display: 'flex'
    }}>
      <div>
        <SidebarComponent />
      </div>
      <Box sx={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#ffffff'
      }}>
        <Box sx={{display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: '15px',
          paddingBottom: '15px'}}
        >
          <h1>{t("chooseDate")}</h1>
        </Box>
        <hr className="gradient" />
        <div data-testid='Home_Calendar'>
          <Calendar
            
            data-testid='abc'
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            views={["month"]}
            style={{ height: 500 }}
            onSelectSlot={handleSelectSlot}
            selectable={true}
            onKeyPressEvent={(data) => console.log(data)}
            messages={{
              next: t("next"),
              previous: t("back"),
              today: t("today"),
              month: t("month"),
              week: t("week"),
              day: t("day"),
              agenda: t("agenda"),
              noEventsInRange: t("noEventsInRange")
           }}
           onNavigate={handleNavigate}
          />
        </div>
      </Box>
    </Box>
  );*/
};

export default Home;
