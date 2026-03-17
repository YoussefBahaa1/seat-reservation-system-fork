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
import { WORKSTATION_TYPE_VALUES, MONITOR_COUNT_VALUES } from '../misc/workstationMetadata';

const PARKING_TYPE_VALUES = ['STANDARD', 'ACCESSIBLE', 'E_CHARGING_STATION', 'SPECIAL_CASE'];
const TECHNOLOGY_FILTER_VALUES = ['dockingStation', 'webcam', 'headset'];
const WORKSTATION_TYPE_VALUE_SET = new Set(WORKSTATION_TYPE_VALUES);
const MAX_SELECTED_FILTERS = 30;

const httpErrorKey = (statusCode) => {
  if (!Number.isInteger(statusCode)) {
    return 'httpOther';
  }
  const candidate = `http${statusCode}`;
  return ['http401', 'http403', 'http405', 'http500'].includes(candidate)
    ? candidate
    : 'httpOther';
};

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
  const showMaxFiltersSelectedError = useCallback(() => {
    toast.error(
      t('maxNumberFiltersSelected', { max: MAX_SELECTED_FILTERS }),
      { toastId: 'home-max-filters-selected' }
    );
  }, [t]);

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
          toast.error(t(httpErrorKey(errorCode)));
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
          toast.error(t(httpErrorKey(errorCode)));
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
          toast.error(t(httpErrorKey(errorCode)));
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
    let allowedValues = rawValues
      .filter((value) => typeof value === 'string')
      .map((value) => {
        const normalized = String(value).trim();
        if (normalized === 'type:flag:deskHeightAdjustable') return 'adjustable:true';
        if (normalized === 'type:flag:technologyWebcam') return 'technology:webcam';
        if (normalized === 'type:flag:technologyHeadset') return 'technology:headset';
        return normalized;
      })
      .filter((value) => {
        if (value.startsWith('building:')) return true;
        if (value.startsWith('room:')) return true;
        if (value.startsWith('type:') && String(value).toLowerCase() !== 'type:unknown') return true;
        if (value.startsWith('monitor:')) return true;
        if (value.startsWith('adjustable:')) return true;
        if (value.startsWith('technology:')) return true;
        if (value.startsWith('special:')) return true;
        return false;
      });

    // Keep insertion order but remove duplicates.
    allowedValues = [...new Set(allowedValues)];

    const buildingValues = allowedValues.filter((value) => value.startsWith('building:'));
    if (buildingValues.length > 1) {
      const selectedBuildingValue = buildingValues[buildingValues.length - 1];
      allowedValues = allowedValues.filter(
        (value) => !value.startsWith('building:') || value === selectedBuildingValue
      );
    }

    const keepLatestExclusive = (prefix) => {
      const valuesForPrefix = allowedValues.filter((value) => value.startsWith(prefix));
      if (valuesForPrefix.length <= 1) return;
      const selectedValue = valuesForPrefix[valuesForPrefix.length - 1];
      allowedValues = allowedValues.filter(
        (value) => !value.startsWith(prefix) || value === selectedValue
      );
    };
    keepLatestExclusive('adjustable:');
    keepLatestExclusive('special:');

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

  const parkingTypeOptions = useMemo(() => {
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
  }, [dayParkingEvents, t]);

  const ergonomicsOptions = useMemo(
    () => WORKSTATION_TYPE_VALUES.map((value) => ({
      value,
      label: t(`workstationType${value}`)
    })),
    [t]
  );

  const monitorOptions = useMemo(
    () => MONITOR_COUNT_VALUES.map((value) => ({ value: String(value), label: String(value) })),
    []
  );

  const adjustableOptions = useMemo(
    () => [
      { value: 'true', label: t('adjustable') },
      { value: 'false', label: t('notAdjustable') }
    ],
    [t]
  );

  const technologyOptions = useMemo(
    () => TECHNOLOGY_FILTER_VALUES.map((value) => {
      if (value === 'dockingStation') {
        return { value, label: t('technologyDockingStation') };
      }
      if (value === 'webcam') {
        return { value, label: t('technologyWebcam') };
      }
      return { value, label: t('technologyHeadset') };
    }),
    [t]
  );

  const specialFeatureOptions = useMemo(
    () => [
      { value: 'true', label: t('yes') },
      { value: 'false', label: t('no') }
    ],
    [t]
  );

  const roomLabelById = useMemo(
    () => new Map(roomOptions.map((option) => [option.value.replace('room:', ''), option.label])),
    [roomOptions]
  );
  const ergonomicsLabelByValue = useMemo(
    () => new Map(ergonomicsOptions.map((option) => [option.value, option.label])),
    [ergonomicsOptions]
  );
  const monitorLabelByValue = useMemo(
    () => new Map(monitorOptions.map((option) => [option.value, option.label])),
    [monitorOptions]
  );
  const technologyLabelByValue = useMemo(
    () => new Map(technologyOptions.map((option) => [option.value, option.label])),
    [technologyOptions]
  );

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

  const selectedBuildingValue = useMemo(
    () => selectedDeskFiltersSanitized.find((value) => value.startsWith('building:'))?.replace('building:', '') || '',
    [selectedDeskFiltersSanitized]
  );
  const selectedRoomValues = useMemo(
    () => selectedDeskFiltersSanitized
      .filter((value) => value.startsWith('room:'))
      .map((value) => value.replace('room:', '')),
    [selectedDeskFiltersSanitized]
  );
  const selectedErgonomicsValues = useMemo(
    () => selectedDeskFiltersSanitized
      .filter((value) => value.startsWith('type:'))
      .map((value) => value.replace('type:', ''))
      .filter((value) => WORKSTATION_TYPE_VALUE_SET.has(value)),
    [selectedDeskFiltersSanitized]
  );
  const selectedMonitorValues = useMemo(
    () => selectedDeskFiltersSanitized
      .filter((value) => value.startsWith('monitor:'))
      .map((value) => value.replace('monitor:', '')),
    [selectedDeskFiltersSanitized]
  );
  const selectedAdjustableValue = useMemo(
    () => selectedDeskFiltersSanitized.find((value) => value.startsWith('adjustable:'))?.replace('adjustable:', '') || '',
    [selectedDeskFiltersSanitized]
  );
  const selectedTechnologyValues = useMemo(
    () => selectedDeskFiltersSanitized
      .filter((value) => value.startsWith('technology:'))
      .map((value) => value.replace('technology:', '')),
    [selectedDeskFiltersSanitized]
  );
  const selectedSpecialFeatureValue = useMemo(
    () => selectedDeskFiltersSanitized.find((value) => value.startsWith('special:'))?.replace('special:', '') || '',
    [selectedDeskFiltersSanitized]
  );
  const updateDeskFilters = useCallback((applyChanges) => {
    setSelectedDeskFilters((prev) => {
      const next = sanitizeDeskFilterValues(applyChanges(prev));
      if (next.length > MAX_SELECTED_FILTERS) {
        showMaxFiltersSelectedError();
        return prev;
      }
      return next;
    });
  }, [sanitizeDeskFilterValues, showMaxFiltersSelectedError]);

  const parseMultiSelectValues = useCallback((value) => (
    typeof value === 'string' ? value.split(',').filter(Boolean) : value
  ), []);

  const handleDeskBuildingChange = useCallback((event) => {
    const nextBuildingId = String(event.target.value || '').trim();
    updateDeskFilters((prev) => {
      const withoutBuildingAndRooms = prev.filter(
        (value) => !value.startsWith('building:') && !value.startsWith('room:')
      );
      if (!nextBuildingId) return withoutBuildingAndRooms;
      return [...withoutBuildingAndRooms, `building:${nextBuildingId}`];
    });
  }, [updateDeskFilters]);

  const handleDeskRoomsChange = useCallback((event) => {
    const roomIds = parseMultiSelectValues(event.target.value).map((value) => String(value));
    updateDeskFilters((prev) => {
      const withoutRooms = prev.filter((value) => !value.startsWith('room:'));
      return [...withoutRooms, ...roomIds.map((roomId) => `room:${roomId}`)];
    });
  }, [updateDeskFilters, parseMultiSelectValues]);

  const handleDeskErgonomicsChange = useCallback((event) => {
    const ergonomicsValues = parseMultiSelectValues(event.target.value).map((value) => String(value));
    updateDeskFilters((prev) => {
      const withoutErgonomics = prev.filter((value) => {
        if (!value.startsWith('type:')) return true;
        const typeValue = value.replace('type:', '');
        return !WORKSTATION_TYPE_VALUE_SET.has(typeValue);
      });
      return [...withoutErgonomics, ...ergonomicsValues.map((value) => `type:${value}`)];
    });
  }, [updateDeskFilters, parseMultiSelectValues]);

  const handleDeskMonitorsChange = useCallback((event) => {
    const monitorValues = parseMultiSelectValues(event.target.value).map((value) => String(value));
    updateDeskFilters((prev) => {
      const withoutMonitors = prev.filter((value) => !value.startsWith('monitor:'));
      return [...withoutMonitors, ...monitorValues.map((value) => `monitor:${value}`)];
    });
  }, [updateDeskFilters, parseMultiSelectValues]);

  const handleDeskAdjustableChange = useCallback((event) => {
    const nextValue = String(event.target.value || '');
    updateDeskFilters((prev) => {
      const withoutAdjustable = prev.filter((value) => !value.startsWith('adjustable:'));
      if (!nextValue) return withoutAdjustable;
      return [...withoutAdjustable, `adjustable:${nextValue}`];
    });
  }, [updateDeskFilters]);

  const handleDeskTechnologyChange = useCallback((event) => {
    const technologyValues = parseMultiSelectValues(event.target.value).map((value) => String(value));
    updateDeskFilters((prev) => {
      const withoutTechnology = prev.filter((value) => !value.startsWith('technology:'));
      return [...withoutTechnology, ...technologyValues.map((value) => `technology:${value}`)];
    });
  }, [updateDeskFilters, parseMultiSelectValues]);

  const handleDeskSpecialFeaturesChange = useCallback((event) => {
    const nextValue = String(event.target.value || '');
    updateDeskFilters((prev) => {
      const withoutSpecialFeatures = prev.filter((value) => !value.startsWith('special:'));
      if (!nextValue) return withoutSpecialFeatures;
      return [...withoutSpecialFeatures, `special:${nextValue}`];
    });
  }, [updateDeskFilters]);

  const handleParkingFilterChange = useCallback((event) => {
    const values =
      typeof event.target.value === 'string'
        ? event.target.value.split(',')
        : event.target.value;
    const nextValues = values.filter(
      (value) => value.startsWith('type:') || value.startsWith('covered:')
    );
    if (nextValues.length > MAX_SELECTED_FILTERS) {
      showMaxFiltersSelectedError();
      return;
    }
    setSelectedParkingFilters(nextValues);
  }, [showMaxFiltersSelectedError]);

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
    const selectedMonitorSet = new Set(
      selectedFilters
        .filter((value) => value.startsWith('monitor:'))
        .map((value) => value.replace('monitor:', ''))
    );
    const selectedAdjustableSet = new Set(
      selectedFilters
        .filter((value) => value.startsWith('adjustable:'))
        .map((value) => value.replace('adjustable:', ''))
    );
    const selectedTechnologySet = new Set(
      selectedFilters
        .filter((value) => value.startsWith('technology:'))
        .map((value) => value.replace('technology:', ''))
    );
    const selectedSpecialSet = new Set(
      selectedFilters
        .filter((value) => value.startsWith('special:'))
        .map((value) => value.replace('special:', ''))
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
          const roomMatch = selectedRoomSet.size === 0
            || (eventRoomId != null && selectedRoomSet.has(eventRoomId));
          if (!roomMatch) {
            return false;
          }
          const typeValue = event.workspaceType;
          const desk = desksById.get(String(event?.deskId ?? ''));
          const ergonomicsTypeMatch = selectedTypeSet.size === 0
            || (typeValue != null && selectedTypeSet.has(typeValue));
          if (!ergonomicsTypeMatch) {
            return false;
          }

          const monitorCount = desk?.monitorsQuantity ?? 1;
          const monitorMatch = selectedMonitorSet.size === 0
            || selectedMonitorSet.has(String(monitorCount));
          if (!monitorMatch) {
            return false;
          }

          const adjustableValue = String(desk?.deskHeightAdjustable === true);
          const adjustableMatch = selectedAdjustableSet.size === 0
            || selectedAdjustableSet.has(adjustableValue);
          if (!adjustableMatch) {
            return false;
          }

          if (selectedTechnologySet.size > 0) {
            if (selectedTechnologySet.has('dockingStation') && desk?.technologyDockingStation !== true) {
              return false;
            }
            if (selectedTechnologySet.has('webcam') && desk?.technologyWebcam !== true) {
              return false;
            }
            if (selectedTechnologySet.has('headset') && desk?.technologyHeadset !== true) {
              return false;
            }
          }

          if (selectedSpecialSet.size > 0) {
            const hasSpecialFeatures = desk?.specialFeatures != null && String(desk.specialFeatures).trim() !== '';
            if (!selectedSpecialSet.has(String(hasSpecialFeatures))) {
              return false;
            }
          }

          return true;
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
      navigate('/desks', {
        state: {
          roomId: nextRoomId,
          date: selectedDate,
        },
      });
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

  const renderMultiSelectLabels = (selectedValues, labelMap) => {
    const values = Array.isArray(selectedValues) ? selectedValues : [];
    if (values.length === 0) {
      return t('noFiltersApplied');
    }
    return values.map((value) => labelMap.get(String(value)) || String(value)).join(', ');
  };

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
          {mode === 'desk' ? (
            <div className="home-filter-bars">
              <div className="home-filter-row">
                <FormControl size="small" className="home-filter-bar home-filter-bar--building">
                  <InputLabel>{t('building')}</InputLabel>
                  <Select
                    value={selectedBuildingValue}
                    label={t('building')}
                    onChange={handleDeskBuildingChange}
                  >
                    <MenuItem value=''>{t('any')}</MenuItem>
                    {buildingOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value.replace('building:', '')}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" className="home-filter-bar" disabled={selectedBuildingValue === ''}>
                  <InputLabel>{t('rooms')}</InputLabel>
                  <Select
                    multiple
                    value={selectedRoomValues}
                    label={t('rooms')}
                    onChange={handleDeskRoomsChange}
                    renderValue={(selected) => (
                      <span className="home-filter-render-value">
                        {renderMultiSelectLabels(selected, roomLabelById)}
                      </span>
                    )}
                  >
                    {roomOptions.map((option) => {
                      const roomId = option.value.replace('room:', '');
                      return (
                        <MenuItem key={option.value} value={roomId}>
                          <Checkbox checked={selectedRoomValues.includes(roomId)} />
                          <ListItemText primary={option.label} />
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>

                <FormControl size="small" className="home-filter-bar">
                  <InputLabel>{t('ergonomics')}</InputLabel>
                  <Select
                    multiple
                    value={selectedErgonomicsValues}
                    label={t('ergonomics')}
                    onChange={handleDeskErgonomicsChange}
                    renderValue={(selected) => (
                      <span className="home-filter-render-value">
                        {renderMultiSelectLabels(selected, ergonomicsLabelByValue)}
                      </span>
                    )}
                  >
                    {ergonomicsOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        <Checkbox checked={selectedErgonomicsValues.includes(option.value)} />
                        <ListItemText primary={option.label} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" className="home-filter-bar">
                  <InputLabel>{t('monitors')}</InputLabel>
                  <Select
                    multiple
                    value={selectedMonitorValues}
                    label={t('monitors')}
                    onChange={handleDeskMonitorsChange}
                    renderValue={(selected) => (
                      <span className="home-filter-render-value">
                        {renderMultiSelectLabels(selected, monitorLabelByValue)}
                      </span>
                    )}
                  >
                    {monitorOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        <Checkbox checked={selectedMonitorValues.includes(option.value)} />
                        <ListItemText primary={option.label} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </div>

              <div className="home-filter-row">
                <FormControl size="small" className="home-filter-bar">
                  <InputLabel>{t('deskType')}</InputLabel>
                  <Select
                    value={selectedAdjustableValue}
                    label={t('deskType')}
                    onChange={handleDeskAdjustableChange}
                    renderValue={(selected) => (
                      <span className="home-filter-render-value">
                        {adjustableOptions.find((option) => option.value === selected)?.label || t('any')}
                      </span>
                    )}
                  >
                    <MenuItem value=''>{t('any')}</MenuItem>
                    {adjustableOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" className="home-filter-bar">
                  <InputLabel>{t('technology')}</InputLabel>
                  <Select
                    multiple
                    value={selectedTechnologyValues}
                    label={t('technology')}
                    onChange={handleDeskTechnologyChange}
                    renderValue={(selected) => (
                      <span className="home-filter-render-value">
                        {renderMultiSelectLabels(selected, technologyLabelByValue)}
                      </span>
                    )}
                  >
                    {technologyOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        <Checkbox checked={selectedTechnologyValues.includes(option.value)} />
                        <ListItemText primary={option.label} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" className="home-filter-bar">
                  <InputLabel>{t('specialFeatures')}</InputLabel>
                  <Select
                    value={selectedSpecialFeatureValue}
                    label={t('specialFeatures')}
                    onChange={handleDeskSpecialFeaturesChange}
                    renderValue={(selected) => (
                      <span className="home-filter-render-value">
                        {specialFeatureOptions.find((option) => option.value === selected)?.label || t('any')}
                      </span>
                    )}
                  >
                    <MenuItem value=''>{t('any')}</MenuItem>
                    {specialFeatureOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </div>
            </div>
          ) : (
            <FormControl size="small" className="home-filter-select">
              <InputLabel>{t('filters')}</InputLabel>
              <Select
                multiple
                value={selectedFilters}
                onChange={handleParkingFilterChange}
                label={t('filters')}
                renderValue={(selected) => (
                  <span className="home-filter-render-value">
                    {selected
                      .map((value) => {
                        if (value.startsWith('type:')) {
                          const typeValue = value.replace('type:', '');
                          const type = parkingTypeOptions.find((option) => option.value === value);
                          return type ? type.label : typeValue;
                        }
                        if (value.startsWith('covered:')) {
                          const covered = coveredOptions.find((option) => option.value === value);
                          return covered ? covered.label : value;
                        }
                        return value;
                      })
                      .join(', ')}
                  </span>
                )}
              >
                <ListSubheader>{t('parkingTypes')}</ListSubheader>
                {parkingTypeOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    <Checkbox checked={selectedFilters.includes(option.value)} />
                    <ListItemText primary={option.label} />
                  </MenuItem>
                ))}
                <ListSubheader>{t('carparkCovered')}</ListSubheader>
                {coveredOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    <Checkbox checked={selectedFilters.includes(option.value)} />
                    <ListItemText primary={option.label} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
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
