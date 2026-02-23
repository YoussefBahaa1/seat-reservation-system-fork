import { Alert, Box, Button, Chip, Divider, Paper, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { getRequest, postRequest, deleteRequest } from '../RequestFunctions/RequestFunctions';
import CreateDatePicker from '../misc/CreateDatePicker';
import CreateTimePicker from '../misc/CreateTimePicker';
import LayoutPage from '../Templates/LayoutPage';

const CARPARK_SVG_URL = '/Assets/carpark_overview_ready.svg';
const CARPARK_SELECTED_DATE_KEY = 'carparkSelectedDate';
const CARPARK_DEFAULT_DURATION_MINUTES = 120;
const CARPARK_MIN_LEAD_MINUTES = 30;
const CARPARK_OVERLAP_BUFFER_MINUTES = 30;
const CARPARK_NOTIFICATION_STATE_VERSION = 'v2';
const CARPARK_RES_STATUS_SNAPSHOT_KEY = `carparkReservationStatusSnapshot_${CARPARK_NOTIFICATION_STATE_VERSION}`;
const CARPARK_NOTIFIED_STATUS_KEY = `carparkNotifiedReservationStatus_${CARPARK_NOTIFICATION_STATE_VERSION}`;
const CARPARK_NOTIFIED_REMINDERS_KEY = `carparkNotifiedReservationReminders_${CARPARK_NOTIFICATION_STATE_VERSION}`;

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

const formatTimeHHMM = (d) =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

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

const parseFloatAttr = (el, name, fallback = 0) => {
  const raw = el.getAttribute(name);
  const parsed = raw == null ? NaN : Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
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

const getSpotMetaFromDataset = (rect) => ({
  label: rect.dataset.spotLabel ?? '?',
  type: rect.dataset.spotType ?? 'unknown',
  spotCategory: rect.dataset.spotCategory ?? 'STANDARD',
  lit: rect.dataset.spotLit === 'true',
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

  const isSelectable = rect?.dataset?.spotSelectable !== 'false';
  if (!isSelectable) return false;

  const status = rect?.dataset?.spotStatus ?? 'UNKNOWN';
  const reservedByMe = rect?.dataset?.spotReservedByMe === 'true';

  if (status === 'AVAILABLE') return true;
  if ((status === 'PENDING' || status === 'OCCUPIED' || status === 'BLOCKED') && reservedByMe) return true;
  return false;
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

const CarparkOverview = () => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const containerRef = useRef(null);
  const cleanupRef = useRef([]);
  const selectedRectRef = useRef(null);
  const svgRef = useRef(null);
  const spotRectsByLabelRef = useRef(new Map());
  const initialTimeRangeRef = useRef(getDefaultTimeRange());
  const reservationStatusSnapshotRef = useRef(new Map());

  const [selectedSpot, setSelectedSpot] = useState(null);
  const [hoveredSpot, setHoveredSpot] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [zoom, setZoom] = useState(1);
  const [pageNotifications, setPageNotifications] = useState([]);
  const [adminEditMode, setAdminEditMode] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => {
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
  });
  const [startTime, setStartTime] = useState(initialTimeRangeRef.current.startTime);
  const [endTime, setEndTime] = useState(initialTimeRangeRef.current.endTime);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isAdminUser = localStorage.getItem('admin') === 'true';

  useEffect(() => {
    let cancelled = false;

    const cleanupCurrent = () => {
      for (const fn of cleanupRef.current) fn();
      cleanupRef.current = [];
      selectedRectRef.current = null;
      svgRef.current = null;
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
        .carpark-spot.carpark-hover { fill: #90caf9 !important; }
        .carpark-spot.carpark-selected { fill: #1976d2 !important; }
        .carpark-spot:focus { outline: none; }
        .carpark-status-available { fill: #2e7d32 !important; }
        .carpark-status-pending { fill: #f9a825 !important; }
        .carpark-status-occupied { fill: #c62828 !important; }
        .carpark-status-blocked { fill: #9e9e9e !important; }
      `;
      defs.appendChild(style);

      const localCleanup = [];
      const allTextNodes = Array.from(svg.querySelectorAll('text'))
        .map((el) => ({
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

      // Only "stall" rectangles are selectable/hoverable (blank "empty" spots are view-only).
      const spotRects = Array.from(svg.querySelectorAll('rect.stall')).filter((rect) => {
        const w = parseFloatAttr(rect, 'width');
        const h = parseFloatAttr(rect, 'height');
        return w >= 40 && h >= 40;
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

        const closest = getClosestNumericLabel(labelTexts, cx, cy);
        const spotLabel = closest?.value ?? `${idx + 1}`;
        const isSpecial = spotLabel === '23';
        const isSelectable = !isSpecial;

        const isLit = litTexts.some((t) => isPointInRect(t.x, t.y, x, y, w, h));
        const isAccessible = accessibleTexts.some((t) => isPointInRect(t.x, t.y, x, y, w, h));

        rect.dataset.spotLabel = spotLabel;
        rect.dataset.spotType = 'stall';
        rect.dataset.spotLit = isLit ? 'true' : 'false';
        rect.dataset.spotAccessible = isAccessible ? 'true' : 'false';
        rect.dataset.spotSpecial = isSpecial ? 'true' : 'false';
        rect.dataset.spotCategory = defaultSpotCategory(spotLabel, isSpecial, isAccessible);
        rect.dataset.spotCovered = 'false';
        rect.dataset.spotManuallyBlocked = 'false';
        rect.dataset.spotChargingKw = '';
        rect.dataset.spotSelectable = isSelectable ? 'true' : 'false';
        rect.dataset.spotAdminEditMode = 'false';
        // Default to AVAILABLE so the UI is usable even before the first availability refresh completes.
        rect.dataset.spotStatus = isSpecial ? 'BLOCKED' : 'AVAILABLE';
        rect.dataset.spotReservedByMe = 'false';
        rect.dataset.spotReservationId = '';
        rect.dataset.spotReservedBegin = '';
        rect.dataset.spotReservedEnd = '';
        rect.dataset.spotReservedByUser = '';
        spotRectsByLabelRef.current.set(spotLabel, rect);
        rect.classList.add(isSpecial ? 'carpark-status-blocked' : 'carpark-status-available');

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
          if (selectedRectRef.current && selectedRectRef.current !== rect) {
            selectedRectRef.current.classList.remove('carpark-selected');
          }
          selectedRectRef.current = rect;
          rect.classList.add('carpark-selected');
          setSelectedSpot(getSpotMetaFromDataset(rect));
        };

        const onMouseEnter = () => {
          rect.classList.add('carpark-hover');
          setHoveredSpot(getSpotMetaFromDataset(rect));
        };
        const onMouseLeave = () => {
          rect.classList.remove('carpark-hover');
          setHoveredSpot(null);
        };
        const onClick = (e) => {
          e.stopPropagation();
          if (!isSpotSelectableForCurrentUser(rect)) return;
          setSelectedRect();
        };
        const onKeyDown = (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!isSpotSelectableForCurrentUser(rect)) return;
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
        if (selectedRectRef.current) {
          selectedRectRef.current.classList.remove('carpark-selected');
        }
        selectedRectRef.current = null;
        setSelectedSpot(null);
      };
      svg.addEventListener('click', onSvgClick);
      localCleanup.push(() => svg.removeEventListener('click', onSvgClick));

      // If the pointer is not over an interactive stall rect, do not show hover details.
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

      if (cancelled) {
        for (const fn of localCleanup) fn();
        return;
      }

      svgRef.current = svg;
      cleanupRef.current = localCleanup;
      containerRef.current?.appendChild(svg);
    };

    load().catch((err) => {
      if (cancelled) return;
      setLoadError(err instanceof Error ? err.message : 'Failed to load carpark overview.');
    });

    return () => {
      cancelled = true;
      cleanupCurrent();
    };
  }, []);

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
    for (const rect of spotRectsByLabelRef.current.values()) {
      rect.dataset.spotAdminEditMode = adminEditMode && isAdminUser ? 'true' : 'false';
    }
  }, [adminEditMode, isAdminUser]);

  const addPageNotification = (severity, message, notificationKey) => {
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
  };

  useEffect(() => {
    let cancelled = false;
    const snapshotKey = namespacedCarparkKey(CARPARK_RES_STATUS_SNAPSHOT_KEY);
    const notifiedStatusKey = namespacedCarparkKey(CARPARK_NOTIFIED_STATUS_KEY);
    const notifiedRemindersKey = namespacedCarparkKey(CARPARK_NOTIFIED_REMINDERS_KEY);

    const pollMyReservations = () => {
      getRequest(
        `${process.env.REACT_APP_BACKEND_URL}/parking/reservations/mine`,
        null,
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
            const createdAt = reservation?.createdAt ? String(reservation.createdAt) : '';
            const reservationFingerprint = `${id}:${day}:${reservation?.begin ?? ''}:${reservation?.end ?? ''}:${createdAt}`;

            if (prevStatus === 'PENDING' && (status === 'APPROVED' || status === 'REJECTED')) {
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
  }, [i18n.language]);

  const spotForPanel = selectedSpot ?? hoveredSpot;
  const isSpecialSpot = spotForPanel?.special === true;
  const isManuallyBlockedSpot = spotForPanel?.manuallyBlocked === true;
  const canAdminToggleBlock = Boolean(isAdminUser && adminEditMode && selectedSpot && !isSpecialSpot);
  const isBlocked = spotForPanel?.status === 'BLOCKED' || isSpecialSpot;
  const isPending = spotForPanel?.status === 'PENDING';
  const isOccupied = spotForPanel?.status === 'OCCUPIED';
  const isAvailable = spotForPanel?.status === 'AVAILABLE';

  const formatISODate = (d) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const timeToMinutes = (tStr) => {
    if (!tStr) return NaN;
    const [hh, mm] = tStr.split(':');
    const h = Number.parseInt(hh, 10);
    const m = Number.parseInt(mm, 10);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return NaN;
    return h * 60 + m;
  };

  const refreshAvailability = () => {
    if (!spotRectsByLabelRef.current || spotRectsByLabelRef.current.size === 0) return;
    if (!selectedDate || !startTime || !endTime) return;
    if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
      toast.warning(t('timerangeIsNotValid'));
      return;
    }

    const spotLabels = Array.from(spotRectsByLabelRef.current.keys());
    const day = formatISODate(selectedDate);
    setIsRefreshing(true);

    postRequest(
      `${process.env.REACT_APP_BACKEND_URL}/parking/availability`,
      null,
      (data) => {
        const statusByLabel = new Map();
        for (const row of data ?? []) {
          statusByLabel.set(String(row.spotLabel), row);
        }

        for (const [label, rect] of spotRectsByLabelRef.current.entries()) {
          rect.classList.remove('carpark-status-available', 'carpark-status-pending', 'carpark-status-occupied', 'carpark-status-blocked');

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
    if (!selectedSpot || selectedSpot.status !== 'AVAILABLE') return;
    const day = formatISODate(selectedDate);

    postRequest(
      `${process.env.REACT_APP_BACKEND_URL}/parking/reservations`,
      null,
      (data) => {
        if (String(data?.status || '') === 'PENDING') toast.success(t('carparkReviewSubmitted'));
        else toast.success(t('booked'));
        refreshAvailability();
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
      null,
      () => {
        toast.success(t('bookingDeleted'));
        refreshAvailability();
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
      null,
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

  return (
    <LayoutPage
      title={t('carparkTitle')}
      helpText={t('carparkHelp')}
      useGenericBackButton={true}
      withPaddingX={true}
    >
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <Box sx={{ minWidth: 220, flex: '0 1 220px' }}>
            <CreateDatePicker date={selectedDate} setter={setSelectedDate} label={t('date')} />
          </Box>
          <Box sx={{ minWidth: 160, flex: '0 1 160px' }}>
            <CreateTimePicker time={startTime} setter={setStartTime} label={t('startTime')} />
          </Box>
          <Box sx={{ minWidth: 160, flex: '0 1 160px' }}>
            <CreateTimePicker time={endTime} setter={setEndTime} label={t('endTime')} />
          </Box>
          <Button variant="contained" onClick={refreshAvailability} disabled={isRefreshing}>
            {t('carparkRefresh')}
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
            <Chip size="small" label={t('carparkLegendAvailable')} sx={{ bgcolor: '#2e7d32', color: '#fff' }} />
            <Chip size="small" label={t('carparkLegendPending')} sx={{ bgcolor: '#f9a825', color: '#000' }} />
            <Chip size="small" label={t('carparkLegendOccupied')} sx={{ bgcolor: '#c62828', color: '#fff' }} />
            <Chip size="small" label={t('carparkLegendBlocked')} sx={{ bgcolor: '#9e9e9e', color: '#fff' }} />
          </Box>
        </Box>
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

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ flex: '1 1 720px', minWidth: 320 }}>
          <Paper variant="outlined" sx={{ p: 1 }}>
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
                backgroundColor: '#fff',
              }}
            />
            {loadError && (
              <Typography variant="body2" color="error" sx={{ px: 1, py: 1 }}>
                {loadError}
              </Typography>
            )}
          </Paper>
        </Box>

        <Box sx={{ flex: '0 1 320px', minWidth: 280 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              {t('carparkDetails')}
            </Typography>
            {!spotForPanel && (
              <Typography variant="body2" color="text.secondary">
                {t('carparkNoSelection')}
              </Typography>
            )}
            {spotForPanel && (
              <>
                <Typography variant="body1" sx={{ fontWeight: 700 }}>
                  {t('carparkSpot')} {spotForPanel.label}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t(`carparkStatus_${spotForPanel.status}`)}
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
            <Divider sx={{ my: 2 }} />
            <Typography variant="body2" color="text.secondary">
              {adminEditMode && isAdminUser
                ? t('carparkEditModeHint')
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
          </Paper>
        </Box>
      </Box>
    </LayoutPage>
  );
};

export default CarparkOverview;
