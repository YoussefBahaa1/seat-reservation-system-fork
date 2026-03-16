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
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import MapOutlinedIcon from '@mui/icons-material/MapOutlined';
import FloorImage from '../FloorImage/FloorImage.jsx';
import CarparkView from '../Carpark/CarparkView.jsx';
import { WORKSTATION_TYPE_VALUES } from '../misc/workstationMetadata';

const PARKING_TYPE_VALUES = ['STANDARD', 'ACCESSIBLE', 'E_CHARGING_STATION', 'SPECIAL_CASE'];
const toSentenceCase = (value) => {
  const normalized = String(value || '').toLowerCase();
  if (!normalized) return '';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const Home = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() => {
    const stored = sessionStorage.getItem('homeSelectedDate');
    if (stored) {
      const parsed = new Date(stored);
      if (!Number.isNaN(parsed.valueOf())) {
        return moment(parsed).startOf('day').toDate();
      }
    }
    return moment().startOf('day').toDate();
  });
  const [calendarDate, setCalendarDate] = useState(() => {
    const stored = sessionStorage.getItem('homeCalendarDate');
    if (stored) {
      const parsed = new Date(stored);
      if (!Number.isNaN(parsed.valueOf())) {
        return moment(parsed).startOf('month').toDate();
      }
    }
    return moment(selectedDate).startOf('month').toDate();
  });
  const [dayDeskEvents, setDayDeskEvents] = useState([]);
  const [dayParkingEvents, setDayParkingEvents] = useState([]);
  const [myParkingStatusesById, setMyParkingStatusesById] = useState({});
  const [viewMode, setViewMode] = useState(() => sessionStorage.getItem('homeViewMode') || 'calendar');
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
  const [desks, setDesks] = useState([]);
  const headers = useRef(JSON.parse(sessionStorage.getItem('headers')));
  const lastRoomIdRef = useRef(null);
  const currentUserId = localStorage.getItem('userId');

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
      const endpoint =
        mode === 'parking'
          ? `${process.env.REACT_APP_BACKEND_URL}/parking/getAllBookingsForDate`
          : `${process.env.REACT_APP_BACKEND_URL}/bookings/getAllBookingsForDate`;

      postRequest(
        endpoint,
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
    [headers, t, setEvents, mode]  // Abhängigkeiten, die sich ändern könnten
  );

  // Call generateMonthDays when changes occur
  useEffect(() => {
    generateMonthDays(calendarDate);
  }, [t, generateMonthDays, calendarDate]);

  // Handle different month navigation
  const handleNavigate = (newDate, view) => {
    if (!newDate) return;
    if (!view || view === 'month') {
      setCalendarDate(moment(newDate).startOf('month').toDate());
    }
  };

  const localizer = momentLocalizer(moment);

  useEffect(() => {
    // Change moment locale whenever language changes
    moment.locale(i18n.language === 'en' ? 'en-gb' : i18n.language);
  }, [i18n.language]);

  const fetchDayEvents = useCallback(() => {
    const dayString = moment(selectedDate).format('DD.MM.YYYY');
    getRequest(
      `${process.env.REACT_APP_BACKEND_URL}/bookings/day/${dayString}`,
      headers.current,
      (data) => setDayDeskEvents(Array.isArray(data) ? data : []),
      (errorCode) => {
        console.log('Error fetching day desk bookings:', errorCode);
        if (errorCode !== 400) {
          toast.error(t(errorCode + ''));
        }
        setDayDeskEvents([]);
      }
    );
    getRequest(
      `${process.env.REACT_APP_BACKEND_URL}/parking/day/${dayString}`,
      headers.current,
      (data) => setDayParkingEvents(Array.isArray(data) ? data : []),
      (errorCode) => {
        console.log('Error fetching day parking bookings:', errorCode);
        if (errorCode !== 400) {
          toast.error(t(errorCode + ''));
        }
        setDayParkingEvents([]);
      }
    );
    getRequest(
      `${process.env.REACT_APP_BACKEND_URL}/parking/reservations/mine`,
      headers.current,
      (data) => {
        const statuses = {};
        (Array.isArray(data) ? data : []).forEach((reservation) => {
          if (reservation?.id != null) {
            statuses[String(reservation.id)] = String(reservation.status || '').toUpperCase();
          }
        });
        setMyParkingStatusesById(statuses);
      },
      (errorCode) => {
        console.log('Error fetching my parking reservations:', errorCode);
        setMyParkingStatusesById({});
      }
    );
  }, [selectedDate, headers, t]);

  useEffect(() => {
    fetchDayEvents();
  }, [fetchDayEvents]);

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
      `${process.env.REACT_APP_BACKEND_URL}/desks`,
      headers.current,
      (data) => setDesks(Array.isArray(data) ? data : []),
      (errorCode) => {
        console.log('Error fetching desks:', errorCode);
      }
    );
  }, [headers]);

  useEffect(() => {
    sessionStorage.setItem('homeDayMode', mode);
    sessionStorage.setItem('homeDayDeskFilters', JSON.stringify(selectedDeskFilters));
    sessionStorage.setItem('homeDayParkingFilters', JSON.stringify(selectedParkingFilters));
  }, [mode, selectedDeskFilters, selectedParkingFilters]);

  useEffect(() => {
    sessionStorage.setItem('homeViewMode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    sessionStorage.setItem('homeSelectedDate', selectedDate.toISOString());
  }, [selectedDate]);

  useEffect(() => {
    sessionStorage.setItem('homeCalendarDate', calendarDate.toISOString());
  }, [calendarDate]);

  const handleViewToggle = () => {
    setViewMode((prev) => (prev === 'calendar' ? 'floor' : 'calendar'));
  };

  const refreshCalendarCounts = useCallback(() => {
    generateMonthDays(calendarDate);
  }, [generateMonthDays, calendarDate]);

  const handleParkingReservationChange = useCallback(() => {
    fetchDayEvents();
    refreshCalendarCounts();
  }, [fetchDayEvents, refreshCalendarCounts]);

  const roomBuildingByRoomId = useMemo(() => {
    const map = new Map();
    rooms.forEach((room) => {
      if (room?.id == null) return;
      const buildingId = room?.floor?.building?.id;
      if (buildingId == null) return;
      map.set(String(room.id), String(buildingId));
    });
    return map;
  }, [rooms]);

  const sanitizeDeskFilterValues = useCallback((values) => {
    const rawValues = Array.isArray(values) ? values : [];
    const allowedValues = rawValues
      .filter((value) => typeof value === 'string')
      .filter((value) => {
        if (value.startsWith('building:')) return true;
        if (value.startsWith('room:')) return true;
        if (value.startsWith('type:')) return true;
        return false;
      });
    const selectedBuildingSet = new Set(
      allowedValues
        .filter((value) => value.startsWith('building:'))
        .map((value) => value.replace('building:', ''))
        .filter((value) => value)
    );
    if (selectedBuildingSet.size === 0) {
      return allowedValues.filter((value) => !value.startsWith('room:'));
    }
    return allowedValues.filter((value) => {
      if (!value.startsWith('room:')) return true;
      const roomId = value.replace('room:', '');
      const buildingId = roomBuildingByRoomId.get(roomId);
      return buildingId != null && selectedBuildingSet.has(buildingId);
    });
  }, [roomBuildingByRoomId]);

  const selectedDeskFiltersSanitized = useMemo(
    () => sanitizeDeskFilterValues(selectedDeskFilters),
    [sanitizeDeskFilterValues, selectedDeskFilters]
  );

  useEffect(() => {
    const sameLength = selectedDeskFilters.length === selectedDeskFiltersSanitized.length;
    const sameValues = sameLength && selectedDeskFilters.every((value, idx) => value === selectedDeskFiltersSanitized[idx]);
    if (!sameValues) {
      setSelectedDeskFilters(selectedDeskFiltersSanitized);
    }
  }, [selectedDeskFilters, selectedDeskFiltersSanitized]);

  const selectedBuildingIds = useMemo(
    () => new Set(
      selectedDeskFiltersSanitized
        .filter((value) => value.startsWith('building:'))
        .map((value) => value.replace('building:', ''))
        .filter((value) => value)
    ),
    [selectedDeskFiltersSanitized]
  );

  const buildingOptions = useMemo(() => {
    if (mode !== 'desk') return [];
    const buildingMap = new Map();
    rooms.forEach((room) => {
      const building = room?.floor?.building;
      if (building?.id == null) return;
      const id = String(building.id);
      const label = String(building?.name || id).trim() || id;
      if (!buildingMap.has(id)) {
        buildingMap.set(id, { value: `building:${id}`, label });
      }
    });
    return Array.from(buildingMap.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [mode, rooms]);

  const roomOptions = useMemo(() => {
    if (mode !== 'desk') return [];
    if (selectedBuildingIds.size === 0) return [];
    return rooms
      .filter((room) => room?.id && room?.remark)
      .filter((room) => {
        const buildingId = room?.floor?.building?.id;
        if (buildingId == null) return false;
        return selectedBuildingIds.has(String(buildingId));
      })
      .map((room) => ({
        value: `room:${room.id}`,
        label: room.remark
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [rooms, mode, selectedBuildingIds]);

  const typeOptions = useMemo(() => {
    if (mode === 'desk') {
      const ergonomicsOptions = WORKSTATION_TYPE_VALUES.map((value) => ({
          value: `type:${value}`,
          label: t(`workstationType${value}`)
        }));
      const deskFlagOptions = [
        { value: 'type:flag:fixed', label: t('fixed') },
        { value: 'type:flag:deskHeightAdjustable', label: t('deskFilterDeskHeightAdjustable') },
        { value: 'type:flag:technologyWebcam', label: t('deskFilterTechnologyWebcam') },
        { value: 'type:flag:technologyHeadset', label: t('deskFilterTechnologyHeadset') }
      ];
      return [...ergonomicsOptions, ...deskFlagOptions];
    }
    const dynamicTypes = dayParkingEvents
      .map((event) => String(event?.parkingType || '').toUpperCase())
      .filter((value) => value);
    const values = Array.from(new Set([...PARKING_TYPE_VALUES, ...dynamicTypes]));
    const labelForType = (value) => {
      if (value === 'STANDARD') return t('carparkStandard');
      if (value === 'SPECIAL_CASE') return t('carparkSpecialCase');
      return toSentenceCase(value.replaceAll('_', ' '));
    };
    return values.map((value) => ({
      value: `type:${value}`,
      label: labelForType(value)
    }));
  }, [dayParkingEvents, mode, t]);

  const coveredOptions = useMemo(() => {
    if (mode !== 'parking') return [];
    return [
      { value: 'covered:true', label: t('yes') },
      { value: 'covered:false', label: t('no') }
    ];
  }, [mode, t]);

  const selectedFilters = useMemo(() => {
    if (mode === 'desk') {
      return selectedDeskFiltersSanitized;
    }
    return selectedParkingFilters.filter(
      (value) => value.startsWith('type:') || value.startsWith('covered:')
    );
  }, [mode, selectedDeskFiltersSanitized, selectedParkingFilters]);


  const handleFilterChange = useCallback((event) => {
    const values =
      typeof event.target.value === 'string'
        ? event.target.value.split(',')
        : event.target.value;
    if (mode === 'desk') {
      setSelectedDeskFilters(sanitizeDeskFilterValues(values));
    } else {
      setSelectedParkingFilters(
        values.filter((value) => value.startsWith('type:') || value.startsWith('covered:'))
      );
    }
  }, [mode, sanitizeDeskFilterValues]);

  const toggleFilterValue = useCallback((value) => {
    if (mode === 'desk') {
      setSelectedDeskFilters((prev) => {
        if (!value.startsWith('building:') && !value.startsWith('room:') && !value.startsWith('type:')) {
          return prev;
        }
        const next = prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value];
        return sanitizeDeskFilterValues(next);
      });
    } else {
      setSelectedParkingFilters((prev) => {
        if (!value.startsWith('type:') && !value.startsWith('covered:')) return prev;
        return prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value];
      });
    }
  }, [mode, sanitizeDeskFilterValues]);

  const timeBlocks = useMemo(() => {
    const blocks = [];
    for (let hour = 6; hour < 21; hour += 1) {
      const label = `${String(hour).padStart(2, '0')}:00`;
      blocks.push({ label, start: hour, end: hour + 1 });
    }
    return blocks;
  }, []);

  const dayEvents = useMemo(() => [...dayDeskEvents, ...dayParkingEvents], [dayDeskEvents, dayParkingEvents]);
  const desksById = useMemo(() => {
    const map = new Map();
    desks.forEach((desk) => {
      if (desk?.id != null) {
        map.set(String(desk.id), desk);
      }
    });
    return map;
  }, [desks]);

  const filteredDayEvents = useMemo(() => {
    const selectedBuildingSet = new Set(
      selectedFilters
        .filter((value) => value.startsWith('building:'))
        .map((value) => value.replace('building:', ''))
    );
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
    const selectedCoveredSet = new Set(
      selectedFilters
        .filter((value) => value.startsWith('covered:'))
        .map((value) => value.replace('covered:', ''))
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
        if (mode === 'desk') {
          const eventRoomId = event?.roomId == null ? null : String(event.roomId);
          const eventBuildingId = eventRoomId == null ? null : roomBuildingByRoomId.get(eventRoomId);
          const buildingMatch = selectedBuildingSet.size === 0
            || (eventBuildingId != null && selectedBuildingSet.has(eventBuildingId));
          if (!buildingMatch) {
            return false;
          }
          if (selectedRoomSet.size === 0 && selectedTypeSet.size === 0) {
            return true;
          }
          const roomMatch = eventRoomId != null && selectedRoomSet.has(eventRoomId);
          const typeValue = event.workspaceType;
          const ergonomicsTypeMatch = typeValue && selectedTypeSet.has(typeValue);
          const desk = desksById.get(String(event?.deskId ?? ''));
          const fixedMatch = selectedTypeSet.has('flag:fixed') && desk?.fixed === true;
          const heightAdjustableMatch =
            selectedTypeSet.has('flag:deskHeightAdjustable') && desk?.deskHeightAdjustable === true;
          const webcamMatch = selectedTypeSet.has('flag:technologyWebcam') && desk?.technologyWebcam === true;
          const headsetMatch = selectedTypeSet.has('flag:technologyHeadset') && desk?.technologyHeadset === true;
          const typeMatch = Boolean(
            ergonomicsTypeMatch || fixedMatch || heightAdjustableMatch || webcamMatch || headsetMatch
          );
          return roomMatch || typeMatch;
        }

        if (selectedTypeSet.size === 0 && selectedCoveredSet.size === 0) {
          return true;
        }
        const parkingTypeValue = String(event?.parkingType || '').toUpperCase();
        const typeMatch = selectedTypeSet.size === 0 || selectedTypeSet.has(parkingTypeValue);
        const coveredValue = String(event?.parkingCovered === true);
        const coveredMatch = selectedCoveredSet.size === 0 || selectedCoveredSet.has(coveredValue);
        return typeMatch && coveredMatch;
      });
  }, [dayEvents, mode, selectedFilters, desksById, roomBuildingByRoomId]);

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

  const getDayEventClassName = (event) => {
    const isMine = event.userId && String(event.userId) === currentUserId;
    const parkingStatus = String(event?.parkingStatus || '').toUpperCase();
    if (!isMine) {
      if (mode === 'parking' && parkingStatus === 'PENDING') {
        return 'home-day-event home-day-event--pending-other';
      }
      return 'home-day-event';
    }
    if (mode === 'parking') {
      const status = myParkingStatusesById[String(event.id)] || '';
      if (status === 'PENDING') {
        return 'home-day-event home-day-event--mine-pending';
      }
    }
    return 'home-day-event home-day-event--mine';
  };

  const BookingEvent = ({ event }) => {
    const count = event?.resource?.count ?? 0;
    const date = event?.start;

    const handleAddBookingClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (mode === 'parking') {
        if (date instanceof Date && !Number.isNaN(date.valueOf())) {
          sessionStorage.setItem('carparkSelectedDate', date.toISOString());
        }
        navigate('/carpark', { state: { date } });
        return;
      }
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

  const handleFloorSelection = useCallback(
    (data) => {
      const nextRoomId = data?.room?.id;
      if (!nextRoomId || nextRoomId === lastRoomIdRef.current) {
        return;
      }
      lastRoomIdRef.current = nextRoomId;
      navigate('/desks', { state: { roomId: nextRoomId, date: selectedDate } });
    },
    [navigate, selectedDate]
  );

  const viewToggleLabel = viewMode === 'calendar' ? t('switchToFloor') : t('switchToCalendar');
  const viewToggleIcon = viewMode === 'calendar' ? <MapOutlinedIcon /> : <CalendarMonthIcon />;
  const modeToggleLabel = mode === 'desk' ? t('switchToParking') : t('switchToDesk');

  const renderModeToggle = () => (
    <Tooltip title={modeToggleLabel}>
      <IconButton
        className="home-mode-toggle"
        onClick={() => {
          if (mode === 'desk') {
            setMode('parking');
          } else {
            setMode('desk');
          }
        }}
        aria-label={modeToggleLabel}
      >
        {mode === 'desk' ? <DirectionsCarIcon /> : <DesktopWindowsIcon />}
      </IconButton>
    </Tooltip>
  );

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
        {renderModeToggle()}
      </span>
    </div>
  );

  return (
    <LayoutPage
      title={mode === 'desk' ? t('desksTitle') : t('parkingsTitle')}
      helpText={''}
      actionElement={(
        <Tooltip title={viewToggleLabel}>
          <IconButton
            className="home-view-toggle"
            onClick={handleViewToggle}
            aria-label={viewToggleLabel}
          >
            {viewToggleIcon}
          </IconButton>
        </Tooltip>
      )}
    >
      {viewMode === 'calendar' ? (
        <Calendar
          data-testid='abc'
          localizer={localizer}
          events={events}
          date={calendarDate}
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
      ) : (
        <div className="home-floor-section">
          {mode === 'desk' ? (
            <>
              <div className="home-rbc-toolbar rbc-toolbar home-floor-toolbar">
                <span className="rbc-btn-group">
                  <button type="button" onClick={() => setSelectedDate(moment().startOf('day').toDate())}>
                    {t('today')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedDate(moment(selectedDate).subtract(1, 'day').startOf('day').toDate())}
                  >
                    {t('back')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedDate(moment(selectedDate).add(1, 'day').startOf('day').toDate())}
                  >
                    {t('next')}
                  </button>
                </span>
                <span className="home-rbc-toolbar-label">
                  {moment(selectedDate).format('LL')}
                </span>
                <span className="home-rbc-toolbar-right">
                  {renderModeToggle()}
                </span>
              </div>
              <div className="home-floor-view">
                <FloorImage
                  sendDataToParent={handleFloorSelection}
                  click_freely={false}
                />
              </div>
            </>
          ) : (
            <div className="home-carpark-wrapper">
              <CarparkView
                selectedDate={selectedDate}
                onSelectedDateChange={setSelectedDate}
                detailsVariant="modal"
                showHoverDetails={false}
                headerAction={renderModeToggle()}
                onReservationsChanged={handleParkingReservationChange}
              />
            </div>
          )}
        </div>
      )}
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
                  if (value.startsWith('building:')) {
                    const buildingId = value.replace('building:', '');
                    const building = buildingOptions.find((option) => option.value === value);
                    return building ? building.label : buildingId;
                  }
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
                  if (value.startsWith('covered:')) {
                    const covered = coveredOptions.find((option) => option.value === value);
                    return covered ? covered.label : value;
                  }
                  return value;
                })
                .join(', ')
            }
          >
            {mode === 'desk' && (
              <>
                <ListSubheader>{t('building')}</ListSubheader>
                {buildingOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value} onClick={() => toggleFilterValue(option.value)}>
                    <Checkbox checked={selectedFilters.includes(option.value)} />
                    <ListItemText primary={option.label} />
                  </MenuItem>
                ))}
                {selectedBuildingIds.size > 0 && (
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
            {mode === 'parking' && (
              <>
                <ListSubheader>{t('carparkCovered')}</ListSubheader>
                {coveredOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value} onClick={() => toggleFilterValue(option.value)}>
                    <Checkbox checked={selectedFilters.includes(option.value)} />
                    <ListItemText primary={option.label} />
                  </MenuItem>
                ))}
              </>
            )}
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
                <div
                  key={event.id}
                  className={getDayEventClassName(event)}
                >
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
};

export default Home;
