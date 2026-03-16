import { Alert, Box, Button, Chip, Divider, Paper, Typography } from '@mui/material';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { getRequest, postRequest, deleteRequest } from '../RequestFunctions/RequestFunctions';
import CreateDatePicker from '../misc/CreateDatePicker';
import { colorVars, semanticColors } from '../../theme';

const CARPARK_SVG_URL = '/Assets/carpark_overview_ready.svg';
const CARPARK_SELECTED_DATE_KEY = 'carparkSelectedDate';
const CARPARK_DEFAULT_DURATION_MINUTES = 120;
const CARPARK_MIN_LEAD_MINUTES = 30;
const CARPARK_OVERLAP_BUFFER_MINUTES = 30;
const CARPARK_MIN_SELECTION_MINUTES = 120;
const CARPARK_NOTIFICATION_STATE_VERSION = 'v3';
const CARPARK_DECISION_NOTIFICATION_FALLBACK_WINDOW_MINUTES = 20;
const CARPARK_RES_STATUS_SNAPSHOT_KEY = `carparkReservationStatusSnapshot_${CARPARK_NOTIFICATION_STATE_VERSION}`;
const CARPARK_NOTIFIED_STATUS_KEY = `carparkNotifiedReservationStatus_${CARPARK_NOTIFICATION_STATE_VERSION}`;
const CARPARK_NOTIFIED_REMINDERS_KEY = `carparkNotifiedReservationReminders_${CARPARK_NOTIFICATION_STATE_VERSION}`;
const CARPARK_TIMELINE_START_HOUR = 6;
const CARPARK_TIMELINE_END_HOUR = 22;
const CARPARK_CANDIDATE_SPOTS = [
  { label: '28', x: 590, y: 110, width: 70, height: 130 },
  { label: '27', x: 660, y: 110, width: 70, height: 130 },
  { label: '46', x: -495, y: 378, width: 70, height: 130 },
  { label: '45', x: -425, y: 378, width: 70, height: 130 },
  { label: '44', x: -355, y: 378, width: 70, height: 130 },
  { label: '42', x: -215, y: 378, width: 70, height: 130 },
  { label: '41', x: -145, y: 378, width: 70, height: 130 },
];
const CARPARK_CANDIDATE_SPOT_LABEL_BY_RECT_KEY = new Map(
  CARPARK_CANDIDATE_SPOTS.map(({ label, x, y, width, height }) => [`${x}:${y}:${width}:${height}`, label])
);

const readSessionJson = (key, fallback) => {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : fallback;
  } catch {
    return fallback;
  }
};

const writeSessionJson = (key, value) => {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage issues
  }
};

const namespacedCarparkKey = (baseKey) => {
  const userPart = localStorage.getItem('userId') || localStorage.getItem('email') || 'anon';
  return `${baseKey}_${userPart}`;
};

const trimTimeForDisplay = (t) => (typeof t === 'string' ? t.slice(0, 5) : '');

const parseReservationStart = (day, begin) => {
  if (!day || !begin) return null;
  const normalizedTime = String(begin).length >= 8 ? String(begin) : `${String(begin)}:00`;
  const parsed = new Date(`${day}T${normalizedTime}`);
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
};

const parseCreatedAtValue = (createdAt) => {
  if (!createdAt) return null;

  if (Array.isArray(createdAt)) {
    const [y, mo, d, h = 0, mi = 0, s = 0, ns = 0] = createdAt.map((v) => Number(v));
    if (![y, mo, d, h, mi, s, ns].every(Number.isFinite)) return null;
    const parsed = new Date(y, Math.max(0, mo - 1), d, h, mi, s, Math.floor(ns / 1_000_000));
    return Number.isNaN(parsed.valueOf()) ? null : parsed;
  }

  const parsed = new Date(createdAt);
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
};

const formatTimeHHMM = (d) =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

