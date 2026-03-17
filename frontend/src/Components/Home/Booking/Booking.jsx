import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Box,
  Button,
  Typography,
  IconButton,
  Tooltip,
  Dialog,
  DialogContent,
  DialogTitle,
  ToggleButton,
  ToggleButtonGroup,
  /*, FormControl, RadioGroup, FormControlLabel, Radio */
} from '@mui/material';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-confirm-alert/src/react-confirm-alert.css';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaStar, FaRegStar } from 'react-icons/fa';
import CloseIcon from '@mui/icons-material/Close';

import LayoutPage from '../../Templates/LayoutPage.jsx';
import { getRequest, postRequest, putRequest, deleteRequest } from '../../RequestFunctions/RequestFunctions';
import bookingPostRequest, { checkDeskBookingOverlap, showDeskBookingConfirmation } from '../../misc/bookingPostRequest.js';
import ReportDefectModal from '../../Defects/ReportDefectModal';
import RoomBulkBookingPanel from './RoomBulkBookingPanel.jsx';
import { DeskTable } from '../../misc/DesksTable.jsx';
import { colorVars, semanticColors } from '../../../theme';
//import { buildFullDaySlots } from './buildFullDaySlots.js';

const BOOKING_CONTEXT_KEY = 'bookingNavigationContext';

const parseStoredBookingContext = () => {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(BOOKING_CONTEXT_KEY) || 'null');
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
};

const parsePreferredSlot = (preferredSlot) => {
  if (!preferredSlot || typeof preferredSlot !== 'object') return null;
  const start = preferredSlot.start ? new Date(preferredSlot.start) : null;
  const end = preferredSlot.end ? new Date(preferredSlot.end) : null;
  if (!(start instanceof Date) || Number.isNaN(start.valueOf())) return null;
  if (!(end instanceof Date) || Number.isNaN(end.valueOf())) return null;
  if (end <= start) return null;
  return { start, end };
};

const toFiniteNumber = (value, fallback = Number.MAX_SAFE_INTEGER) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const normalizeEquipmentText = (value) => String(value ?? '').trim().toLowerCase();
const normalizeMonitorCount = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const compareRankTuples = (left, right) => {
  for (let i = 0; i < left.length; i += 1) {
    if (left[i] < right[i]) return -1;
    if (left[i] > right[i]) return 1;
  }
  return 0;
};

