import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';

import { postRequest } from '../../RequestFunctions/RequestFunctions';
import { colorVars } from '../../../theme';

const STATUS_LABEL_KEY = {
  BOOKABLE: 'roomBulkStatusBookable',
  HIDDEN: 'roomBulkStatusHidden',
  BLOCKED: 'roomBulkStatusBlocked',
  LOCKED_BY_OTHER: 'roomBulkStatusLockedByOther',
  BOOKING_CONFLICT: 'roomBulkStatusBookingConflict',
  SCHEDULED_BLOCKING: 'roomBulkStatusScheduledBlocking',
};

const REASON_LABEL_KEY = {
  bookable: 'roomBulkReasonBookable',
  hidden: 'roomBulkReasonHidden',
  blocked: 'roomBulkReasonBlocked',
  lockedByOther: 'roomBulkReasonLockedByOther',
  bookingConflict: 'roomBulkReasonBookingConflict',
  scheduledBlocking: 'roomBulkReasonScheduledBlocking',
};

const calendarLocalizer = momentLocalizer(moment);
const MIN_START_HOUR = 6;
const MAX_END_HOUR = 22;
const calendarFormats = {
  timeGutterFormat: (date, culture, loc) => loc.format(date, 'HH:mm', culture),
  eventTimeRangeFormat: ({ start, end }, culture, loc) =>
    `${loc.format(start, 'HH:mm', culture)} – ${loc.format(end, 'HH:mm', culture)}`,
  agendaTimeRangeFormat: ({ start, end }, culture, loc) =>
    `${loc.format(start, 'HH:mm', culture)} – ${loc.format(end, 'HH:mm', culture)}`,
  eventTimeRangeStartFormat: ({ start }, culture, loc) => loc.format(start, 'HH:mm', culture),
  eventTimeRangeEndFormat: ({ end }, culture, loc) => loc.format(end, 'HH:mm', culture),
  agendaTimeFormat: (date, culture, loc) => loc.format(date, 'HH:mm', culture),
  selectRangeFormat: ({ start, end }, culture, loc) =>
    `${loc.format(start, 'HH:mm', culture)} – ${loc.format(end, 'HH:mm', culture)}`,
};

