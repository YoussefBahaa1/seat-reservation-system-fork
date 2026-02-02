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
  const [selectedDeskFilters, setSelectedDeskFilters] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('homeDayDeskFilters') || '[]');
    } catch {
      return [];
    }
  });
  const [selectedParkingFilters, setSelectedParkingFilters] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('homeDayParkingFilters') || '[]');
    } catch {
      return [];
    }
  });
  const [rooms, setRooms] = useState([]);
  const [equipments, setEquipments] = useState([]);
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
    const dayString = moment(selectedDate).format('DD.MM.YYYY');
    getRequest(
      `${process.env.REACT_APP_BACKEND_URL}/bookings/day/${dayString}`,
      headers.current,
      (data) => setDayEvents(Array.isArray(data) ? data : []),
      (errorCode) => {
        console.log('Error fetching day bookings:', errorCode);
        if (errorCode !== 400) {
          toast.error(t(errorCode + ''));
        }
        setDayEvents([]);
      }
    );
  }, [selectedDate, headers, t]);

  useEffect(() => {
    getRequest(
      `${process.env.REACT_APP_BACKEND_URL}/rooms`,
      headers.current,
      (data) => setRooms(Array.isArray(data) ? data : []),
      (errorCode) => {
        console.log('Error fetching rooms:', errorCode);
      }
    );
    getRequest(
      `${process.env.REACT_APP_BACKEND_URL}/equipments`,
      headers.current,
      (data) => setEquipments(Array.isArray(data) ? data : []),
      (errorCode) => {
        console.log('Error fetching equipments:', errorCode);
      }
    );
  }, [headers]);

  useEffect(() => {
    sessionStorage.setItem('homeDayMode', mode);
    sessionStorage.setItem('homeDayDeskFilters', JSON.stringify(selectedDeskFilters));
    sessionStorage.setItem('homeDayParkingFilters', JSON.stringify(selectedParkingFilters));
  }, [mode, selectedDeskFilters, selectedParkingFilters]);

  const roomOptions = useMemo(() => {
    if (mode !== 'desk') return [];
    return rooms
      .filter((room) => room?.id && room?.remark)
      .map((room) => ({
        value: `room:${room.id}`,
        label: room.remark
      }));
  }, [rooms, mode]);

  const typeOptions = useMemo(() => {
    if (mode === 'desk') {
      return equipments
        .filter((equipment) => equipment?.equipmentName)
        .map((equipment) => ({
          value: `type:${equipment.equipmentName}`,
          label: t(equipment.equipmentName)
        }));
    }
    return [];
  }, [equipments, mode, t]);

  const selectedFilters = useMemo(() => {
    if (mode === 'desk') return selectedDeskFilters;
    return selectedParkingFilters.filter((value) => value.startsWith('type:'));
  }, [mode, selectedDeskFilters, selectedParkingFilters]);


  const handleFilterChange = (event) => {
    const values =
      typeof event.target.value === 'string'
        ? event.target.value.split(',')
        : event.target.value;
    if (mode === 'desk') {
      setSelectedDeskFilters(values);
    } else {
      setSelectedParkingFilters(values.filter((value) => value.startsWith('type:')));
    }
  };

  const toggleFilterValue = (value) => {
    if (mode === 'desk') {
      setSelectedDeskFilters((prev) =>
        prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
      );
    } else {
      setSelectedParkingFilters((prev) => {
        if (!value.startsWith('type:')) return prev;
        return prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value];
      });
    }
  };

  const timeBlocks = useMemo(() => {
    const blocks = [];
    for (let hour = 6; hour < 21; hour += 1) {
      const label = `${String(hour).padStart(2, '0')}:00`;
      blocks.push({ label, start: hour, end: hour + 1 });
    }
    return blocks;
  }, []);

  const filteredDayEvents = useMemo(() => {
    const selectedRoomSet = new Set(
      selectedFilters
        .filter((value) => value.startsWith('room:'))
        .map((value) => value.replace('room:', ''))
    );
    const selectedTypeSet = new Set(
      selectedFilters
        .filter((value) => value.startsWith('type:'))
        .map((value) => value.replace('type:', ''))
    );

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
  }, [dayEvents, mode, selectedFilters]);

  const groupedDayEvents = useMemo(() => {
    const groups = timeBlocks.map((block) => ({ ...block, events: [] }));
    filteredDayEvents.forEach((event) => {
      const begin = event.begin || '';
      const hour = parseInt(begin.split(':')[0], 10);
      if (Number.isNaN(hour) || hour < 6 || hour >= 21) {
        return;
      }
      const index = hour - 6;
      if (index >= 0 && index < groups.length) {
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

  const CustomToolbar = (toolbar) => (
    <div className="home-rbc-toolbar rbc-toolbar">
      <span className="rbc-btn-group">
        <button type="button" onClick={() => toolbar.onNavigate('TODAY')}>
          {t('today')}
        </button>
        <button type="button" onClick={() => toolbar.onNavigate('PREV')}>
          {t('back')}
        </button>
        <button type="button" onClick={() => toolbar.onNavigate('NEXT')}>
          {t('next')}
        </button>
      </span>
      <span className="home-rbc-toolbar-label">{toolbar.label}</span>
      <span className="home-rbc-toolbar-right">
        <Tooltip title={mode === 'desk' ? t('switchToParking') : t('switchToDesk')}>
            <IconButton
              className="home-mode-toggle"
              onClick={() => {
                if (mode === 'desk') {
                  setMode('parking');
                } else {
                  setMode('desk');
                }
              }}
              aria-label={mode === 'desk' ? t('switchToParking') : t('switchToDesk')}
            >
            {mode === 'desk' ? <DirectionsCarIcon /> : <DesktopWindowsIcon />}
          </IconButton>
        </Tooltip>
      </span>
    </div>
  );

  return (
    <LayoutPage
      title={mode === 'desk' ? t('desksTitle') : t('parkingsTitle')}
      helpText={''}
    >
      <Calendar
        data-testid='abc'
        localizer={localizer}
        events={events}
        startAccessor='start'
        endAccessor='end'
        views={['month']}
        style={{ height: 720 }}
        onSelectSlot={handleSelectSlot}
        selectable={true}
        dayPropGetter={(date) => ({
          className: moment(date).isSame(selectedDate, 'day')
            ? 'home-selected-day'
            : ''
        })}
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
        components={{ event: BookingEvent, toolbar: CustomToolbar }}
      />
      <div className="home-calendar-footer">
        <div className="home-calendar-controls">
          <span className="home-filter-label">{t('filters')}</span>
          <FormControl size="small" className="home-filter-select">
          <InputLabel>{t('filters')}</InputLabel>
          <Select
              multiple
              value={selectedFilters}
              onChange={handleFilterChange}
            label={t('filters')}
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
            {mode === 'desk' && (
              <>
                <ListSubheader>{t('rooms')}</ListSubheader>
                {roomOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value} onClick={() => toggleFilterValue(option.value)}>
                    <Checkbox checked={selectedFilters.includes(option.value)} />
                    <ListItemText primary={option.label} />
                  </MenuItem>
                ))}
              </>
            )}
            <ListSubheader>
              {mode === 'desk' ? t('deskTypes') : t('parkingTypes')}
            </ListSubheader>
            {typeOptions.map((option) => (
              <MenuItem key={option.value} value={option.value} onClick={() => toggleFilterValue(option.value)}>
                <Checkbox checked={selectedFilters.includes(option.value)} />
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