const minutesToTimeString = (totalMinutes) =>
  `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;

const parseTimeToMinutes = (timeValue) => {
  if (!timeValue) return NaN;
  const [hh, mm] = String(timeValue).split(':');
  const hours = Number.parseInt(hh, 10);
  const minutes = Number.parseInt(mm, 10);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return NaN;
  return hours * 60 + minutes;
};

const formatISODateValue = (d) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const formatDayPathValue = (d) => {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
};

const normalizeTimeValue = (raw) => {
  if (typeof raw !== 'string') return '';
  return raw.length === 5 ? `${raw}:00` : raw;
};

const buildDateTimeForDay = (day, timeValue) => {
  if (!(day instanceof Date) || Number.isNaN(day.valueOf()) || !timeValue) return null;
  const parsed = new Date(`${formatISODateValue(day)}T${normalizeTimeValue(timeValue)}`);
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
};

const parkingTimelineStatusFromReservation = (rawStatus) => {
  const status = String(rawStatus || '').toUpperCase();
  if (status === 'PENDING') return 'PENDING';
  if (status === 'REJECTED') return 'BLOCKED';
  return 'OCCUPIED';
};

const roundUpToHalfHour = (d) => {
  const rounded = new Date(d);
  rounded.setSeconds(0, 0);

  const m = rounded.getMinutes();
  if (m === 0 || m === 30) return rounded;

  if (m < 30) rounded.setMinutes(30);
  else {
    rounded.setMinutes(0);
    rounded.setHours(rounded.getHours() + 1);
  }
  return rounded;
};

const getDefaultTimeRange = () => {
  const leadTime = new Date(Date.now() + CARPARK_MIN_LEAD_MINUTES * 60 * 1000);
  const start = roundUpToHalfHour(leadTime);
  const end = new Date(start.getTime() + CARPARK_DEFAULT_DURATION_MINUTES * 60 * 1000);
  return {
    startTime: formatTimeHHMM(start),
    endTime: formatTimeHHMM(end),
  };
};

const getDefaultTimeRangeForDate = (selectedDate) => {
  if (!(selectedDate instanceof Date) || Number.isNaN(selectedDate.valueOf())) {
    return getDefaultTimeRange();
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDay = new Date(selectedDate);
  targetDay.setHours(0, 0, 0, 0);

  if (targetDay.getTime() !== today.getTime()) {
    return {
      startTime: '08:00',
      endTime: '10:00',
    };
  }

  const leadTime = roundUpToHalfHour(new Date(Date.now() + CARPARK_MIN_LEAD_MINUTES * 60 * 1000));
  const earliestMinutes = parseTimeToMinutes(formatTimeHHMM(leadTime));
  const minMinutes = CARPARK_TIMELINE_START_HOUR * 60;
  const latestStartMinutes = (CARPARK_TIMELINE_END_HOUR * 60) - CARPARK_DEFAULT_DURATION_MINUTES;
  const startMinutes = Math.min(Math.max(earliestMinutes, minMinutes), latestStartMinutes);

  return {
    startTime: minutesToTimeString(startMinutes),
    endTime: minutesToTimeString(startMinutes + CARPARK_DEFAULT_DURATION_MINUTES),
  };
};

const getEarliestAllowedStartMinutesForDate = (selectedDate) => {
  const minMinutes = CARPARK_TIMELINE_START_HOUR * 60;
  if (!(selectedDate instanceof Date) || Number.isNaN(selectedDate.valueOf())) {
    return minMinutes;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDay = new Date(selectedDate);
  targetDay.setHours(0, 0, 0, 0);
  if (targetDay.getTime() !== today.getTime()) {
    return minMinutes;
  }

  const leadTime = roundUpToHalfHour(new Date(Date.now() + CARPARK_MIN_LEAD_MINUTES * 60 * 1000));
  return Math.max(minMinutes, parseTimeToMinutes(formatTimeHHMM(leadTime)));
};

const sanitizeTimeRangeForDate = (selectedDate, startTime, endTime) => {
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);
  const minMinutes = CARPARK_TIMELINE_START_HOUR * 60;
  const maxMinutes = CARPARK_TIMELINE_END_HOUR * 60;
  const earliestAllowedStartMinutes = getEarliestAllowedStartMinutesForDate(selectedDate);

  if (
    !Number.isFinite(startMinutes) ||
    !Number.isFinite(endMinutes) ||
    startMinutes < Math.max(minMinutes, earliestAllowedStartMinutes) ||
    endMinutes > maxMinutes ||
    endMinutes <= startMinutes ||
    (endMinutes - startMinutes) < CARPARK_MIN_SELECTION_MINUTES
  ) {
    return getDefaultTimeRangeForDate(selectedDate);
  }

  return { startTime, endTime };
};

const parseFloatAttr = (el, name, fallback = 0) => {
  const raw = el.getAttribute(name);
  const parsed = raw == null ? NaN : Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getRectKey = (x, y, width, height) => `${x}:${y}:${width}:${height}`;

const getCandidateSpotLabelForRect = (rect) =>
  CARPARK_CANDIDATE_SPOT_LABEL_BY_RECT_KEY.get(
    getRectKey(
      parseFloatAttr(rect, 'x'),
      parseFloatAttr(rect, 'y'),
      parseFloatAttr(rect, 'width'),
      parseFloatAttr(rect, 'height')
    )
  ) ?? null;

const createGeneratedSpotLabel = (doc, svg, rect, spotLabel) => {
  const x = parseFloatAttr(rect, 'x');
  const y = parseFloatAttr(rect, 'y');
  const width = parseFloatAttr(rect, 'width');
  const labelText = doc.createElementNS(svg.namespaceURI, 'text');
  labelText.textContent = spotLabel;
  labelText.setAttribute('x', String(x + width / 2));
  labelText.setAttribute('y', String(y <= 200 ? y - 6 : y - 8));
  labelText.setAttribute('text-anchor', 'middle');
  labelText.setAttribute('class', 'font label small');
  labelText.style.pointerEvents = 'none';
  rect.parentNode?.appendChild(labelText);
  return labelText;
};

const createGeneratedSpotIcon = (doc, svg, rect) => {
  const x = parseFloatAttr(rect, 'x');
  const y = parseFloatAttr(rect, 'y');
  const width = parseFloatAttr(rect, 'width');
  const height = parseFloatAttr(rect, 'height');
  const iconText = doc.createElementNS(svg.namespaceURI, 'text');
  iconText.setAttribute('x', String(x + width / 2));
  iconText.setAttribute('y', String(y + height / 2));
  iconText.setAttribute('text-anchor', 'middle');
  iconText.setAttribute('dominant-baseline', 'middle');
  iconText.setAttribute('class', 'font label small');
  iconText.style.pointerEvents = 'none';
  rect.parentNode?.appendChild(iconText);
  return iconText;
};

const isPointInRect = (x, y, rectX, rectY, rectW, rectH) =>
  x >= rectX && x <= rectX + rectW && y >= rectY && y <= rectY + rectH;

const getClosestNumericLabel = (labels, x, y) => {
  let best = null;
  let bestDistSq = Infinity;

  for (const label of labels) {
    const dx = label.x - x;
    const dy = label.y - y;
    const distSq = dx * dx + dy * dy;
    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      best = label;
    }
  }

  if (!best) return null;

  // The current SVG layout keeps labels reasonably close to their spots.
  const maxDistSq = 160 * 160;
  return bestDistSq <= maxDistSq ? best : null;
};

const defaultSpotCategory = (spotLabel, isSpecial, isAccessible) => {
  if (isSpecial || spotLabel === '23') return 'SPECIAL_CASE';
  if (isAccessible || spotLabel === '30') return 'ACCESSIBLE';
  return 'STANDARD';
};

const formatSpotCategory = (spotCategory) => {
  const value = String(spotCategory || 'STANDARD').toUpperCase();
  if (value === 'SPECIAL_CASE') return 'special case';
  if (value === 'ACCESSIBLE') return 'accessible';
  if (value === 'E_CHARGING_STATION') return 'e-charging station';
  return 'standard';
};

const getSpotIconConfig = (spotCategory, isActive) => {
  if (!isActive) return { text: '', fill: '#000000', fontSize: '28px', fontWeight: '700' };
  const value = String(spotCategory || 'STANDARD').toUpperCase();
  if (value === 'SPECIAL_CASE') {
    return { text: 'S', fill: '#000000', fontSize: '32px', fontWeight: '700' };
  }
  if (value === 'ACCESSIBLE') {
    return { text: '\u267F', fill: '#1565c0', fontSize: '42px', fontWeight: '400' };
  }
  if (value === 'STANDARD') {
    return { text: 'LIT', fill: '#000000', fontSize: '26px', fontWeight: '700' };
  }
  return { text: '', fill: '#000000', fontSize: '28px', fontWeight: '700' };
};

const getSpotMetaFromDataset = (rect) => ({
  label: rect.dataset.spotLabel ?? '?',
  displayLabel: rect.dataset.spotDisplayLabel || rect.dataset.spotLabel || '?',
  type: rect.dataset.spotType ?? 'unknown',
  spotCategory: rect.dataset.spotCategory ?? 'STANDARD',
  lit: rect.dataset.spotLit === 'true',
  active: rect.dataset.spotActive !== 'false',
  accessible: rect.dataset.spotAccessible === 'true',
  special: rect.dataset.spotSpecial === 'true',
  covered: rect.dataset.spotCovered === 'true',
  manuallyBlocked: rect.dataset.spotManuallyBlocked === 'true',
  chargingKw: rect.dataset.spotChargingKw ? Number(rect.dataset.spotChargingKw) : null,
  selectable: rect.dataset.spotSelectable !== 'false',
  status: rect.dataset.spotStatus ?? 'UNKNOWN',
  reservedByMe: rect.dataset.spotReservedByMe === 'true',
  reservationId: rect.dataset.spotReservationId ? Number(rect.dataset.spotReservationId) : null,
  reservedBegin: rect.dataset.spotReservedBegin || null,
  reservedEnd: rect.dataset.spotReservedEnd || null,
  reservedByUser: rect.dataset.spotReservedByUser || null,
});

const isSpotSelectableForCurrentUser = (rect) => {
  const adminEditModeActive =
    rect?.dataset?.spotAdminEditMode === 'true' && localStorage.getItem('admin') === 'true';
  if (adminEditModeActive) return true;

  const status = rect?.dataset?.spotStatus ?? 'UNKNOWN';
  return status !== 'INACTIVE';
};

const CarparkView = ({
  selectedDate: controlledSelectedDate,
  onSelectedDateChange,
  detailsVariant = 'panel',
  showHoverDetails,
  headerAction = null,
  onReservationsChanged = null,
}) => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const containerRef = useRef(null);
  const cleanupRef = useRef([]);
  const selectedRectRef = useRef(null);
  const svgRef = useRef(null);
  const headersRef = useRef(JSON.parse(sessionStorage.getItem('headers')));
  const spotCatalogByLabelRef = useRef(new Map());
  const spotLabelTextByLabelRef = useRef(new Map());
  const spotIconTextByLabelRef = useRef(new Map());
  const spotRectsByLabelRef = useRef(new Map());
  const initialSelectedDate = (() => {
    const fromState = location.state?.date ? new Date(location.state.date) : null;
    if (fromState && !Number.isNaN(fromState.valueOf())) {
      return fromState;
    }
    const stored = sessionStorage.getItem(CARPARK_SELECTED_DATE_KEY);
    if (stored) {
      const parsed = new Date(stored);
      if (!Number.isNaN(parsed.valueOf())) {
        return parsed;
      }
    }
    return new Date();
  })();
  const initialTimeRangeRef = useRef(getDefaultTimeRangeForDate(initialSelectedDate));
  const reservationStatusSnapshotRef = useRef(new Map());

  const [selectedSpot, setSelectedSpot] = useState(null);
  const [hoveredSpot, setHoveredSpot] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [zoom, setZoom] = useState(1);
  const [pageNotifications, setPageNotifications] = useState([]);
  const [adminEditMode, setAdminEditMode] = useState(false);
  const [dayParkingEvents, setDayParkingEvents] = useState([]);
  const [hasExplicitTimeSelection, setHasExplicitTimeSelection] = useState(false);
  const [internalDate, setInternalDate] = useState(initialSelectedDate);
  const [startTime, setStartTime] = useState(initialTimeRangeRef.current.startTime);
  const [endTime, setEndTime] = useState(initialTimeRangeRef.current.endTime);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const effectiveShowHover = showHoverDetails ?? detailsVariant === 'panel';
  const selectedDate = controlledSelectedDate ?? internalDate;
  const setSelectedDate = onSelectedDateChange ?? setInternalDate;
  const allowSelectUnavailable = detailsVariant === 'modal';
  const isAdminUser = localStorage.getItem('admin') === 'true';
  const currentUserId = localStorage.getItem('userId');
  const localizer = momentLocalizer(moment);
  const timelineFormats = useMemo(() => ({
    timeGutterFormat: (date, culture, loc) => loc.format(date, 'HH:mm', culture),
    eventTimeRangeFormat: ({ start, end }, culture, loc) =>
      `${loc.format(start, 'HH:mm', culture)} - ${loc.format(end, 'HH:mm', culture)}`,
  }), []);

  const applyInactiveSpotPresentation = useCallback((label, rect) => {
    const labelText = spotLabelTextByLabelRef.current.get(label);
    const iconText = spotIconTextByLabelRef.current.get(label);
    rect.classList.remove('carpark-status-available', 'carpark-status-pending', 'carpark-status-occupied', 'carpark-status-blocked');
    rect.classList.add('carpark-status-inactive');
    rect.dataset.spotActive = 'false';
    rect.dataset.spotDisplayLabel = '';
    rect.dataset.spotStatus = 'INACTIVE';
    rect.dataset.spotSelectable = 'false';
    rect.dataset.spotReservedByMe = 'false';
    rect.dataset.spotReservationId = '';
    rect.dataset.spotReservedBegin = '';
    rect.dataset.spotReservedEnd = '';
    rect.dataset.spotReservedByUser = '';
    rect.setAttribute('tabindex', adminEditMode && isAdminUser ? '0' : '-1');
    rect.setAttribute('role', adminEditMode && isAdminUser ? 'button' : 'img');
    rect.style.cursor = adminEditMode && isAdminUser ? 'pointer' : 'default';
    if (labelText) {
      labelText.textContent = '';
      labelText.style.display = 'none';
    }
    if (iconText) {
      iconText.textContent = '';
      iconText.style.display = 'none';
    }
  }, [adminEditMode, isAdminUser]);

  const applyCatalogToMap = useCallback((spots) => {
    const nextCatalog = new Map();
    for (const spot of spots ?? []) {
      const label = String(spot?.spotLabel ?? '').trim();
      if (label) {
        nextCatalog.set(label, spot);
      }
    }
    spotCatalogByLabelRef.current = nextCatalog;

    for (const [label, rect] of spotRectsByLabelRef.current.entries()) {
      const catalogSpot = nextCatalog.get(label);
      const isActiveSpot = catalogSpot ? catalogSpot.active !== false : false;
      const labelText = spotLabelTextByLabelRef.current.get(label);
      const iconText = spotIconTextByLabelRef.current.get(label);
      const displayLabel = String(catalogSpot?.displayLabel ?? (isActiveSpot ? label : '')).trim();

      rect.dataset.spotActive = isActiveSpot ? 'true' : 'false';
      rect.dataset.spotDisplayLabel = displayLabel;

      if (catalogSpot?.spotType) {
        rect.dataset.spotCategory = String(catalogSpot.spotType).toUpperCase();
        rect.dataset.spotSpecial = String(catalogSpot.spotType).toUpperCase() === 'SPECIAL_CASE' ? 'true' : 'false';
        rect.dataset.spotAccessible = String(catalogSpot.spotType).toUpperCase() === 'ACCESSIBLE' ? 'true' : 'false';
      }
      if (catalogSpot?.covered != null) {
        rect.dataset.spotCovered = catalogSpot.covered === true ? 'true' : 'false';
      }
      if (catalogSpot?.manuallyBlocked != null) {
        rect.dataset.spotManuallyBlocked = catalogSpot.manuallyBlocked === true ? 'true' : 'false';
      }
      rect.dataset.spotChargingKw = catalogSpot?.chargingKw == null ? '' : String(catalogSpot.chargingKw);

      if (!isActiveSpot) {
        applyInactiveSpotPresentation(label, rect);
        continue;
      }

      rect.classList.remove('carpark-status-inactive');
      rect.dataset.spotSelectable = 'true';
      rect.setAttribute('tabindex', rect.dataset.spotSelectable === 'true' || (adminEditMode && isAdminUser) ? '0' : '-1');
      rect.setAttribute('role', rect.dataset.spotSelectable === 'true' || (adminEditMode && isAdminUser) ? 'button' : 'img');
      rect.style.cursor = rect.dataset.spotSelectable === 'true' || (adminEditMode && isAdminUser) ? 'pointer' : 'default';

      if (labelText) {
        labelText.textContent = displayLabel;
        labelText.style.display = displayLabel ? '' : 'none';
      }
      if (iconText) {
        const iconConfig = getSpotIconConfig(rect.dataset.spotCategory, isActiveSpot);
        iconText.textContent = iconConfig.text;
        iconText.style.display = iconConfig.text ? '' : 'none';
        iconText.style.fill = iconConfig.fill;
        iconText.style.fontSize = iconConfig.fontSize;
        iconText.style.fontWeight = iconConfig.fontWeight;
      }
    }

    if (selectedRectRef.current) {
      setSelectedSpot(getSpotMetaFromDataset(selectedRectRef.current));
    }
  }, [adminEditMode, applyInactiveSpotPresentation, isAdminUser]);

  const refreshSpotCatalog = useCallback((onDone) => {
    if (!spotRectsByLabelRef.current.size) {
      if (onDone) onDone();
      return;
    }
    const includeInactive = isAdminUser && adminEditMode;
    const url = `${process.env.REACT_APP_BACKEND_URL}/parking/spots${includeInactive ? '?includeInactive=true' : ''}`;

    getRequest(
      url,
      headersRef.current,
      (data) => {
        applyCatalogToMap(Array.isArray(data) ? data : []);
        if (onDone) onDone();
      },
      () => {
        // keep the existing map usable even if catalog refresh fails
        if (onDone) onDone();
      }
    );
  }, [adminEditMode, applyCatalogToMap, isAdminUser]);

  const clearSelection = useCallback(() => {
    if (selectedRectRef.current) {
      selectedRectRef.current.classList.remove('carpark-selected');
    }
    selectedRectRef.current = null;
    setSelectedSpot(null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const cleanupCurrent = () => {
      for (const fn of cleanupRef.current) fn();
      cleanupRef.current = [];
      selectedRectRef.current = null;
      svgRef.current = null;
      spotLabelTextByLabelRef.current = new Map();
      spotIconTextByLabelRef.current = new Map();
      spotCatalogByLabelRef.current = new Map();
      if (containerRef.current) containerRef.current.replaceChildren();
    };

    const load = async () => {
      setLoadError('');
      setSelectedSpot(null);
      setHoveredSpot(null);
      cleanupCurrent();

      const resp = await fetch(CARPARK_SVG_URL, { cache: 'no-cache' });
      if (!resp.ok) {
        throw new Error(`Failed to load SVG (${resp.status})`);
      }
      const svgText = await resp.text();

      const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
      const svg = doc.documentElement;
      if (!svg || svg.localName !== 'svg') {
        throw new Error('Invalid SVG document');
      }

      svg.removeAttribute('width');
      svg.removeAttribute('height');
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      svg.style.width = '100%';
      svg.style.height = 'auto';
      svg.style.display = 'block';

      // Make sure labels don't intercept pointer events (so hover/click behavior is driven by the spot rects).
      for (const textEl of Array.from(svg.querySelectorAll('text'))) {
        textEl.style.pointerEvents = 'none';
      }

      const defs = svg.querySelector('defs') ?? svg.insertBefore(doc.createElementNS(svg.namespaceURI, 'defs'), svg.firstChild);
      const style = doc.createElementNS(svg.namespaceURI, 'style');
      style.textContent = `
        .carpark-spot { cursor: pointer; }
        .carpark-spot.carpark-hover { fill: ${semanticColors.carpark.hover} !important; }
        .carpark-spot.carpark-selected { fill: ${semanticColors.carpark.selected} !important; }
        .carpark-spot:focus { outline: none; }
        .carpark-status-available { fill: ${semanticColors.carpark.status.AVAILABLE} !important; }
        .carpark-status-pending { fill: ${semanticColors.carpark.status.PENDING} !important; }
        .carpark-status-occupied { fill: ${semanticColors.carpark.status.OCCUPIED} !important; }
        .carpark-status-blocked { fill: ${semanticColors.carpark.status.BLOCKED} !important; }
        .carpark-status-inactive { fill: ${semanticColors.carpark.status.INACTIVE} !important; }
      `;
      defs.appendChild(style);

      const localCleanup = [];
      const allTextNodes = Array.from(svg.querySelectorAll('text'))
        .map((el) => ({
          element: el,
          value: (el.textContent ?? '').trim(),
          x: parseFloatAttr(el, 'x', NaN),
          y: parseFloatAttr(el, 'y', NaN),
        }))
        .filter((t) => t.value !== '' && Number.isFinite(t.x) && Number.isFinite(t.y));

      const labelTexts = allTextNodes.filter((t) => /^\d+$/.test(t.value));
      const litTexts = allTextNodes.filter((t) => t.value.toUpperCase() === 'LIT');
      const accessibleTexts = allTextNodes.filter(
        (t) => t.value.includes('♿') || t.value.includes('â™ż')
      );

      for (const litText of litTexts) {
        litText.element.style.display = 'none';
      }
      for (const accessibleText of accessibleTexts) {
        accessibleText.element.style.display = 'none';
      }

      const spotRects = Array.from(svg.querySelectorAll('rect')).filter((rect) => {
        const w = parseFloatAttr(rect, 'width');
        const h = parseFloatAttr(rect, 'height');
        if (w < 40 || h < 40) return false;
        if (rect.classList.contains('stall')) return true;
        return rect.classList.contains('empty') && Boolean(getCandidateSpotLabelForRect(rect));
      });
      spotRectsByLabelRef.current = new Map();
      for (let idx = 0; idx < spotRects.length; idx += 1) {
        const rect = spotRects[idx];
        rect.classList.add('carpark-spot');

        const x = parseFloatAttr(rect, 'x');
        const y = parseFloatAttr(rect, 'y');
        const w = parseFloatAttr(rect, 'width');
        const h = parseFloatAttr(rect, 'height');
        const cx = x + w / 2;
        const cy = y + h / 2;

        const candidateSpotLabel = getCandidateSpotLabelForRect(rect);
        const isCandidateSpot = Boolean(candidateSpotLabel);
        const closest = isCandidateSpot ? null : getClosestNumericLabel(labelTexts, cx, cy);
        const spotLabel = candidateSpotLabel ?? closest?.value ?? `${idx + 1}`;
        const isSpecial = spotLabel === '23';
        const isInitiallyActive = !isCandidateSpot;
        const isSelectable = isInitiallyActive;

        const isLit = false;
        const isAccessible = accessibleTexts.some((t) => isPointInRect(t.x, t.y, x, y, w, h));

        rect.dataset.spotLabel = spotLabel;
        rect.dataset.spotDisplayLabel = isInitiallyActive ? spotLabel : '';
        rect.dataset.spotType = isCandidateSpot ? 'candidate' : 'stall';
        rect.dataset.spotActive = isInitiallyActive ? 'true' : 'false';
        rect.dataset.spotLit = isLit ? 'true' : 'false';
        rect.dataset.spotAccessible = isAccessible ? 'true' : 'false';
        rect.dataset.spotSpecial = isSpecial ? 'true' : 'false';
        rect.dataset.spotCategory = defaultSpotCategory(spotLabel, isSpecial, isAccessible);
        rect.dataset.spotCovered = 'false';
        rect.dataset.spotManuallyBlocked = 'false';
        rect.dataset.spotChargingKw = '';
        rect.dataset.spotSelectable = isSelectable ? 'true' : 'false';
        rect.dataset.spotAdminEditMode = 'false';
        rect.dataset.spotStatus = isInitiallyActive ? (isSpecial ? 'BLOCKED' : 'AVAILABLE') : 'INACTIVE';
        rect.dataset.spotReservedByMe = 'false';
        rect.dataset.spotReservationId = '';
        rect.dataset.spotReservedBegin = '';
        rect.dataset.spotReservedEnd = '';
        rect.dataset.spotReservedByUser = '';
        spotRectsByLabelRef.current.set(spotLabel, rect);
        if (isCandidateSpot) {
          const generatedLabel = createGeneratedSpotLabel(doc, svg, rect, spotLabel);
          generatedLabel.style.display = 'none';
          spotLabelTextByLabelRef.current.set(spotLabel, generatedLabel);
        } else if (closest?.element) {
          spotLabelTextByLabelRef.current.set(spotLabel, closest.element);
        }
        const generatedIcon = createGeneratedSpotIcon(doc, svg, rect);
        const initialIconConfig = getSpotIconConfig(rect.dataset.spotCategory, isInitiallyActive);
        generatedIcon.textContent = initialIconConfig.text;
        generatedIcon.style.display = initialIconConfig.text ? '' : 'none';
        generatedIcon.style.fill = initialIconConfig.fill;
        generatedIcon.style.fontSize = initialIconConfig.fontSize;
        generatedIcon.style.fontWeight = initialIconConfig.fontWeight;
        spotIconTextByLabelRef.current.set(spotLabel, generatedIcon);
        rect.classList.add(
          isInitiallyActive ? (isSpecial ? 'carpark-status-blocked' : 'carpark-status-available') : 'carpark-status-inactive'
        );

        rect.setAttribute('tabindex', isSelectable ? '0' : '-1');
        rect.setAttribute('role', isSelectable ? 'button' : 'img');
        if (!isSelectable) {
          rect.style.cursor = 'default';
        }
        rect.setAttribute(
          'aria-label',
          `Parking spot ${spotLabel}${isSpecial ? ', special case' : isAccessible ? ', accessible' : ', standard'}${isLit ? ', LIT' : ''}`
        );

        const setSelectedRect = () => {
          if (!isSpotSelectableForCurrentUser(rect)) return;
          const adminEditModeActive = rect.dataset.spotAdminEditMode === 'true' && localStorage.getItem('admin') === 'true';
          const status = rect.dataset.spotStatus;
          if (!adminEditModeActive && status === 'INACTIVE') return;
          if (selectedRectRef.current && selectedRectRef.current !== rect) {
            selectedRectRef.current.classList.remove('carpark-selected');
          }
          selectedRectRef.current = rect;
          rect.classList.add('carpark-selected');
          setSelectedSpot(getSpotMetaFromDataset(rect));
        };

        const onMouseEnter = () => {
          rect.classList.add('carpark-hover');
          if (effectiveShowHover) {
            setHoveredSpot(getSpotMetaFromDataset(rect));
          }
        };
        const onMouseLeave = () => {
          rect.classList.remove('carpark-hover');
          if (effectiveShowHover) {
            setHoveredSpot(null);
          }
        };
        const onClick = (e) => {
          e.stopPropagation();
          setSelectedRect();
        };
        const onKeyDown = (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setSelectedRect();
          }
        };

        rect.addEventListener('mouseenter', onMouseEnter);
        rect.addEventListener('mouseleave', onMouseLeave);
        rect.addEventListener('click', onClick);
        rect.addEventListener('keydown', onKeyDown);

        localCleanup.push(() => {
          rect.removeEventListener('mouseenter', onMouseEnter);
          rect.removeEventListener('mouseleave', onMouseLeave);
          rect.removeEventListener('click', onClick);
          rect.removeEventListener('keydown', onKeyDown);
        });
      }

      const onSvgClick = () => {
        clearSelection();
      };
      svg.addEventListener('click', onSvgClick);
      localCleanup.push(() => svg.removeEventListener('click', onSvgClick));

      // If the pointer is not over an interactive stall rect, do not show hover details.
      if (effectiveShowHover) {
        const onSvgMouseMove = (e) => {
          const target = e.target;
          if (!(target instanceof Element)) return;
          if (!target.closest('.carpark-spot')) {
            setHoveredSpot(null);
          }
        };
        const onSvgMouseLeave = () => setHoveredSpot(null);
        svg.addEventListener('mousemove', onSvgMouseMove);
        svg.addEventListener('mouseleave', onSvgMouseLeave);
        localCleanup.push(() => svg.removeEventListener('mousemove', onSvgMouseMove));
        localCleanup.push(() => svg.removeEventListener('mouseleave', onSvgMouseLeave));
      }

      if (cancelled) {
        for (const fn of localCleanup) fn();
        return;
      }

      svgRef.current = svg;
      cleanupRef.current = localCleanup;
      refreshSpotCatalog(() => {
        if (!cancelled) {
          containerRef.current?.appendChild(svg);
          refreshAvailability();
        }
      });
    };

    load().catch((err) => {
      if (cancelled) return;
      setLoadError(err instanceof Error ? err.message : 'Failed to load carpark overview.');
    });

    return () => {
      cancelled = true;
      cleanupCurrent();
    };
  }, [effectiveShowHover, allowSelectUnavailable, clearSelection]);

  useEffect(() => {
    if (!svgRef.current) return;
    svgRef.current.style.transform = `scale(${zoom})`;
    svgRef.current.style.transformOrigin = '0 0';
  }, [zoom]);

  useEffect(() => {
    if (!selectedDate || Number.isNaN(selectedDate.valueOf())) return;
    sessionStorage.setItem(CARPARK_SELECTED_DATE_KEY, selectedDate.toISOString());
  }, [selectedDate]);

  useEffect(() => {
    moment.locale(i18n.language === 'en' ? 'en-gb' : i18n.language);
  }, [i18n.language]);

  const refreshDayParkingEvents = useCallback(() => {
    if (!selectedDate || Number.isNaN(selectedDate.valueOf())) {
      setDayParkingEvents([]);
      return;
    }

    getRequest(
      `${process.env.REACT_APP_BACKEND_URL}/parking/day/${formatDayPathValue(selectedDate)}`,
      headersRef.current,
      (data) => setDayParkingEvents(Array.isArray(data) ? data : []),
      () => setDayParkingEvents([])
    );
  }, [selectedDate]);

  useEffect(() => {
    refreshDayParkingEvents();
  }, [refreshDayParkingEvents]);

  useEffect(() => {
    for (const rect of spotRectsByLabelRef.current.values()) {
      rect.dataset.spotAdminEditMode = adminEditMode && isAdminUser ? 'true' : 'false';
    }
    refreshSpotCatalog(() => refreshAvailability());
  }, [adminEditMode, isAdminUser]);

  const timelineSelectable = !adminEditMode;

  const timelineReservationEvents = useMemo(() => {
    if (!selectedSpot?.label || !selectedDate || Number.isNaN(selectedDate.valueOf())) return [];

    return dayParkingEvents
      .filter((event) => String(event?.mode || '').toLowerCase() === 'parking')
      .filter((event) => String(event?.parkingId ?? '') === String(selectedSpot.label))
      .map((event) => {
        const start = buildDateTimeForDay(selectedDate, event?.begin);
        const end = buildDateTimeForDay(selectedDate, event?.end);
        if (!start || !end) return null;
        const visualStatus = parkingTimelineStatusFromReservation(event?.parkingStatus);
        const reservedByMe = String(event?.userId ?? '') === String(currentUserId ?? '');
        const baseLabel = reservedByMe ? t('you') : t(`carparkStatus_${visualStatus}`);
        return {
          id: `parking-res-${event.id}`,
          start,
          end,
          title: `${formatTimeHHMM(start)} - ${formatTimeHHMM(end)} ${baseLabel}`,
          resource: {
            selection: false,
            status: visualStatus,
            reservedByMe,
          },
        };
      })
      .filter(Boolean);
  }, [currentUserId, dayParkingEvents, selectedDate, selectedSpot?.label, t]);

  const timelineSelectionEvent = useMemo(() => {
    if (!hasExplicitTimeSelection || !selectedDate || Number.isNaN(selectedDate.valueOf()) || !startTime || !endTime) return null;
    const start = buildDateTimeForDay(selectedDate, startTime);
    const end = buildDateTimeForDay(selectedDate, endTime);
    if (!start || !end || end <= start) return null;
    return {
      id: 'parking-selection',
      start,
      end,
      title: '',
      resource: {
        selection: true,
        status: 'SELECTION',
        reservedByMe: true,
      },
    };
  }, [endTime, hasExplicitTimeSelection, selectedDate, startTime, t]);

  const timelineEvents = useMemo(() => (
    timelineSelectionEvent ? [...timelineReservationEvents, timelineSelectionEvent] : timelineReservationEvents
  ), [timelineReservationEvents, timelineSelectionEvent]);

  const addPageNotification = useCallback((severity, message, notificationKey) => {
    if (!message) return;
    setPageNotifications((prev) => {
      if (notificationKey && prev.some((item) => item.notificationKey === notificationKey)) return prev;
      const next = [
        {
          id: `${Date.now()}-${Math.random()}`,
          severity,
          message,
          notificationKey: notificationKey || null,
        },
        ...prev,
      ];
      return next.slice(0, 8);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const snapshotKey = namespacedCarparkKey(CARPARK_RES_STATUS_SNAPSHOT_KEY);
    const notifiedStatusKey = namespacedCarparkKey(CARPARK_NOTIFIED_STATUS_KEY);
    const notifiedRemindersKey = namespacedCarparkKey(CARPARK_NOTIFIED_REMINDERS_KEY);

    const pollMyReservations = () => {
      getRequest(
        `${process.env.REACT_APP_BACKEND_URL}/parking/reservations/mine`,
        headersRef.current,
        (data) => {
          if (cancelled) return;

          const reservations = Array.isArray(data) ? data : [];
          const previousSnapshotObj =
            reservationStatusSnapshotRef.current.size > 0
              ? Object.fromEntries(reservationStatusSnapshotRef.current)
              : readSessionJson(snapshotKey, {});
          const notifiedStatus = readSessionJson(notifiedStatusKey, {});
          const notifiedReminders = readSessionJson(notifiedRemindersKey, {});
          const nextSnapshot = new Map();
          const now = new Date();

          for (const reservation of reservations) {
            const id = String(reservation?.id ?? '');
            const status = String(reservation?.status ?? 'APPROVED').toUpperCase();
            if (!id) continue;
            nextSnapshot.set(id, status);

            const prevStatus = String(previousSnapshotObj[id] || '').toUpperCase();
            const spot = reservation?.spotLabel ?? '?';
            const day = reservation?.day ?? '';
            const begin = trimTimeForDisplay(reservation?.begin);
            const end = trimTimeForDisplay(reservation?.end);
            const createdAtRaw = reservation?.createdAt ?? null;
            const createdAt = createdAtRaw ? String(createdAtRaw) : '';
            const createdAtDate = parseCreatedAtValue(createdAtRaw);
            const reservationFingerprint = `${id}:${day}:${reservation?.begin ?? ''}:${reservation?.end ?? ''}:${createdAt}`;
            const isTerminalDecision = status === 'APPROVED' || status === 'REJECTED';
            const firstSeenTerminalRecently =
              !prevStatus &&
              isTerminalDecision &&
              createdAtDate &&
              (now.getTime() - createdAtDate.getTime()) <=
                CARPARK_DECISION_NOTIFICATION_FALLBACK_WINDOW_MINUTES * 60 * 1000 &&
              (now.getTime() - createdAtDate.getTime()) >= 0;

            if ((prevStatus === 'PENDING' && isTerminalDecision) || firstSeenTerminalRecently) {
              const statusNotifyKey = `${reservationFingerprint}:${status}`;
              if (!notifiedStatus[statusNotifyKey]) {
                addPageNotification(
                  status === 'APPROVED' ? 'success' : 'warning',
                  t(
                    status === 'APPROVED'
                      ? 'carparkNotificationApproved'
                      : 'carparkNotificationRejected',
                    { spot, day, begin, end }
                  ),
                  statusNotifyKey
                );
                notifiedStatus[statusNotifyKey] = true;
              }
            }

            if (status === 'APPROVED') {
              const start = parseReservationStart(day, reservation?.begin);
              if (start) {
                const diffMs = start.getTime() - now.getTime();
                const diffMin = diffMs / 60000;
                if (diffMin > 0 && diffMin <= 30) {
                  const reminderKey = `${reservationFingerprint}:REMINDER_30M`;
                  if (!notifiedReminders[reminderKey]) {
                    addPageNotification(
                      'info',
                      t('carparkNotificationReminder', { spot, day, begin, end }),
                      reminderKey
                    );
                    notifiedReminders[reminderKey] = true;
                  }
                }
              }
            }
          }

          reservationStatusSnapshotRef.current = nextSnapshot;
          writeSessionJson(snapshotKey, Object.fromEntries(nextSnapshot));
          writeSessionJson(notifiedStatusKey, notifiedStatus);
          writeSessionJson(notifiedRemindersKey, notifiedReminders);
        },
        () => {
          // keep page usable even if notification polling fails
        }
      );
    };

    pollMyReservations();
    const interval = setInterval(pollMyReservations, 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [addPageNotification, i18n.language, t]);

  const spotForPanel = effectiveShowHover ? (selectedSpot ?? hoveredSpot) : selectedSpot;
  const isActiveCatalogSpot = spotForPanel?.active !== false;
  const isSpecialSpot = spotForPanel?.special === true;
  const isManuallyBlockedSpot = spotForPanel?.manuallyBlocked === true;
  const canAdminToggleBlock = Boolean(isAdminUser && adminEditMode && selectedSpot && isActiveCatalogSpot && !isSpecialSpot);
  const canAdminToggleActive = Boolean(isAdminUser && adminEditMode && selectedSpot);
  const isBlocked = isActiveCatalogSpot && (spotForPanel?.status === 'BLOCKED' || isSpecialSpot);
  const isPending = isActiveCatalogSpot && spotForPanel?.status === 'PENDING';
  const isOccupied = isActiveCatalogSpot && spotForPanel?.status === 'OCCUPIED';
  const isAvailable = isActiveCatalogSpot && spotForPanel?.status === 'AVAILABLE';

  const formatISODate = (d) => {
    return formatISODateValue(d);
  };

  const timeToMinutes = (tStr) => {
    return parseTimeToMinutes(tStr);
  };

  const resetSelectedTimeRange = useCallback(() => {
    const nextRange = getDefaultTimeRangeForDate(selectedDate);
    setStartTime(nextRange.startTime);
    setEndTime(nextRange.endTime);
    setHasExplicitTimeSelection(false);
  }, [selectedDate]);

  useEffect(() => {
    if (!selectedDate || Number.isNaN(selectedDate.valueOf())) return;
    const normalizedRange = sanitizeTimeRangeForDate(selectedDate, startTime, endTime);
    if (normalizedRange.startTime !== startTime || normalizedRange.endTime !== endTime) {
      setStartTime(normalizedRange.startTime);
      setEndTime(normalizedRange.endTime);
    }
  }, [endTime, selectedDate, startTime]);

  const handleTimelineSelect = useCallback((slotInfo) => {
    if (!timelineSelectable || !slotInfo?.start || !slotInfo?.end) {
      return;
    }

    const nextStart = formatTimeHHMM(new Date(slotInfo.start));
    const nextEnd = formatTimeHHMM(new Date(slotInfo.end));
    const nextStartMinutes = timeToMinutes(nextStart);
    const nextEndMinutes = timeToMinutes(nextEnd);
    if (nextEndMinutes <= nextStartMinutes) {
      return;
    }
    if ((nextEndMinutes - nextStartMinutes) < CARPARK_MIN_SELECTION_MINUTES) {
      toast.warning(t('minimum'));
      return;
    }
    const earliestAllowedStartMinutes = getEarliestAllowedStartMinutesForDate(selectedDate);
    if (nextStartMinutes < earliestAllowedStartMinutes) {
      toast.warning(
        t('leadTimeExceeded', {
          value: CARPARK_MIN_LEAD_MINUTES,
          next: minutesToTimeString(earliestAllowedStartMinutes),
        })
      );
      return;
    }
    const hasBufferedOverlap = timelineReservationEvents.some((calendarEvent) => {
      const eventStartMinutes = (calendarEvent.start.getHours() * 60) + calendarEvent.start.getMinutes();
      const eventEndMinutes = (calendarEvent.end.getHours() * 60) + calendarEvent.end.getMinutes();
      return nextStartMinutes < (eventEndMinutes + CARPARK_OVERLAP_BUFFER_MINUTES)
        && nextEndMinutes > (eventStartMinutes - CARPARK_OVERLAP_BUFFER_MINUTES);
    });
    if (hasBufferedOverlap) {
      toast.warning(t('overlap'));
      return;
    }

    setStartTime(nextStart);
    setEndTime(nextEnd);
    setHasExplicitTimeSelection(true);
  }, [selectedDate, t, timelineReservationEvents, timelineSelectable]);

  const timelineEventPropGetter = useCallback((calendarEvent) => {
    if (calendarEvent?.resource?.selection) {
      return {
        style: {
          backgroundColor: semanticColors.carpark.selected,
          border: `1px solid ${colorVars.brand.primary}`,
          color: colorVars.text.inverse,
        },
      };
    }

    const status = calendarEvent?.resource?.status || 'OCCUPIED';
    const backgroundColor = semanticColors.carpark.status[status] || semanticColors.carpark.status.OCCUPIED;
    const color = status === 'PENDING' ? colorVars.text.primary : colorVars.text.inverse;
    return {
      style: {
        backgroundColor,
        color,
      },
    };
  }, []);

  const refreshAvailability = () => {
    if (!spotRectsByLabelRef.current || spotRectsByLabelRef.current.size === 0) return;
    if (!selectedDate || !startTime || !endTime) return;
    const normalizedRange = sanitizeTimeRangeForDate(selectedDate, startTime, endTime);
    if (normalizedRange.startTime !== startTime || normalizedRange.endTime !== endTime) {
      setStartTime(normalizedRange.startTime);
      setEndTime(normalizedRange.endTime);
      return;
    }
    if ((timeToMinutes(endTime) - timeToMinutes(startTime)) < CARPARK_MIN_SELECTION_MINUTES) {
      toast.warning(t('minimum'));
      return;
    }

    const catalogActiveLabels = Array.from(spotCatalogByLabelRef.current.entries())
      .filter(([, spot]) => spot?.active !== false)
      .map(([label]) => label);
    const spotLabels = catalogActiveLabels.length > 0
      ? catalogActiveLabels
      : Array.from(spotRectsByLabelRef.current.keys());
    const day = formatISODate(selectedDate);

    if (spotLabels.length === 0) {
      for (const [label, rect] of spotRectsByLabelRef.current.entries()) {
        applyInactiveSpotPresentation(label, rect);
      }
      setIsRefreshing(false);
      return;
    }

    setIsRefreshing(true);

    postRequest(
      `${process.env.REACT_APP_BACKEND_URL}/parking/availability`,
      headersRef.current,
      (data) => {
        const statusByLabel = new Map();
        for (const row of data ?? []) {
          statusByLabel.set(String(row.spotLabel), row);
        }

        for (const [label, rect] of spotRectsByLabelRef.current.entries()) {
          const catalogSpot = spotCatalogByLabelRef.current.get(label);
          const isActiveSpot = catalogSpot ? catalogSpot.active !== false : false;
          if (!isActiveSpot) {
            applyInactiveSpotPresentation(label, rect);
            continue;
          }

          rect.classList.remove(
            'carpark-status-available',
            'carpark-status-pending',
            'carpark-status-occupied',
            'carpark-status-blocked',
            'carpark-status-inactive'
          );

          const row = statusByLabel.get(label);
          const status = row?.status ?? (label === '23' ? 'BLOCKED' : 'AVAILABLE');
          const spotCategory = String(
            row?.spotType ?? rect.dataset.spotCategory ?? defaultSpotCategory(label, label === '23', label === '30')
          ).toUpperCase();
          rect.dataset.spotStatus = status;
          rect.dataset.spotCategory = spotCategory;
          rect.dataset.spotSpecial = spotCategory === 'SPECIAL_CASE' ? 'true' : 'false';
          rect.dataset.spotAccessible = spotCategory === 'ACCESSIBLE' ? 'true' : 'false';
          rect.dataset.spotCovered = row?.covered === true ? 'true' : 'false';
          rect.dataset.spotManuallyBlocked = row?.manuallyBlocked === true ? 'true' : 'false';
          rect.dataset.spotChargingKw = row?.chargingKw == null ? '' : String(row.chargingKw);
          rect.dataset.spotReservedByMe = row?.reservedByMe ? 'true' : 'false';
          rect.dataset.spotReservationId = row?.reservationId ? String(row.reservationId) : '';
          rect.dataset.spotReservedBegin = row?.reservedBegin || '';
          rect.dataset.spotReservedEnd = row?.reservedEnd || '';
          rect.dataset.spotReservedByUser = row?.reservedByUser || '';

          if (status === 'AVAILABLE') rect.classList.add('carpark-status-available');
          if (status === 'PENDING') rect.classList.add('carpark-status-pending');
          if (status === 'OCCUPIED') rect.classList.add('carpark-status-occupied');
          if (status === 'BLOCKED') rect.classList.add('carpark-status-blocked');
        }

        // Update currently shown panel state if hovering/selected
        if (selectedRectRef.current) setSelectedSpot(getSpotMetaFromDataset(selectedRectRef.current));
        setIsRefreshing(false);
      },
      (errorCode) => {
        setIsRefreshing(false);
        console.error('Failed to fetch parking availability', errorCode);
        toast.error(t('httpOther'));
      },
      {
        spotLabels,
        day,
        begin: startTime,
        end: endTime,
      }
    );
  };

  useEffect(() => {
    refreshAvailability();
    const interval = setInterval(() => refreshAvailability(), 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, startTime, endTime]);

  const reserveSelected = () => {
    if (adminEditMode) return;
    if (!selectedSpot || selectedSpot.active === false || selectedSpot.status !== 'AVAILABLE') return;
    const normalizedRange = sanitizeTimeRangeForDate(selectedDate, startTime, endTime);
    if (normalizedRange.startTime !== startTime || normalizedRange.endTime !== endTime) {
      setStartTime(normalizedRange.startTime);
      setEndTime(normalizedRange.endTime);
      return;
    }
    if ((timeToMinutes(endTime) - timeToMinutes(startTime)) < CARPARK_MIN_SELECTION_MINUTES) {
      toast.warning(t('minimum'));
      return;
    }
    const day = formatISODate(selectedDate);

    postRequest(
      `${process.env.REACT_APP_BACKEND_URL}/parking/reservations`,
      headersRef.current,
      (data) => {
        if (String(data?.status || '') === 'PENDING') toast.success(t('carparkReviewSubmitted'));
        else toast.success(t('booked'));
        refreshAvailability();
        refreshDayParkingEvents();
        if (onReservationsChanged) {
          onReservationsChanged();
        }
      },
      (errorCode) => {
        if (errorCode === 409) toast.warning(t('overlap'));
        else toast.error(t('httpOther'));
      },
      {
        spotLabel: selectedSpot.label,
        day,
        begin: startTime,
        end: endTime,
        locale: i18n.language,
      }
    );
  };

  const cancelMyReservation = () => {
    if (adminEditMode) return;
    const reservationId = spotForPanel?.reservationId;
    if (!reservationId) return;
    deleteRequest(
      `${process.env.REACT_APP_BACKEND_URL}/parking/reservations/${reservationId}`,
      headersRef.current,
      () => {
        toast.success(t('bookingDeleted'));
        refreshAvailability();
        refreshDayParkingEvents();
        if (onReservationsChanged) {
          onReservationsChanged();
        }
      },
      () => toast.error(t('httpOther'))
    );
  };

  const setSpotBlocked = (blocked) => {
    if (!isAdminUser || !adminEditMode || !selectedSpot?.label) return;
    if (selectedSpot?.special) {
      toast.warning(t('carparkEditModeSpecialCase'));
      return;
    }

    const action = blocked ? 'block' : 'unblock';
    postRequest(
      `${process.env.REACT_APP_BACKEND_URL}/parking/spots/${encodeURIComponent(selectedSpot.label)}/${action}`,
      headersRef.current,
      () => {
        toast.success(t(blocked ? 'carparkSpotBlockedSuccess' : 'carparkSpotUnblockedSuccess'));
        refreshAvailability();
      },
      (errorCode) => {
        if (errorCode === 403) toast.error(t('http403'));
        else toast.error(t('httpOther'));
      },
      {}
    );
  };

  const setSpotActiveState = (active) => {
    if (!isAdminUser || !adminEditMode || !selectedSpot?.label) return;
    const action = active ? 'activate' : 'deactivate';
    postRequest(
      `${process.env.REACT_APP_BACKEND_URL}/parking/spots/${encodeURIComponent(selectedSpot.label)}/${action}`,
      headersRef.current,
      () => {
        toast.success(t(active ? 'carparkSpotActivatedSuccess' : 'carparkSpotDeactivatedSuccess'));
        refreshSpotCatalog(() => refreshAvailability());
      },
      (errorCode) => {
        if (errorCode === 403) toast.error(t('http403'));
        else toast.error(t('httpOther'));
      },
      {}
    );
  };

  const detailsBody = (
    <>
      {!spotForPanel && (
        <Typography variant="body2" color="text.secondary">
          {t('carparkNoSelection')}
        </Typography>
      )}
      {spotForPanel && (
        <>
          <Typography variant="body1" sx={{ fontWeight: 700 }}>
            {t('carparkSpot')} {spotForPanel.displayLabel || spotForPanel.label}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {spotForPanel.active === false ? t('carparkNotInLitSystem') : t(`carparkStatus_${spotForPanel.status}`)}
            {spotForPanel.reservedByMe ? ` (${t('carparkReservedByMe')})` : ''}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {t('carparkType')}: {formatSpotCategory(spotForPanel.spotCategory)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('carparkCovered')}: {spotForPanel.covered ? t('carparkYes') : t('carparkNo')}
          </Typography>
          {isAdminUser && (
            <Typography variant="body2" color="text.secondary">
              {t('carparkAdminBlocked')}: {spotForPanel.manuallyBlocked ? t('carparkYes') : t('carparkNo')}
            </Typography>
          )}
          <Typography variant="body2" color="text.secondary">
            {t('carparkChargingKw')}: {spotForPanel.chargingKw == null ? '—' : spotForPanel.chargingKw}
          </Typography>
          {(spotForPanel.reservedBegin || spotForPanel.reservedEnd) && (
            <Typography variant="body2" color="text.secondary">
              {t('carparkReservedTime')}: {spotForPanel.reservedBegin || '-'} - {spotForPanel.reservedEnd || '-'}
            </Typography>
          )}
          {spotForPanel.reservedByUser && (
            <Typography variant="body2" color="text.secondary">
              {t('carparkReservedByUser')}: {spotForPanel.reservedByUser}
            </Typography>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {selectedSpot ? t('carparkSelected') : t('carparkHover')}
          </Typography>
          {canAdminToggleBlock && (
            <Button
              sx={{ mt: 2 }}
              variant="contained"
              color={isManuallyBlockedSpot ? 'success' : 'warning'}
              onClick={() => setSpotBlocked(!isManuallyBlockedSpot)}
            >
              {isManuallyBlockedSpot ? t('carparkUnblockSpot') : t('carparkBlockSpot')}
            </Button>
          )}
          {canAdminToggleActive && (
            <Button
              sx={{ mt: 2, ml: canAdminToggleBlock ? 1 : 0 }}
              variant="outlined"
              color={spotForPanel.active === false ? 'success' : 'warning'}
              onClick={() => setSpotActiveState(spotForPanel.active === false)}
            >
              {spotForPanel.active === false ? t('carparkAddToLitSystem') : t('carparkRemoveFromLitSystem')}
            </Button>
          )}
          {selectedSpot && isAvailable && !adminEditMode && (
            <Button sx={{ mt: 2 }} variant="contained" onClick={reserveSelected}>
              {t('carparkReserve')}
            </Button>
          )}
          {!adminEditMode && (isPending || isOccupied || isBlocked) && spotForPanel.reservedByMe && spotForPanel.reservationId && (
            <Button sx={{ mt: 2 }} color="error" variant="outlined" onClick={cancelMyReservation}>
              {t('delete')}
            </Button>
          )}
        </>
      )}
      {(detailsVariant === 'panel' || detailsVariant === 'modal' || spotForPanel) && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography variant="body2" color="text.secondary">
            {adminEditMode && isAdminUser
              ? t('carparkEditModeHint')
              : !isActiveCatalogSpot
              ? t('carparkNotInLitSystem')
              : isSpecialSpot
              ? t('carparkContactStaff')
              : isBlocked
                ? t('carparkBlocked')
                : isPending
                  ? t('carparkReviewPending')
                : isOccupied
                  ? t('carparkOccupied')
                  : isAvailable
                    ? t('carparkAvailable')
              : t('carparkHintClick')}
          </Typography>
        </>
      )}
    </>
  );

  return (
    <>
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <Box sx={{ minWidth: 220, flex: '0 1 220px' }}>
            <CreateDatePicker date={selectedDate} setter={setSelectedDate} label={t('date')} />
          </Box>
          <Button variant="contained" onClick={refreshAvailability} disabled={isRefreshing}>
            {t('carparkRefresh')}
          </Button>
          <Button variant="text" onClick={resetSelectedTimeRange}>
            {t('carparkReset')}
          </Button>
          {isAdminUser && (
            <Button
              variant={adminEditMode ? 'contained' : 'outlined'}
              color={adminEditMode ? 'warning' : 'inherit'}
              onClick={() => setAdminEditMode((prev) => !prev)}
            >
              {adminEditMode ? t('carparkExitEditMode') : t('carparkEnterEditMode')}
            </Button>
          )}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip size="small" label={t('carparkLegendAvailable')} sx={{ bgcolor: semanticColors.carpark.status.AVAILABLE, color: colorVars.text.inverse }} />
            <Chip size="small" label={t('carparkLegendPending')} sx={{ bgcolor: semanticColors.carpark.status.PENDING, color: colorVars.text.primary }} />
            <Chip size="small" label={t('carparkLegendOccupied')} sx={{ bgcolor: semanticColors.carpark.status.OCCUPIED, color: colorVars.text.inverse }} />
            <Chip size="small" label={t('carparkLegendBlocked')} sx={{ bgcolor: semanticColors.carpark.status.BLOCKED, color: colorVars.text.inverse }} />
          </Box>
          {headerAction && (
            <Box sx={{ ml: 'auto', display: 'flex' }}>
              {headerAction}
            </Box>
          )}
        </Box>
        {hasExplicitTimeSelection && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {t('carparkSelectedRange')}: {startTime} - {endTime}
          </Typography>
        )}
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {t('carparkBufferHint', { minutes: CARPARK_OVERLAP_BUFFER_MINUTES })}
        </Typography>
      </Paper>

      {pageNotifications.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
            {t('carparkNotifications')}
          </Typography>
          <Box sx={{ display: 'grid', gap: 1 }}>
            {pageNotifications.map((item) => (
              <Alert
                key={item.id}
                severity={item.severity}
                onClose={() => setPageNotifications((prev) => prev.filter((n) => n.id !== item.id))}
              >
                {item.message}
              </Alert>
            ))}
          </Box>
        </Paper>
      )}

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <Box sx={{ flex: '1 1 820px', minWidth: 320, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Paper variant="outlined" sx={{ p: 1, width: '100%' }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', px: 1, py: 0.5 }}>
              <Typography variant="body2" sx={{ flex: 1 }}>
                {t('carparkHintClick')}
              </Typography>
              <Button size="small" variant="outlined" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)))}>
                –
              </Button>
              <Button size="small" variant="outlined" onClick={() => setZoom((z) => Math.min(2, +(z + 0.1).toFixed(2)))}>
                +
              </Button>
              <Button size="small" variant="text" onClick={() => setZoom(1)} disabled={zoom === 1}>
                {t('carparkReset')}
              </Button>
            </Box>
            <Divider />
            <Box
              ref={containerRef}
              sx={{
                overflow: 'auto',
                maxHeight: 600,
                backgroundColor: colorVars.surface.paper,
              }}
            />
            {loadError && (
              <Typography variant="body2" color="error" sx={{ px: 1, py: 1 }}>
                {loadError}
              </Typography>
            )}
          </Paper>

          {(detailsVariant === 'panel' || detailsVariant === 'modal') && (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                {t('carparkDetails')}
              </Typography>
              {detailsBody}
            </Paper>
          )}
        </Box>
        <Box sx={{ flex: '0 1 340px', minWidth: 280, display: 'flex' }}>
          <Paper variant="outlined" sx={{ p: 2, width: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 1, flexWrap: 'wrap' }}>
              <Box>
                <Typography variant="h6">{t('carparkTimelineTitle')}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedSpot
                    ? t('carparkTimelineHint', { spot: selectedSpot.displayLabel || selectedSpot.label })
                    : t('carparkTimelineHintNoSpot')}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip size="small" label={t('carparkSelectedRange')} sx={{ bgcolor: semanticColors.carpark.selected, color: colorVars.text.inverse }} />
                <Chip size="small" label={t('carparkLegendPending')} sx={{ bgcolor: semanticColors.carpark.status.PENDING, color: colorVars.text.primary }} />
                <Chip size="small" label={t('carparkLegendOccupied')} sx={{ bgcolor: semanticColors.carpark.status.OCCUPIED, color: colorVars.text.inverse }} />
              </Box>
            </Box>
            <Box sx={{ height: detailsVariant === 'modal' ? 420 : 560 }}>
              <Calendar
                localizer={localizer}
                events={timelineEvents}
                startAccessor="start"
                endAccessor="end"
                views={['day']}
                view="day"
                toolbar={false}
                date={selectedDate}
                step={30}
                timeslots={1}
                selectable={timelineSelectable}
                onSelectSlot={handleTimelineSelect}
                min={new Date(0, 0, 0, CARPARK_TIMELINE_START_HOUR, 0, 0)}
                max={new Date(0, 0, 0, CARPARK_TIMELINE_END_HOUR, 0, 0)}
                formats={timelineFormats}
                eventPropGetter={timelineEventPropGetter}
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
            </Box>
          </Paper>
        </Box>
      </Box>
    </>
  );
};

export default CarparkView;