const deskAutoSelectRank = (desk) => {
  const explicitNumber = Number(desk?.deskNumberInRoom);
  if (Number.isFinite(explicitNumber)) {
    return explicitNumber;
  }
  const remark = String(desk?.remark ?? '').trim();
  const numericMatch = remark.match(/\d+/);
  if (numericMatch) {
    const parsed = Number(numericMatch[0]);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return Number.MAX_SAFE_INTEGER;
};

  const sortDesksForAutoSelection = (desks) => {
  return [...(Array.isArray(desks) ? desks : [])].sort((left, right) => {
    const rankDiff = deskAutoSelectRank(left) - deskAutoSelectRank(right);
    if (rankDiff !== 0) return rankDiff;
    const remarkDiff = String(left?.remark ?? '').localeCompare(String(right?.remark ?? ''));
    if (remarkDiff !== 0) return remarkDiff;
    return toFiniteNumber(left?.id) - toFiniteNumber(right?.id);
  });
};

const timeRangesOverlap = (leftStart, leftEnd, rightStart, rightEnd) =>
  leftStart < rightEnd && leftEnd > rightStart;

const Booking = () => {
  const headers = useRef(JSON.parse(sessionStorage.getItem('headers')));
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state && typeof location.state === 'object' ? location.state : {};
  const storedContext = parseStoredBookingContext();
  const isAdmin = localStorage.getItem('admin') === 'true';
  const requestedBookingMode = 'desk';
  const localizer = momentLocalizer(moment);
  const calendarFormats = {
    timeGutterFormat: (date, culture, loc) => loc.format(date, 'HH:mm', culture),
    eventTimeRangeFormat: ({ start, end }, culture, loc) =>
      `${loc.format(start, 'HH:mm', culture)} – ${loc.format(end, 'HH:mm', culture)}`,
    agendaTimeRangeFormat: ({ start, end }, culture, loc) =>
      `${loc.format(start, 'HH:mm', culture)} – ${loc.format(end, 'HH:mm', culture)}`,
  };
  const roomId = locationState.roomId ?? storedContext?.roomId ?? null;
  const date = locationState.date ?? storedContext?.date ?? null;
  const preferredSlotStartValue = locationState.preferredSlot?.start ?? storedContext?.preferredSlot?.start ?? null;
  const preferredSlotEndValue = locationState.preferredSlot?.end ?? storedContext?.preferredSlot?.end ?? null;
  const preferredSlot = useMemo(() => {
    if (!preferredSlotStartValue || !preferredSlotEndValue) return null;
    return parsePreferredSlot({
      start: preferredSlotStartValue,
      end: preferredSlotEndValue,
    });
  }, [preferredSlotEndValue, preferredSlotStartValue]);
  const editBooking = locationState.editBooking || null;
  const isEditMode = Boolean(editBooking && editBooking.bookingId);
  const parsedDate = date ? new Date(date) : null;
  const hasValidDate = parsedDate instanceof Date && !Number.isNaN(parsedDate.valueOf());
  const initialDate = hasValidDate ? parsedDate : new Date();
  const contextDateIso = hasValidDate ? parsedDate.toISOString() : null;
  const bookingDay = hasValidDate ? moment(parsedDate).format('YYYY-MM-DD') : moment(new Date()).format('YYYY-MM-DD');

  //Safe selection of desks
  const selectionKey = `bookingSelection:${roomId ?? 'none'}:${hasValidDate ? moment(parsedDate).format('YYYY-MM-DD') : ''}`;

  // States
  const [room, setRoom] = useState(null);
  const [desks, setDesks] = useState([]);
  const [bookingMode, setBookingMode] = useState(requestedBookingMode);
  const [events, setEvents] = useState([]);
  const [event, setEvent] = useState({});
  const [calendarDate, setCalendarDate] = useState(initialDate);
  const [calendarView, setCalendarView] = useState('day');
  const [isBookingPending, setIsBookingPending] = useState(false);
  const [clickedDeskId, setClickedDeskId] = useState(null);
  const [clickedDeskRemark, setClickedDeskRemark] = useState('');
  const [activeDeskLock, setActiveDeskLock] = useState(null);
  const [isFavourite, setIsFavourite] = useState(false);
  const [bookingSettings, setBookingSettings] = useState({
    leadTimeMinutes: 30,
    maxDurationMinutes: 360,
    maxAdvanceDays: 30,
  });
  const [isReportDefectOpen, setIsReportDefectOpen] = useState(false);
  const [isAlternativeDeskDialogOpen, setIsAlternativeDeskDialogOpen] = useState(false);
  const [isAlternativeDeskDialogLoading, setIsAlternativeDeskDialogLoading] = useState(false);
  const [alternativeDesks, setAlternativeDesks] = useState([]);
  const [sameEquipmentAlternativeDesks, setSameEquipmentAlternativeDesks] = useState([]);
  const [preferredAlternativeDesks, setPreferredAlternativeDesks] = useState([]);
  const [hasFavouriteRooms, setHasFavouriteRooms] = useState(false);

  const eventRef = useRef(event);
  const eventsRef = useRef(events);
  const bookingPendingRef = useRef(false);
  const pendingSlotSuggestionRef = useRef(null);
  const activeDeskLockRef = useRef(null);
  const lockExpiryTimeoutRef = useRef(null);
  const preferredSlotRef = useRef(preferredSlot);
  const preferredNavigationRef = useRef(Boolean(preferredSlot));
  const preferredAutoSelectKeyRef = useRef(null);
  const autoSuggestedSlotActiveRef = useRef(false);
  const autoSuggestedDeskIdRef = useRef(null);

  const setBookingPending = useCallback((value) => {
    bookingPendingRef.current = value;
    setIsBookingPending(value);
  }, []);

  const clearLockExpiryTimer = useCallback(() => {
    if (lockExpiryTimeoutRef.current) {
      clearTimeout(lockExpiryTimeoutRef.current);
      lockExpiryTimeoutRef.current = null;
    }
  }, []);

  const clearDeskSelection = useCallback(() => {
    setClickedDeskId(null);
    setClickedDeskRemark('');
    setEvents([]);
    setEvent({});
    pendingSlotSuggestionRef.current = null;
    autoSuggestedSlotActiveRef.current = false;
    autoSuggestedDeskIdRef.current = null;
    sessionStorage.removeItem(selectionKey);
  }, [selectionKey]);

  const clearLocalDeskLock = useCallback(() => {
    clearLockExpiryTimer();
    setActiveDeskLock(null);
  }, [clearLockExpiryTimer]);

  const releaseDeskLockByPayload = useCallback((lockPayload, onDone) => {
    if (!lockPayload?.deskId || !lockPayload?.day) {
      if (typeof onDone === 'function') onDone();
      return;
    }
    postRequest(
      `${process.env.REACT_APP_BACKEND_URL}/booking-locks/release`,
      headers.current,
      () => {
        if (typeof onDone === 'function') onDone();
      },
      () => {
        if (typeof onDone === 'function') onDone();
      },
      JSON.stringify({
        deskId: lockPayload.deskId,
        day: lockPayload.day,
      })
    );
  }, []);

  const onDeskLockExpired = useCallback(() => {
    const lock = activeDeskLockRef.current;
    if (!lock) return;
    clearLocalDeskLock();
    clearDeskSelection();
    toast.warning(t('bookingLockExpired'));
  }, [clearDeskSelection, clearLocalDeskLock, t]);

  const armDeskLockExpiry = useCallback((expiresAt) => {
    clearLockExpiryTimer();
    if (!expiresAt) return;
    const expiryTs = new Date(expiresAt).getTime();
    const delay = expiryTs - Date.now();
    if (!Number.isFinite(delay) || delay <= 0) {
      onDeskLockExpired();
      return;
    }
    lockExpiryTimeoutRef.current = setTimeout(() => {
      onDeskLockExpired();
    }, delay);
  }, [clearLockExpiryTimer, onDeskLockExpired]);

  const acquireDeskLockAndSelect = useCallback((desk) => {
    if (!desk?.id) return;
    if (autoSuggestedSlotActiveRef.current && clickedDeskId && desk.id !== clickedDeskId) {
      setEvents((prev) => prev.filter((existingEvent) => existingEvent.id !== 1));
      setEvent({});
      autoSuggestedSlotActiveRef.current = false;
      autoSuggestedDeskIdRef.current = null;
    }
    const targetDay = (calendarDate instanceof Date && !Number.isNaN(calendarDate.valueOf()))
      ? moment(calendarDate).format('YYYY-MM-DD')
      : bookingDay;

    const acquire = () => {
      postRequest(
        `${process.env.REACT_APP_BACKEND_URL}/booking-locks/acquire`,
        headers.current,
        (data) => {
          const lockPayload = {
            deskId: desk.id,
            day: targetDay,
            expiresAt: data?.expiresAt || new Date(Date.now() + 3 * 60 * 1000).toISOString(),
          };
          setActiveDeskLock(lockPayload);
          armDeskLockExpiry(lockPayload.expiresAt);
          setClickedDeskId(desk.id);
          setClickedDeskRemark(desk.remark || '');
          sessionStorage.setItem(selectionKey, JSON.stringify({ deskId: desk.id }));
        },
        (status, data) => {
          if (status === 409 || (typeof data?.error === 'string' && data.error.toLowerCase().includes('currently being booked'))) {
            toast.warning(t('currentlyBeingBooked'));
          } else {
            toast.error((typeof data?.error === 'string' && data.error) || t('httpOther'));
          }
        },
        JSON.stringify({
          deskId: desk.id,
          day: targetDay,
        })
      );
    };

    const currentLock = activeDeskLockRef.current;
    if (currentLock && (currentLock.deskId !== desk.id || currentLock.day !== targetDay)) {
      clearLocalDeskLock();
      releaseDeskLockByPayload(currentLock, acquire);
      return;
    }
    acquire();
  }, [armDeskLockExpiry, bookingDay, calendarDate, clearLocalDeskLock, clickedDeskId, releaseDeskLockByPayload, selectionKey, t]);

  const ensureDeskLockForDay = useCallback((deskId, day, onSuccess, onFail) => {
    if (!deskId || !day) {
      if (typeof onFail === 'function') onFail();
      return;
    }

    const currentLock = activeDeskLockRef.current;
    if (currentLock?.deskId === deskId && currentLock?.day === day) {
      if (typeof onSuccess === 'function') onSuccess();
      return;
    }

    const previousLock = currentLock && currentLock?.deskId && currentLock?.day
      ? { deskId: currentLock.deskId, day: currentLock.day }
      : null;

    postRequest(
      `${process.env.REACT_APP_BACKEND_URL}/booking-locks/acquire`,
      headers.current,
      (data) => {
        const nextLock = {
          deskId,
          day,
          expiresAt: data?.expiresAt || new Date(Date.now() + 3 * 60 * 1000).toISOString(),
        };
        setActiveDeskLock(nextLock);
        armDeskLockExpiry(nextLock.expiresAt);
        if (previousLock && (previousLock.deskId !== deskId || previousLock.day !== day)) {
          releaseDeskLockByPayload(previousLock);
        }
        if (typeof onSuccess === 'function') onSuccess();
      },
      (status, data) => {
        if (status === 409 || (typeof data?.error === 'string' && data.error.toLowerCase().includes('currently being booked'))) {
          toast.warning(t('currentlyBeingBooked'));
        } else {
          toast.error((typeof data?.error === 'string' && data.error) || t('httpOther'));
        }
        if (typeof onFail === 'function') onFail(status, data);
      },
      JSON.stringify({ deskId, day })
    );
  }, [armDeskLockExpiry, releaseDeskLockByPayload, t]);

  const minStartTime = 6;
  const maxEndTime = 22;
  const typography_sx = { margin: '5px', textAlign: 'center' };

  useEffect(() => {
    setBookingMode(requestedBookingMode);
  }, [requestedBookingMode, roomId]);

  useEffect(() => {
    if (bookingMode !== 'room') return;
    const lock = activeDeskLockRef.current;
    clearLocalDeskLock();
    clearDeskSelection();
    if (lock?.deskId && lock?.day) {
      releaseDeskLockByPayload(lock);
    }
  }, [bookingMode, clearDeskSelection, clearLocalDeskLock, releaseDeskLockByPayload]);

  useEffect(() => {
    if (!roomId) return;
    const contextPayload = contextDateIso ? { roomId, date: contextDateIso } : { roomId };
    if (preferredSlot) {
      contextPayload.preferredSlot = {
        start: preferredSlot.start.toISOString(),
        end: preferredSlot.end.toISOString(),
      };
    }
    sessionStorage.setItem(BOOKING_CONTEXT_KEY, JSON.stringify(contextPayload));
  }, [roomId, contextDateIso, preferredSlot]);

  /** ----- API FETCH FUNCTIONS ----- */
  const fetchRoom = useCallback(() => {
    if (!roomId) return;
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

  const rankAlternativeDesks = useCallback((availableDesks) => {
    if (!Array.isArray(availableDesks)) return [];

    const selectedDesk = desks.find((desk) => desk.id === clickedDeskId) || null;
    const sourceRoom = selectedDesk?.room || room || null;
    const sourceRoomId = sourceRoom?.id;
    const sourceFloorId = sourceRoom?.floor?.floor_id;
    const sourceBuildingId = sourceRoom?.floor?.building?.id;
    const sourceRoomX = toFiniteNumber(sourceRoom?.x, 0);
    const sourceRoomY = toFiniteNumber(sourceRoom?.y, 0);
    const sourceFloorOrder = toFiniteNumber(sourceRoom?.floor?.ordering, 0);
    const selectedDeskNumber = toFiniteNumber(selectedDesk?.deskNumberInRoom, Number.MAX_SAFE_INTEGER);

    const roomDistanceToSource = (candidateRoom) => {
      const candidateX = toFiniteNumber(candidateRoom?.x, sourceRoomX);
      const candidateY = toFiniteNumber(candidateRoom?.y, sourceRoomY);
      return Math.hypot(candidateX - sourceRoomX, candidateY - sourceRoomY);
    };

    const rankTupleForDesk = (desk) => {
      const candidateRoom = desk?.room;
      const candidateFloor = candidateRoom?.floor;
      const candidateDeskNumber = toFiniteNumber(desk?.deskNumberInRoom, Number.MAX_SAFE_INTEGER);
      const isSameRoom = candidateRoom?.id === sourceRoomId;
      const isSameFloor = candidateFloor?.floor_id === sourceFloorId;
      const category = isSameRoom ? 0 : (isSameFloor ? 1 : 2);
      const floorDistance = category === 2
        ? Math.abs(toFiniteNumber(candidateFloor?.ordering, Number.MAX_SAFE_INTEGER) - sourceFloorOrder)
        : 0;
      const sameRoomDeskDistance = category === 0
        ? Math.abs(candidateDeskNumber - selectedDeskNumber)
        : 0;
      const roomDistance = roomDistanceToSource(candidateRoom);
      return [
        category,
        floorDistance,
        sameRoomDeskDistance,
        roomDistance,
        String(candidateRoom?.remark || ''),
        candidateDeskNumber,
        toFiniteNumber(desk?.id, Number.MAX_SAFE_INTEGER),
      ];
    };

    return availableDesks
      .filter((desk) => desk?.id && desk.id !== clickedDeskId)
      .filter((desk) => !sourceBuildingId || desk?.room?.floor?.building?.id === sourceBuildingId)
      .sort((left, right) => compareRankTuples(rankTupleForDesk(left), rankTupleForDesk(right)));
  }, [clickedDeskId, desks, room]);

  const buildEquipmentProfile = useCallback((desk) => ({
    ergonomicsHeightAdjustable: desk?.deskHeightAdjustable === true,
    monitorsQuantity: normalizeMonitorCount(desk?.monitorsQuantity),
    monitorsSize: normalizeEquipmentText(desk?.monitorsSize),
    deskType: normalizeEquipmentText(desk?.workstationType),
    technologyDockingStation: desk?.technologyDockingStation === true,
    technologyWebcam: desk?.technologyWebcam === true,
    technologyHeadset: desk?.technologyHeadset === true,
    specialFeatures: normalizeEquipmentText(desk?.specialFeatures),
  }), []);

  const isSameEquipmentProfile = useCallback((candidateDesk, selectedProfile) => {
    if (!selectedProfile) return false;
    const candidateProfile = buildEquipmentProfile(candidateDesk);
    return (
      candidateProfile.ergonomicsHeightAdjustable === selectedProfile.ergonomicsHeightAdjustable &&
      candidateProfile.monitorsQuantity === selectedProfile.monitorsQuantity &&
      candidateProfile.monitorsSize === selectedProfile.monitorsSize &&
      candidateProfile.deskType === selectedProfile.deskType &&
      candidateProfile.technologyDockingStation === selectedProfile.technologyDockingStation &&
      candidateProfile.technologyWebcam === selectedProfile.technologyWebcam &&
      candidateProfile.technologyHeadset === selectedProfile.technologyHeadset &&
      candidateProfile.specialFeatures === selectedProfile.specialFeatures
    );
  }, [buildEquipmentProfile]);

  const loadAlternativeDesksForSlot = useCallback((buildingId, startTime, endTime, selectedProfile) => {
    postRequest(
      `${process.env.REACT_APP_BACKEND_URL}/series/desksForBuildingAndDatesAndTimes/${buildingId}`,
      headers.current,
      (data) => {
        const rankedDesks = rankAlternativeDesks(data);
        const sameEquipmentRanked = rankedDesks.filter((desk) => isSameEquipmentProfile(desk, selectedProfile));
        setAlternativeDesks(rankedDesks.slice(0, 2));
        setSameEquipmentAlternativeDesks(sameEquipmentRanked.slice(0, 2));
        const userId = localStorage.getItem('userId');
        if (!userId) {
          setHasFavouriteRooms(false);
          setPreferredAlternativeDesks([]);
          setIsAlternativeDeskDialogLoading(false);
          return;
        }
        getRequest(
          `${process.env.REACT_APP_BACKEND_URL}/favourites/${userId}`,
          headers.current,
          (favourites) => {
            const favouriteRoomIds = new Set(
              (Array.isArray(favourites) ? favourites : [])
                .map((fav) => fav?.roomId)
                .filter((roomId) => roomId !== null && roomId !== undefined)
                .map((roomId) => String(roomId))
            );
            setHasFavouriteRooms(favouriteRoomIds.size > 0);
            setPreferredAlternativeDesks(
              rankedDesks
                .filter((desk) => favouriteRoomIds.has(String(desk?.room?.id)))
                .slice(0, 2)
            );
            setIsAlternativeDeskDialogLoading(false);
          },
          () => {
            setHasFavouriteRooms(false);
            setPreferredAlternativeDesks([]);
            setIsAlternativeDeskDialogLoading(false);
          }
        );
      },
      () => {
        setAlternativeDesks([]);
        setSameEquipmentAlternativeDesks([]);
        setPreferredAlternativeDesks([]);
        setHasFavouriteRooms(false);
        setIsAlternativeDeskDialogLoading(false);
        toast.error(t('httpOther'));
      },
      JSON.stringify({
        dates: [moment(startTime).format('YYYY-MM-DD')],
        startTime: moment(startTime).format('HH:mm'),
        endTime: moment(endTime).format('HH:mm'),
      })
    );
  }, [isSameEquipmentProfile, rankAlternativeDesks, t]);

  const fetchSelectedDeskProfileAndLoadAlternatives = useCallback((buildingId, startTime, endTime) => {
    if (!clickedDeskId) {
      setAlternativeDesks([]);
      setSameEquipmentAlternativeDesks([]);
      setPreferredAlternativeDesks([]);
      setHasFavouriteRooms(false);
      setIsAlternativeDeskDialogLoading(false);
      return;
    }
    getRequest(
      `${process.env.REACT_APP_BACKEND_URL}/desks/${clickedDeskId}`,
      headers.current,
      (selectedDeskFromApi) => {
        const selectedProfile = buildEquipmentProfile(selectedDeskFromApi);
        loadAlternativeDesksForSlot(buildingId, startTime, endTime, selectedProfile);
      },
      () => {
        setAlternativeDesks([]);
        setSameEquipmentAlternativeDesks([]);
        setPreferredAlternativeDesks([]);
        setHasFavouriteRooms(false);
        setIsAlternativeDeskDialogLoading(false);
        toast.error(t('httpOther'));
      }
    );
  }, [buildEquipmentProfile, clickedDeskId, loadAlternativeDesksForSlot, t]);

  const closeAlternativeDeskDialog = useCallback(() => {
    setIsAlternativeDeskDialogOpen(false);
    setIsAlternativeDeskDialogLoading(false);
    setAlternativeDesks([]);
    setSameEquipmentAlternativeDesks([]);
    setPreferredAlternativeDesks([]);
    setHasFavouriteRooms(false);
    pendingSlotSuggestionRef.current = null;
  }, []);

  const openAlternativeDeskDialogForSlot = useCallback((startTime, endTime) => {
    const selectedDesk = desks.find((desk) => desk.id === clickedDeskId) || null;
    const sourceRoom = selectedDesk?.room || room || null;
    const buildingId = sourceRoom?.floor?.building?.id;
    pendingSlotSuggestionRef.current = { start: new Date(startTime), end: new Date(endTime) };
    setIsAlternativeDeskDialogOpen(true);
    setAlternativeDesks([]);
    setSameEquipmentAlternativeDesks([]);
    setPreferredAlternativeDesks([]);
    setHasFavouriteRooms(false);

    if (!buildingId) {
      setIsAlternativeDeskDialogLoading(false);
      return;
    }

    setIsAlternativeDeskDialogLoading(true);
    fetchSelectedDeskProfileAndLoadAlternatives(buildingId, startTime, endTime);
  }, [clickedDeskId, desks, fetchSelectedDeskProfileAndLoadAlternatives, room]);

  const handleAlternativeDeskSelection = useCallback((desk) => {
    if (bookingPendingRef.current) return;
    const pendingSlot = pendingSlotSuggestionRef.current;
    if (!pendingSlot?.start || !pendingSlot?.end) {
      toast.error(t('blank'));
      return;
    }
    const userId = localStorage.getItem('userId');
    if (!userId) {
      toast.error(t('httpOther'));
      return;
    }

    const startMoment = moment(pendingSlot.start).seconds(0).milliseconds(0);
    const endMoment = moment(pendingSlot.end).seconds(0).milliseconds(0);
    if (startMoment.minute() % 30 !== 0 || endMoment.minute() % 30 !== 0) {
      toast.warning(t('bookingTimeAlignmentError'));
      return;
    }

    const bookingDTO = {
      userId: userId,
      roomId: desk?.room?.id ?? roomId,
      deskId: desk.id,
      day: startMoment.format('YYYY-MM-DD'),
      begin: startMoment.format('HH:mm:ss'),
      end: endMoment.format('HH:mm:ss'),
    };

    const lockRequestDTO = {
      deskId: desk.id,
      day: bookingDTO.day,
    };
    const releaseAlternativeLock = () => {
      postRequest(
        `${process.env.REACT_APP_BACKEND_URL}/booking-locks/release`,
        headers.current,
        () => {},
        () => {},
        JSON.stringify(lockRequestDTO)
      );
    };

    setBookingPending(true);
    postRequest(
      `${process.env.REACT_APP_BACKEND_URL}/booking-locks/acquire`,
      headers.current,
      () => {
        // Close suggestions popup first so the booking confirmation modal is visible.
        closeAlternativeDeskDialog();
        bookingPostRequest(
          'Booking.jsx',
          bookingDTO,
          desk?.remark || '',
          headers,
          t,
          (booking) => {
            clearLocalDeskLock();
            navigate('/home', { state: { booking }, replace: true });
          },
          {
            deskDetails: desk,
            onCancel: releaseAlternativeLock,
            onError: releaseAlternativeLock,
            onFinish: () => {
              setBookingPending(false);
            },
          }
        );
      }
      ,
      (status, data) => {
        if (status === 409 || (typeof data?.error === 'string' && data.error.toLowerCase().includes('currently being booked'))) {
          toast.warning(t('currentlyBeingBooked'));
        } else {
          toast.error((typeof data?.error === 'string' && data.error) || t('httpOther'));
        }
        setBookingPending(false);
      },
      JSON.stringify(lockRequestDTO)
    );
  }, [clearLocalDeskLock, closeAlternativeDeskDialog, navigate, roomId, setBookingPending, t]);

  useEffect(() => {
    preferredSlotRef.current = preferredSlot;
  }, [preferredSlot]);

  const clearStoredPreferredSlot = useCallback(() => {
    preferredNavigationRef.current = false;
    try {
      const nextContext = JSON.parse(sessionStorage.getItem(BOOKING_CONTEXT_KEY) || 'null');
      if (nextContext && typeof nextContext === 'object') {
        delete nextContext.preferredSlot;
        sessionStorage.setItem(BOOKING_CONTEXT_KEY, JSON.stringify(nextContext));
      }
    } catch {
      // ignore invalid stored booking context
    }
  }, []);

  const canApplyPreferredSlotSilently = useCallback((slotData, calendarEvents = eventsRef.current) => {
    if (!slotData?.start || !slotData?.end) return false;

    const startTime = new Date(slotData.start);
    const endTime = new Date(slotData.end);
    if (Number.isNaN(startTime.valueOf()) || Number.isNaN(endTime.valueOf()) || endTime <= startTime) {
      return false;
    }

    const duration = endTime - startTime;
    const now = new Date();
    const startDay = new Date(startTime);
    startDay.setHours(0, 0, 0, 0);
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    if (startDay < today) {
      return false;
    }

    const leadMinutes = bookingSettings?.leadTimeMinutes ?? 0;
    const earliestAllowed = roundUpToNextHalfHour(new Date(now.getTime() + leadMinutes * 60000));
    if (startTime < earliestAllowed) {
      return false;
    }

    if (duration < 2 * 60 * 60 * 1000) {
      return false;
    }

    if (bookingSettings?.maxDurationMinutes !== null && bookingSettings?.maxDurationMinutes !== undefined) {
      if (duration > bookingSettings.maxDurationMinutes * 60 * 1000) {
        return false;
      }
    }

    if (bookingSettings?.maxAdvanceDays !== null && bookingSettings?.maxAdvanceDays !== undefined) {
      const maxDate = new Date(today);
      maxDate.setDate(maxDate.getDate() + bookingSettings.maxAdvanceDays);
      if (startDay > maxDate) {
        return false;
      }
    }

    const updatedEvents = calendarEvents.filter((e) => {
      if (e.id === 1) return false;
      if (isEditMode && editBooking?.bookingId && e.id === editBooking.bookingId) return false;
      return true;
    });

    const overlappingEvents = updatedEvents.filter((e) =>
      timeRangesOverlap(e.start, e.end, startTime, endTime)
    );

    return overlappingEvents.length === 0;
  }, [bookingSettings, editBooking, isEditMode]);

  const applySlotSelection = useCallback((slotData, currentEventId, calendarEvents = eventsRef.current) => {
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

    const updatedEvents = calendarEvents.filter((e) => {
      if (e.id === currentEventId) return false;
      if (isEditMode && editBooking?.bookingId && e.id === editBooking.bookingId) return false;
      return true;
    });

    const overlappingEvents = updatedEvents.filter((e) =>
      timeRangesOverlap(e.start, e.end, startTime, endTime)
    );
    if (overlappingEvents.length > 0) {
      const overlapsScheduledBlocking = overlappingEvents.some((e) => e?.isScheduledBlocking);
      toast.warning(overlapsScheduledBlocking ? t('scheduledBlockingBookingConflict') : t('overlap'));
      openAlternativeDeskDialogForSlot(startTime, endTime);
      return false;
    }

    const newEvent = { start: slotData.start, end: slotData.end, id: 1 };
    setEvents([
      ...calendarEvents.filter((e) => e.id !== 1),
      newEvent,
    ]);

    setEvent(newEvent);
    if (clickedDeskId) {
      ensureDeskLockForDay(clickedDeskId, moment(startTime).format('YYYY-MM-DD'));
    }
    pendingSlotSuggestionRef.current = null;
    return true;
  }, [bookingSettings, clickedDeskId, editBooking, ensureDeskLockForDay, isEditMode, openAlternativeDeskDialogForSlot, t]);

  const selectSlot = useCallback((slotData, currentEventId) => {
    autoSuggestedSlotActiveRef.current = false;
    applySlotSelection(slotData, currentEventId, eventsRef.current);
  }, [applySlotSelection]);

  const loadBookings = useCallback(() => {
    if (!clickedDeskId) return;
    const baseDate = calendarDate instanceof Date && !Number.isNaN(calendarDate.valueOf())
      ? calendarDate
      : new Date();
    const rangeStart = moment(baseDate).startOf(calendarView === 'week' ? 'week' : 'day');
    const rangeEnd = moment(baseDate).endOf(calendarView === 'week' ? 'week' : 'day');
    const from = rangeStart.format('YYYY-MM-DDTHH:mm:ss');
    const to = rangeEnd.format('YYYY-MM-DDTHH:mm:ss');

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

        const applyCalendarEvents = (scheduledBlockingEvents = []) => {
          const mergedEvents = [...bookingEvents, ...scheduledBlockingEvents];
          if (isEditMode && editBooking?.deskId === clickedDeskId) {
            const editStart = new Date(`${editBooking.day}T${editBooking.begin}`);
            const editEnd = new Date(`${editBooking.day}T${editBooking.end}`);
            const editSelection = { start: editStart, end: editEnd, id: 1 };
            setEvents([...mergedEvents, editSelection]);
            setEvent(editSelection);
          } else {
            eventsRef.current = mergedEvents;
            setEvents(mergedEvents);
            setEvent({});
            const pendingPreferredSlot = preferredSlotRef.current;
            if (pendingPreferredSlot?.start && pendingPreferredSlot?.end) {
              const preferredSlotData = {
                start: pendingPreferredSlot.start,
                end: pendingPreferredSlot.end,
              };
              const canApplyPreferredSlot = canApplyPreferredSlotSilently(preferredSlotData, mergedEvents);
              if (canApplyPreferredSlot) {
                const appliedPreferredSlot = applySlotSelection(
                  preferredSlotData,
                  undefined,
                  mergedEvents
                );
                autoSuggestedSlotActiveRef.current = Boolean(appliedPreferredSlot);
                autoSuggestedDeskIdRef.current = appliedPreferredSlot ? clickedDeskId : null;
              } else {
                autoSuggestedSlotActiveRef.current = false;
                autoSuggestedDeskIdRef.current = null;
              }
            }
          }
        };

        getRequest(
          `${process.env.REACT_APP_BACKEND_URL}/bookings/scheduled-blockings-for-desk/${clickedDeskId}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
          headers.current,
          (scheduledBlockings) => {
            const scheduledBlockingEvents = (Array.isArray(scheduledBlockings) ? scheduledBlockings : []).map((blocking) => ({
              start: new Date(blocking.startDateTime),
              end: new Date(blocking.endDateTime),
              title: t('scheduledBlockingLabel'),
              id: `scheduled-blocking-${blocking.id}`,
              isScheduledBlocking: true,
            }));
            applyCalendarEvents(scheduledBlockingEvents);
          },
          () => {
            applyCalendarEvents([]);
          }
        );
      },
      () => console.error('Failed to fetch bookings')
    );
  }, [applySlotSelection, calendarDate, calendarView, canApplyPreferredSlotSilently, clickedDeskId, editBooking, isEditMode, t]);

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
    const selectedDesk = desks.find((desk) => desk.id === clickedDeskId) || null;

    if (!isEditMode) {
      setBookingPending(true);
      ensureDeskLockForDay(
        clickedDeskId,
        bookingDTO.day,
        () => {
          bookingPostRequest(
            'Booking.jsx',
            bookingDTO,
            clickedDeskRemark,
            headers,
            t,
            (booking) => {
              clearLocalDeskLock();
              navigate('/home', { state: { booking }, replace: true });
            },
            {
              deskDetails: selectedDesk,
              onCancel: () => {
                const lock = activeDeskLockRef.current;
                clearLocalDeskLock();
                clearDeskSelection();
                if (lock?.deskId && lock?.day) {
                  releaseDeskLockByPayload(lock);
                }
              },
              onError: () => {
                const lock = activeDeskLockRef.current;
                clearLocalDeskLock();
                clearDeskSelection();
                if (lock?.deskId && lock?.day) {
                  releaseDeskLockByPayload(lock);
                }
              },
              onFinish: () => {
                setBookingPending(false);
              },
            }
          );
        },
        () => {
          setBookingPending(false);
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

    const createDraftBooking = (dto, onSuccess, onFail) => {
      postRequest(
        `${process.env.REACT_APP_BACKEND_URL}/bookings`,
        headers.current,
        (data) => onSuccess(data),
        (status, data) => onFail(status, data),
        JSON.stringify({
          ...dto,
          bookingInProgress: true,
        })
      );
    };

    const confirmDraftBooking = (draftBookingId, onSuccess, onFail) => {
      putRequest(
        `${process.env.REACT_APP_BACKEND_URL}/bookings/confirm/${draftBookingId}`,
        headers.current,
        (dat) => onSuccess(dat),
        () => onFail()
      );
    };

    const deleteBookingById = (bookingId, onSuccess, onFail) => {
      deleteRequest(
        `${process.env.REACT_APP_BACKEND_URL}/bookings/${bookingId}`,
        headers.current,
        () => onSuccess(),
        () => onFail()
      );
    };

    const tryRestoreOld = () => {
      createDraftBooking(
        oldBookingDTO,
        (draft) => {
          confirmDraftBooking(draft.id, () => {}, () => {});
        },
        () => {}
      );
    };

    const showEditConfirmation = (hasOverlap, onContinue, onCancel) => {
      showDeskBookingConfirmation({
        t,
        deskRemark: clickedDeskRemark,
        deskDetails: selectedDesk,
        bookingData: {
          day: newDay,
          begin: newBegin,
          end: newEnd,
        },
        hasOverlap,
        onConfirm: onContinue,
        onCancel,
        title: t('editBooking'),
      });
    };

    const handleCreateThenDelete = () => {
      createDraftBooking(
        bookingDTO,
        (draft) => {
          checkDeskBookingOverlap(
            headers,
            draft.id,
            editBooking.bookingId,
            t,
            (hasOverlap) => {
              showEditConfirmation(
                hasOverlap,
                () => {
                  confirmDraftBooking(
                    draft.id,
                    () => {
                      deleteBookingById(
                        editBooking.bookingId,
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
                      deleteBookingById(draft.id, () => {}, () => {});
                      setBookingPending(false);
                    }
                  );
                },
                () => {
                  deleteBookingById(
                    draft.id,
                    () => {
                      setBookingPending(false);
                    },
                    () => {
                      setBookingPending(false);
                    }
                  );
                }
              );
            },
            () => {
              showEditConfirmation(
                false,
                () => {
                  confirmDraftBooking(
                    draft.id,
                    () => {
                      deleteBookingById(
                        editBooking.bookingId,
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
                      deleteBookingById(draft.id, () => {}, () => {});
                      setBookingPending(false);
                    }
                  );
                },
                () => {
                  deleteBookingById(
                    draft.id,
                    () => {
                      setBookingPending(false);
                    },
                    () => {
                      setBookingPending(false);
                    }
                  );
                }
              );
            }
          );
        },
        (status, data) => {
          console.log('Failed to create edit draft booking.', status, data);
          toast.error(t('httpOther'));
          setBookingPending(false);
        }
      );
    };

    const handleDeleteThenCreate = () => {
      deleteBookingById(
        editBooking.bookingId,
        () => {
          createDraftBooking(
            bookingDTO,
            (draft) => {
              checkDeskBookingOverlap(
                headers,
                draft.id,
                editBooking.bookingId,
                t,
                (hasOverlap) => {
                  showEditConfirmation(
                    hasOverlap,
                    () => {
                      confirmDraftBooking(
                        draft.id,
                        () => {
                          setBookingPending(false);
                          navigate('/mybookings', { replace: true });
                        },
                        () => {
                          tryRestoreOld();
                          toast.error(t('httpOther'));
                          deleteBookingById(draft.id, () => {}, () => {});
                          setBookingPending(false);
                        }
                      );
                    },
                    () => {
                      deleteBookingById(
                        draft.id,
                        () => {
                          tryRestoreOld();
                          setBookingPending(false);
                        },
                        () => {
                          tryRestoreOld();
                          setBookingPending(false);
                        }
                      );
                    }
                  );
                },
                () => {
                  showEditConfirmation(
                    false,
                    () => {
                      confirmDraftBooking(
                        draft.id,
                        () => {
                          setBookingPending(false);
                          navigate('/mybookings', { replace: true });
                        },
                        () => {
                          tryRestoreOld();
                          toast.error(t('httpOther'));
                          deleteBookingById(draft.id, () => {}, () => {});
                          setBookingPending(false);
                        }
                      );
                    },
                    () => {
                      deleteBookingById(
                        draft.id,
                        () => {
                          tryRestoreOld();
                          setBookingPending(false);
                        },
                        () => {
                          tryRestoreOld();
                          setBookingPending(false);
                        }
                      );
                    }
                  );
                }
              );
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
      (moment(newBegin, 'HH:mm:ss').isBefore(moment(originalEnd, 'HH:mm:ss')) &&
        moment(newEnd, 'HH:mm:ss').isAfter(moment(originalBegin, 'HH:mm:ss')));

    if (bookingPendingRef.current) return;
    setBookingPending(true);
    ensureDeskLockForDay(
      clickedDeskId,
      bookingDTO.day,
      () => {
        if (overlapsOld) {
          handleDeleteThenCreate();
        } else {
          handleCreateThenDelete();
        }
      },
      () => {
        setBookingPending(false);
      }
    );
  };
  /** ----- EFFECTS ----- */
  // Fetch room once
  useEffect(() => { fetchRoom(); }, [fetchRoom]);
  useEffect(() => { fetchBookingSettings(); }, [fetchBookingSettings]);

  useEffect(()=>{eventRef.current=event},[event])

  useEffect(()=>{eventsRef.current=events},[events])

  useEffect(() => {
    activeDeskLockRef.current = activeDeskLock;
  }, [activeDeskLock]);

  useEffect(() => () => {
    const lock = activeDeskLockRef.current;
    clearLockExpiryTimer();
    if (lock?.deskId && lock?.day) {
      releaseDeskLockByPayload(lock);
    }
  }, [clearLockExpiryTimer, releaseDeskLockByPayload]);

  // Fetch desks when roomId changes
  useEffect(() => { if (roomId) fetchDesks(); }, [roomId, fetchDesks]);

  //Load saved desk selection from sessionStorage
  useEffect(() => {
    if (bookingMode !== 'desk' || !desks.length) return;
    try {
      if (isEditMode && editBooking?.deskId) {
        const match = desks.find((desk) => desk.id === editBooking.deskId);
        if (match) {
          acquireDeskLockAndSelect(match);
          return;
        }
      }
      if (preferredNavigationRef.current) {
        return;
      }
      const saved = JSON.parse(sessionStorage.getItem(selectionKey));
      if (saved?.deskId) {
        const match = desks.find((desk) => desk.id === saved.deskId);
        if (match) {
          acquireDeskLockAndSelect(match);
        }
      }
    } catch {
      // ignore invalid stored value
    }
  }, [acquireDeskLockAndSelect, bookingMode, desks, editBooking, isEditMode, selectionKey]);

  useEffect(() => {
    if (bookingMode !== 'desk' || !preferredNavigationRef.current || isEditMode || clickedDeskId || !desks.length) {
      return;
    }

    const pendingPreferredSlot = preferredSlotRef.current;
    if (!pendingPreferredSlot?.start || !pendingPreferredSlot?.end) {
      return;
    }

    const slotDay = moment(pendingPreferredSlot.start).format('YYYY-MM-DD');
    const autoSelectKey = `${roomId ?? 'none'}:${slotDay}:${pendingPreferredSlot.start.toISOString()}:${pendingPreferredSlot.end.toISOString()}`;
    if (preferredAutoSelectKeyRef.current === autoSelectKey) {
      return;
    }
    preferredAutoSelectKeyRef.current = autoSelectKey;

    postRequest(
      `${process.env.REACT_APP_BACKEND_URL}/series/desksForDatesAndTimes`,
      headers.current,
      (data) => {
        const availableDeskIdsInRoom = new Set(
          (Array.isArray(data) ? data : [])
            .filter((desk) => String(desk?.room?.id ?? '') === String(roomId))
            .map((desk) => desk?.id)
            .filter((deskId) => deskId !== null && deskId !== undefined)
        );

        const roomAvailableDesks = sortDesksForAutoSelection(
          desks.filter((desk) =>
            availableDeskIdsInRoom.has(desk?.id)
            && !desk?.hidden
            && !desk?.blocked
          )
        );

        if (roomAvailableDesks.length > 0) {
          acquireDeskLockAndSelect(roomAvailableDesks[0]);
          return;
        }

        clearStoredPreferredSlot();
        autoSuggestedSlotActiveRef.current = false;
        autoSuggestedDeskIdRef.current = null;
        const fallbackDesk = sortDesksForAutoSelection(
          desks.filter((desk) => !desk?.hidden && !desk?.blocked)
        )[0];
        if (fallbackDesk) {
          acquireDeskLockAndSelect(fallbackDesk);
        }
      },
      () => {
        clearStoredPreferredSlot();
        autoSuggestedSlotActiveRef.current = false;
        autoSuggestedDeskIdRef.current = null;
      },
      JSON.stringify({
        dates: [slotDay],
        startTime: moment(pendingPreferredSlot.start).format('HH:mm'),
        endTime: moment(pendingPreferredSlot.end).format('HH:mm'),
      })
    );
  }, [acquireDeskLockAndSelect, bookingMode, clearStoredPreferredSlot, clickedDeskId, desks, isEditMode, roomId]);

  useEffect(() => {
    if (bookingMode === 'desk' && preferredNavigationRef.current && clickedDeskId) {
      clearStoredPreferredSlot();
    }
  }, [bookingMode, clearStoredPreferredSlot, clickedDeskId]);

  useEffect(() => {
    if (bookingMode !== 'desk') {
      return;
    }
    if (!autoSuggestedSlotActiveRef.current || autoSuggestedDeskIdRef.current == null) {
      return;
    }
    if (clickedDeskId && clickedDeskId !== autoSuggestedDeskIdRef.current) {
      setEvents((prev) => prev.filter((existingEvent) => existingEvent.id !== 1));
      setEvent({});
      autoSuggestedSlotActiveRef.current = false;
      autoSuggestedDeskIdRef.current = null;
    }
  }, [bookingMode, clickedDeskId]);

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
  useEffect(() => {
    if (bookingMode === 'desk' && clickedDeskId) {
      loadBookings();
    }
  }, [bookingMode, clickedDeskId, loadBookings]);

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
  const getHeadline = () => (room ? t('availableDesksInRoom', { room: room.remark }) : t('availableDesks'));
  const FALLBACK_PLACEHOLDER = '—';

  const showOrPlaceholder = (value) => {
    if (value === null || value === undefined) return FALLBACK_PLACEHOLDER;
    const str = String(value).trim();
    return str ? str : FALLBACK_PLACEHOLDER;
  };

  const monitorSummary = (desk) => {
    const quantity = desk?.monitorsQuantity;
    if (quantity == null) {
      return '1';
    }
    return showOrPlaceholder(quantity);
  };

  const deskTypeSummary = (desk) => {
    if (desk?.deskHeightAdjustable === true) return t('adjustable');
    return t('notAdjustable');
  };

  const technologySummary = (desk) => {
    const items = [];
    if (desk?.technologyDockingStation === true) items.push(t('technologyDockingStation'));
    if (desk?.technologyWebcam === true) items.push(t('technologyWebcam'));
    if (desk?.technologyHeadset === true) items.push(t('technologyHeadset'));
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
      helpText={bookingMode === 'room' ? t('helpCreateRoomBooking') : t('helpCreateBooking')}
      useGenericBackButton
      withPaddingX
    >
      {isAdmin && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <ToggleButtonGroup
            exclusive
            value={bookingMode}
            onChange={(_event, value) => {
              if (value) {
                setBookingMode(value);
              }
            }}
            color="primary"
          >
            <ToggleButton value="desk">{t('deskBookingMode')}</ToggleButton>
            <ToggleButton value="room">{t('roomBookingMode')}</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      )}
      {bookingMode === 'room' ? (
        <RoomBulkBookingPanel
          headers={headers.current}
          roomId={roomId}
          room={room}
          initialDate={initialDate}
          preferredSlot={preferredSlot}
          onBooked={() => {
            navigate('/home', { replace: true });
          }}
        />
      ) : (
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
                          <Typography variant="caption" sx={{ fontWeight: 700, color: semanticColors.defects.urgency.MEDIUM }}>
                            {t('defectBlocked')}
                          </Typography>
                          {desk.blockedReasonCategory && (
                            <Typography variant="caption">
                              {t('defectBlockedReason', { reason: desk.blockedReasonCategory.replace(/_/g, ' ') })}
                            </Typography>
                          )}
                          {desk.blockedEndDateTime ? (
                            <Typography variant="caption">
                              {t('defectBlockedUntilTime', { datetime: new Date(desk.blockedEndDateTime).toLocaleString() })}
                            </Typography>
                          ) : desk.blockedEstimatedEndDate ? (
                            <Typography variant="caption">
                              {t('defectBlockedUntil', { date: desk.blockedEstimatedEndDate })}
                            </Typography>
                          ) : null}
                        </>
                      )}
                      <Typography variant="caption">{t('booking.tooltip.ergonomics')}: {desk?.workstationType || t('workstationTypeStandard')}</Typography>
                      <Typography variant="caption">{t('booking.tooltip.monitors')}: {monitorSummary(desk)}</Typography>
                      <Typography variant="caption">{t('deskType')}: {deskTypeSummary(desk)}</Typography>
                      <Typography variant="caption">{t('booking.tooltip.technology')}: {technologySummary(desk)}</Typography>
                      <Typography variant="caption">{t('booking.tooltip.specialFeatures')}: {showOrPlaceholder(desk?.specialFeatures)}</Typography>
                    </Box>
                  }
                >
                  <Box
                    sx={{
                      backgroundColor: desk.blocked
                        ? semanticColors.booking.desk.blocked
                        : desk.id === clickedDeskId ? semanticColors.booking.desk.selected : semanticColors.booking.desk.available,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      height: '125px',
                      width: '140px',
                      borderRadius: '7px',
                      padding: '5px',
                      cursor: desk.blocked ? 'not-allowed' : 'pointer',
                      opacity: desk.blocked ? 0.6 : 1,
                      boxShadow: colorVars.shadow.desk,
                      transition: desk.id === clickedDeskId ? '0.25s' : 'box-shadow 0.3s',
                      '&:hover': { boxShadow: desk.blocked ? undefined : colorVars.shadow.deskHover },
                    }}
                    onClick={() => {
                      if (desk.blocked) {
                        toast.warning(t('defectAlreadyOpen'));
                        return;
                      }
                      if (desk.id === clickedDeskId) {
                        const lock = activeDeskLockRef.current;
                        clearLocalDeskLock();
                        clearDeskSelection();
                        if (lock?.deskId && lock?.day) {
                          releaseDeskLockByPayload(lock);
                        }
                        return;
                      }
                      acquireDeskLockAndSelect(desk);
                    }}
                  >
                    <Typography sx={{ ...typography_sx, margin: 0 }}>{desk.remark}</Typography>
                    {desk.blocked && (
                      <Typography sx={{ ...typography_sx, marginTop: '6px', fontSize: '0.7rem', color: colorVars.text.error, fontWeight: 600 }}>
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
                sx={{ color: isFavourite ? semanticColors.booking.favourite.active : semanticColors.booking.favourite.inactive, fontSize: '22px' }}
              >
                {isFavourite ? <FaStar /> : <FaRegStar />}
              </IconButton>
            </Tooltip>
          </Box>
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            views={['day', 'week']}
            view={calendarView}
            date={calendarDate}
            defaultView="day"
            defaultDate={initialDate}
            onView={(nextView) => setCalendarView(nextView)}
            onNavigate={(nextDate) => setCalendarDate(nextDate)}
            onSelectSlot={(data) => (clickedDeskId ? selectSlot(data, event.id) : toast.warning(t('selectDeskMessage')))}
            selectable
            min={new Date(0, 0, 0, minStartTime, 0, 0)}
            max={new Date(0, 0, 0, maxEndTime, 0, 0)}
            formats={calendarFormats}
            eventPropGetter={(calendarEvent) => ({
              style: {
                backgroundColor: calendarEvent?.isScheduledBlocking
                  ? colorVars.state.neutralDark
                  : (calendarEvent?.id === 1 ? colorVars.brand.primary : colorVars.state.neutralGrey),
                border: calendarEvent?.isScheduledBlocking ? `1px solid ${colorVars.text.error}` : undefined,
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
                backgroundColor: colorVars.brand.accent,
                borderRadius: '8px',
                color: colorVars.text.inverse,
                fontSize: '16px',
                textAlign: 'center',
                transition: 'all 0.5s',
                '&.Mui-disabled': {
                  backgroundColor: colorVars.state.neutralMid,
                  color: colorVars.text.inverse,
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
                  backgroundColor: colorVars.text.error,
                  borderRadius: '8px',
                  color: colorVars.text.inverse,
                  fontSize: '16px',
                  textAlign: 'center',
                  transition: 'all 0.5s',
                  '&:hover': { backgroundColor: colorVars.text.errorDark },
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
      )}

      {bookingMode === 'desk' && (
        <>
          <ReportDefectModal
            isOpen={isReportDefectOpen}
            onClose={() => setIsReportDefectOpen(false)}
            deskId={clickedDeskId}
          />
          <Dialog
            open={isAlternativeDeskDialogOpen}
            onClose={closeAlternativeDeskDialog}
            maxWidth="lg"
            fullWidth
          >
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, flex: 1 }}>
                {t('otherFreeDesksForSelectedTimeSlots', {
                  start: pendingSlotSuggestionRef.current?.start
                    ? moment(pendingSlotSuggestionRef.current.start).format('HH:mm')
                    : '--:--',
                  end: pendingSlotSuggestionRef.current?.end
                    ? moment(pendingSlotSuggestionRef.current.end).format('HH:mm')
                    : '--:--',
                })}
              </Typography>
              <IconButton
                onClick={closeAlternativeDeskDialog}
                aria-label={t('close')}
                sx={{ ml: 'auto' }}
              >
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers>
              {isAlternativeDeskDialogLoading ? (
                <Typography>{t('loading')}</Typography>
              ) : (
                <>
                  {alternativeDesks.length > 0 ? (
                    <DeskTable
                      name="booking_alternative_desks"
                      desks={alternativeDesks}
                      submit_function={handleAlternativeDeskSelection}
                      hideHeader
                      submitLabelKey="book"
                    />
                  ) : (
                    <Typography>{t('noFreeDesksForSelectedTimeSlotInBuilding')}</Typography>
                  )}
                  <Typography variant="h6" sx={{ mt: 2, mb: 1, fontWeight: 600 }}>
                    {t('otherDesksWithSameEquipementForSelectedTimeSlots', {
                      start: pendingSlotSuggestionRef.current?.start
                        ? moment(pendingSlotSuggestionRef.current.start).format('HH:mm')
                        : '--:--',
                      end: pendingSlotSuggestionRef.current?.end
                        ? moment(pendingSlotSuggestionRef.current.end).format('HH:mm')
                        : '--:--',
                    })}
                  </Typography>
                  {sameEquipmentAlternativeDesks.length > 0 ? (
                    <DeskTable
                      name="booking_alternative_desks_same_equipment"
                      desks={sameEquipmentAlternativeDesks}
                      submit_function={handleAlternativeDeskSelection}
                      hideHeader
                      submitLabelKey="book"
                    />
                  ) : (
                    <Typography>{t('noFreeDesksWithSameEquipmentForSelectedTimeSlotInBuilding')}</Typography>
                  )}
                  <Typography variant="h6" sx={{ mt: 2, mb: 1, fontWeight: 600 }}>
                    {t('closestPreferredDesksForSelectedTimeSlots', {
                      start: pendingSlotSuggestionRef.current?.start
                        ? moment(pendingSlotSuggestionRef.current.start).format('HH:mm')
                        : '--:--',
                      end: pendingSlotSuggestionRef.current?.end
                        ? moment(pendingSlotSuggestionRef.current.end).format('HH:mm')
                        : '--:--',
                    })}
                  </Typography>
                  {!hasFavouriteRooms ? (
                    <Typography>{t('noFavoriteRooms')}</Typography>
                  ) : preferredAlternativeDesks.length > 0 ? (
                    <DeskTable
                      name="booking_alternative_desks_preferred"
                      desks={preferredAlternativeDesks}
                      submit_function={handleAlternativeDeskSelection}
                      hideHeader
                      submitLabelKey="book"
                    />
                  ) : (
                    <Typography>{t('noFreeDesksInFavoriteRoomsForSelectedTimeSlot')}</Typography>
                  )}
                </>
              )}
            </DialogContent>
          </Dialog>
        </>
      )}
    </LayoutPage>
  );
};

export default Booking;