const normalizeDateInput = (value) => {
  if (!(value instanceof Date) || Number.isNaN(value.valueOf())) {
    return '';
  }
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const normalizeTimeInput = (value) => {
  if (!(value instanceof Date) || Number.isNaN(value.valueOf())) {
    return '';
  }
  const hours = String(value.getHours()).padStart(2, '0');
  const minutes = String(value.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

const isHalfHourAligned = (timeValue) => {
  if (!timeValue || !String(timeValue).includes(':')) {
    return false;
  }
  const [, minutePart] = String(timeValue).slice(0, 5).split(':');
  const minute = Number(minutePart);
  return Number.isFinite(minute) && minute % 30 === 0;
};

const toMinutes = (timeValue) => {
  if (!timeValue || !String(timeValue).includes(':')) {
    return null;
  }
  const [hours, minutes] = String(timeValue).slice(0, 5).split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }
  return (hours * 60) + minutes;
};

const extractErrorMessage = (payload) => {
  if (!payload) return null;
  if (typeof payload === 'string') return payload;
  if (typeof payload?.error === 'string') return payload.error;
  if (typeof payload?.message === 'string') return payload.message;
  return null;
};

const buildSelectionEvent = (start, end) => ({
  id: 'room-bulk-selection',
  title: '',
  start,
  end,
});

const getDeskReasonKeys = (desk) => {
  if (Array.isArray(desk?.reasons) && desk.reasons.length > 0) {
    return desk.reasons;
  }
  if (desk?.reason) {
    return [desk.reason];
  }
  return [];
};

const DeskStatusList = ({ title, emptyLabel, desks, t, containerId, titleId }) => (
  <Paper
    id={containerId}
    variant="outlined"
    sx={{
      p: 2,
      borderRadius: '16px',
      backgroundColor: colorVars.surface.paper,
      borderColor: colorVars.border.default,
      minHeight: 180,
    }}
  >
    <Typography id={titleId} variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
      {title}
    </Typography>
    {desks.length === 0 ? (
      <Typography variant="body2" color="text.secondary">
        {emptyLabel}
      </Typography>
    ) : (
      <Stack spacing={1}>
        {desks.map((desk) => (
          <Box
            key={`${desk.deskId ?? 'unknown'}-${desk.status}`}
            id={`room_bulk_status_${String(desk.status || 'unknown').toLowerCase()}_${desk.deskId ?? 'unknown'}`}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 1,
              p: 1.25,
              borderRadius: '12px',
              backgroundColor: colorVars.surface.subtle,
              border: `1px solid ${colorVars.border.faint}`,
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {desk.deskLabel || t('desk')}
              </Typography>
              <Stack spacing={0.25}>
                {getDeskReasonKeys(desk).map((reasonKey, index) => (
                  <Typography
                    key={`${desk.deskId ?? 'unknown'}-${reasonKey}-${index}`}
                    variant="caption"
                    color="text.secondary"
                  >
                    {t(REASON_LABEL_KEY[reasonKey] || 'roomBulkReasonUnknown')}
                  </Typography>
                ))}
              </Stack>
            </Box>
            <Chip
              size="small"
              label={t(STATUS_LABEL_KEY[desk.status] || 'roomBulkStatusUnknown')}
              sx={{ flexShrink: 0 }}
            />
          </Box>
        ))}
      </Stack>
    )}
  </Paper>
);

const RoomBulkBookingPanel = ({
  headers,
  roomId,
  room,
  initialDate,
  preferredSlot,
  onBooked,
}) => {
  const { t } = useTranslation();

  const derivedInitialValues = useMemo(() => {
    const slotStart = preferredSlot?.start instanceof Date ? preferredSlot.start : null;
    const slotEnd = preferredSlot?.end instanceof Date ? preferredSlot.end : null;
    const baseDate = slotStart || initialDate;
    return {
      day: slotStart ? normalizeDateInput(slotStart) : '',
      begin: slotStart ? normalizeTimeInput(slotStart) : '',
      end: slotEnd ? normalizeTimeInput(slotEnd) : '',
      calendarDate: baseDate instanceof Date && !Number.isNaN(baseDate.valueOf()) ? baseDate : new Date(),
      slotEvent: slotStart && slotEnd
        ? buildSelectionEvent(slotStart, slotEnd)
        : null,
    };
  }, [initialDate, preferredSlot]);

  const [day, setDay] = useState(derivedInitialValues.day);
  const [begin, setBegin] = useState(derivedInitialValues.begin);
  const [end, setEnd] = useState(derivedInitialValues.end);
  const [calendarDate, setCalendarDate] = useState(derivedInitialValues.calendarDate);
  const [calendarView, setCalendarView] = useState('day');
  const [slotEvent, setSlotEvent] = useState(derivedInitialValues.slotEvent);
  const [preview, setPreview] = useState(null);
  const [previewError, setPreviewError] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewVersion, setPreviewVersion] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setDay(derivedInitialValues.day);
    setBegin(derivedInitialValues.begin);
    setEnd(derivedInitialValues.end);
    setCalendarDate(derivedInitialValues.calendarDate);
    setSlotEvent(derivedInitialValues.slotEvent);
    setPreview(null);
    setPreviewError('');
    setPreviewVersion(0);
  }, [derivedInitialValues, roomId]);

  const beginMinutes = toMinutes(begin);
  const endMinutes = toMinutes(end);
  const hasPeriod = Boolean(day && begin && end);
  const hasValidRange = hasPeriod && beginMinutes !== null && endMinutes !== null && endMinutes > beginMinutes;
  const hasAlignedRange = hasValidRange && isHalfHourAligned(begin) && isHalfHourAligned(end);

  useEffect(() => {
    if (!roomId) {
      setPreview(null);
      setPreviewError('');
      return;
    }

    if (!hasPeriod) {
      setPreview(null);
      setPreviewError('');
      return;
    }

    if (!hasValidRange) {
      setPreview(null);
      setPreviewError(t('timeRangeInvalid'));
      return;
    }

    if (!hasAlignedRange) {
      setPreview(null);
      setPreviewError(t('bookingTimeAlignmentError'));
      return;
    }

    let active = true;
    setPreviewLoading(true);
    setPreviewError('');

    postRequest(
      `${process.env.REACT_APP_BACKEND_URL}/admin/rooms/${roomId}/bulk-booking-preview`,
      headers,
      (data) => {
        if (!active) return;
        setPreview(data || null);
        setPreviewLoading(false);
      },
      (_status, payload) => {
        if (!active) return;
        setPreview(null);
        setPreviewLoading(false);
        setPreviewError(extractErrorMessage(payload) || t('httpOther'));
      },
      {
        day,
        begin,
        end,
      }
    );

    return () => {
      active = false;
    };
  }, [begin, day, end, hasAlignedRange, hasPeriod, hasValidRange, headers, roomId, t, previewVersion]);

  const groupedStatuses = useMemo(() => {
    const allStatuses = Array.isArray(preview?.deskStatuses) ? preview.deskStatuses : [];
    return {
      included: allStatuses.filter((desk) => desk.status === 'BOOKABLE'),
      conflicts: allStatuses.filter((desk) => !['BOOKABLE', 'HIDDEN', 'BLOCKED'].includes(String(desk.status || ''))),
      excluded: allStatuses.filter((desk) => ['HIDDEN', 'BLOCKED'].includes(String(desk.status || ''))),
    };
  }, [preview]);

  const canSubmit = Boolean(preview?.canSubmit) && !previewLoading && !submitting && !previewError;

  const applySelectedSlot = ({ start, end: slotEnd }) => {
    const normalizedStart = new Date(start);
    const normalizedEnd = new Date(slotEnd);
    normalizedStart.setSeconds(0, 0);
    normalizedEnd.setSeconds(0, 0);

    if (Number.isNaN(normalizedStart.valueOf()) || Number.isNaN(normalizedEnd.valueOf()) || normalizedEnd <= normalizedStart) {
      toast.warning(t('timeRangeInvalid'));
      return;
    }

    if (normalizeDateInput(normalizedStart) !== normalizeDateInput(normalizedEnd)) {
      toast.warning(t('timeRangeInvalid'));
      return;
    }

    setCalendarDate(normalizedStart);
    setSlotEvent(buildSelectionEvent(normalizedStart, normalizedEnd));
    setDay(normalizeDateInput(normalizedStart));
    setBegin(normalizeTimeInput(normalizedStart));
    setEnd(normalizeTimeInput(normalizedEnd));
  };

  const handleSubmit = () => {
    if (!canSubmit) {
      return;
    }
    setSubmitting(true);
    postRequest(
      `${process.env.REACT_APP_BACKEND_URL}/admin/rooms/${roomId}/bulk-bookings`,
      headers,
      (data) => {
        toast.success(t('roomBulkBookingSuccess', { count: data?.createdCount ?? preview?.includedDeskCount ?? 0 }));
        setSubmitting(false);
        setConfirmOpen(false);
        if (typeof onBooked === 'function') {
          onBooked(data);
        }
      },
      (_status, payload) => {
        setSubmitting(false);
        setConfirmOpen(false);
        toast.error(extractErrorMessage(payload) || t('httpOther'));
        setPreviewVersion((prev) => prev + 1);
      },
      {
        day,
        begin,
        end,
      }
    );
  };

  return (
    <>
      <Stack spacing={2.5}>
        <Paper
          id="room_bulk_booking_panel"
          variant="outlined"
          sx={{
            p: 2.5,
            borderRadius: '18px',
            backgroundColor: colorVars.surface.paper,
            borderColor: colorVars.border.default,
          }}
        >
          <Stack spacing={2}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {t('roomBulkBookingTitle')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('roomBulkBookingHelper', { room: room?.remark || preview?.roomLabel || t('room') })}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Chip id="room_bulk_selected_day" variant="outlined" label={`${t('date')}: ${day || '--'}`} />
              <Chip id="room_bulk_selected_begin" variant="outlined" label={`${t('startTime')}: ${begin || '--:--'}`} />
              <Chip id="room_bulk_selected_end" variant="outlined" label={`${t('endTime')}: ${end || '--:--'}`} />
            </Stack>

            <Box id="room_bulk_calendar" sx={{ height: 620 }}>
              <Calendar
                localizer={calendarLocalizer}
                events={slotEvent ? [slotEvent] : []}
                startAccessor="start"
                endAccessor="end"
                views={['day', 'week']}
                view={calendarView}
                date={calendarDate}
                defaultView="day"
                defaultDate={initialDate}
                selectable
                step={30}
                timeslots={1}
                min={new Date(0, 0, 0, MIN_START_HOUR, 0, 0)}
                max={new Date(0, 0, 0, MAX_END_HOUR, 0, 0)}
                formats={calendarFormats}
                components={{
                  event: () => null,
                }}
                onView={(nextView) => setCalendarView(nextView)}
                onNavigate={(nextDate) => setCalendarDate(nextDate)}
                onSelectSlot={applySelectedSlot}
                eventPropGetter={() => ({
                  style: {
                    backgroundColor: colorVars.brand.primary,
                    border: `1px solid ${colorVars.brand.primaryPressed}`,
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
            </Box>

            {!slotEvent ? (
              <Typography id="room_bulk_select_period_hint" variant="body2" color="text.secondary">
                {t('roomBulkSelectPeriodHint')}
              </Typography>
            ) : null}

            {previewError ? (
              <Alert id="room_bulk_preview_error" severity="warning">{previewError}</Alert>
            ) : null}
            {previewLoading ? (
              <Typography id="room_bulk_preview_loading" variant="body2">{t('loading')}...</Typography>
            ) : preview ? (
              <Box
                id="room_bulk_preview_summary"
                sx={{
                  display: 'grid',
                  gap: 2,
                  gridTemplateColumns: {
                    xs: '1fr',
                    md: 'repeat(3, minmax(0, 1fr))',
                  },
                }}
              >
                <DeskStatusList
                  containerId="room_bulk_included_list"
                  titleId="room_bulk_included_title"
                  title={`${t('roomBulkIncludedDesks')} (${groupedStatuses.included.length})`}
                  emptyLabel={t('roomBulkNoIncludedDesks')}
                  desks={groupedStatuses.included}
                  t={t}
                />
                <DeskStatusList
                  containerId="room_bulk_conflicts_list"
                  titleId="room_bulk_conflicts_title"
                  title={`${t('roomBulkConflictSection')} (${groupedStatuses.conflicts.length})`}
                  emptyLabel={t('roomBulkNoConflicts')}
                  desks={groupedStatuses.conflicts}
                  t={t}
                />
                <DeskStatusList
                  containerId="room_bulk_excluded_list"
                  titleId="room_bulk_excluded_title"
                  title={`${t('roomBulkExcludedSection')} (${groupedStatuses.excluded.length})`}
                  emptyLabel={t('roomBulkNoExcludedDesks')}
                  desks={groupedStatuses.excluded}
                  t={t}
                />
              </Box>
            ) : null}
            {!previewLoading && preview && (preview.includedDeskCount === 0 || preview.conflictedDeskCount > 0) ? (
              <Alert
                id={preview.includedDeskCount === 0 ? 'room_bulk_no_eligible_alert' : 'room_bulk_conflicts_alert'}
                severity="info"
              >
                {preview.includedDeskCount === 0
                  ? t('roomBulkNoEligibleDesks')
                  : t('roomBulkHasConflicts')}
              </Alert>
            ) : null}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                id="room_bulk_book_all_btn"
                variant="contained"
                onClick={() => setConfirmOpen(true)}
                disabled={!canSubmit}
                sx={{
                  backgroundColor: colorVars.brand.accent,
                  borderRadius: '10px',
                  px: 2.5,
                  '&:hover': { backgroundColor: colorVars.brand.primaryPressed },
                }}
              >
                {t('roomBulkBookAll')}
              </Button>
            </Box>
          </Stack>
        </Paper>

      </Stack>

      <Dialog id="room_bulk_confirm_dialog" open={confirmOpen} onClose={() => !submitting && setConfirmOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle id="room_bulk_confirm_title">{t('roomBulkConfirmTitle')}</DialogTitle>
        <DialogContent id="room_bulk_confirm_content" sx={{ display: 'grid', gap: 1.5, pt: '12px !important' }}>
          <Typography id="room_bulk_confirm_room" variant="body2">
            {t('roomBulkConfirmRoom', { room: room?.remark || preview?.roomLabel || t('room') })}
          </Typography>
          <Typography id="room_bulk_confirm_time" variant="body2">
            {t('roomBulkConfirmDateTime', { day, begin, end })}
          </Typography>
          <Typography id="room_bulk_confirm_summary" variant="body2">
            {t('roomBulkConfirmSummary', {
              included: preview?.includedDeskCount ?? 0,
              conflicted: preview?.conflictedDeskCount ?? 0,
              excluded: preview?.excludedDeskCount ?? 0,
            })}
          </Typography>
          <Alert id="room_bulk_confirm_owner_note" severity="info">{t('roomBulkBookingOwnerNote')}</Alert>
        </DialogContent>
        <DialogActions>
          <Button id="room_bulk_confirm_cancel_btn" onClick={() => setConfirmOpen(false)} disabled={submitting}>
            {t('cancel')}
          </Button>
          <Button id="room_bulk_confirm_submit_btn" variant="contained" onClick={handleSubmit} disabled={!canSubmit || submitting}>
            {submitting ? `${t('loading')}...` : t('roomBulkConfirmAction')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default RoomBulkBookingPanel;
