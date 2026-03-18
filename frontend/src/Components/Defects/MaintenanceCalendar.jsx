import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/de';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '../Home/Home.css';
import { useTranslation } from 'react-i18next';
import {
  Box, Button, Typography, Dialog, DialogTitle,
  DialogContent, DialogActions
} from '@mui/material';
import { toast } from 'react-toastify';
import { getRequest, postRequest, deleteRequest } from '../RequestFunctions/RequestFunctions';
import LayoutPage from '../Templates/LayoutPage';
import { colorVars } from '../../theme';
import { buildLocationLabel } from './defectUtils';

const localizer = momentLocalizer(moment);

const MaintenanceCalendar = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const headers = useRef(JSON.parse(sessionStorage.getItem('headers')));

  const defectId = location.state?.defectId;

  const [defect, setDefect] = useState(null);
  const [calendarDate, setCalendarDate] = useState(moment().startOf('month').toDate());
  const [monthEvents, setMonthEvents] = useState([]);
  const [viewMode, setViewMode] = useState('month');
  const [selectedDate, setSelectedDate] = useState(null);

  // Day view state
  const [dayEvents, setDayEvents] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [blockPromptOpen, setBlockPromptOpen] = useState(false);
  const [futureBookingCount, setFutureBookingCount] = useState(null);
  const [pendingSlot, setPendingSlot] = useState(null);
  const [selectedExistingBlocking, setSelectedExistingBlocking] = useState(null);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);

  useEffect(() => {
    moment.locale(i18n.language === 'en' ? 'en-gb' : i18n.language);
  }, [i18n.language]);

  useEffect(() => {
    if (!defectId) {
      navigate('/defects');
      return;
    }
    getRequest(
      `${process.env.REACT_APP_BACKEND_URL}/defects/${defectId}`,
      headers.current,
      setDefect,
      () => {
        toast.error(t('defectReportFailed'));
        navigate('/defects');
      }
    );
  }, [defectId, navigate, t]);

  const buildMonthEvents = useCallback((countsByDay = {}) => {
    const monthStart = moment(calendarDate).startOf('month');
    const daysInMonth = monthStart.daysInMonth();
    const events = [];

    for (let i = 0; i < daysInMonth; i++) {
      const date = monthStart.clone().add(i, 'days');
      const dayKey = date.format('YYYY-MM-DD');
      const parsedCount = Number(countsByDay?.[dayKey]);
      const count = Number.isFinite(parsedCount) ? parsedCount : 0;

      events.push({
        start: date.startOf('day').toDate(),
        end: date.endOf('day').toDate(),
        title: `${t('blockingSum')}: ${count}`,
        allDay: true,
        resource: { count, dayKey }
      });
    }

    setMonthEvents(events);
  }, [calendarDate, t]);

  const loadMonthCounts = useCallback(() => {
    if (!defectId) return;
    const year = moment(calendarDate).year();
    const month = moment(calendarDate).month() + 1;

    getRequest(
      `${process.env.REACT_APP_BACKEND_URL}/defects/${defectId}/scheduled-blockings/counts?year=${year}&month=${month}`,
      headers.current,
      (data) => {
        buildMonthEvents(data || {});
      },
      () => {
        buildMonthEvents({});
      }
    );
  }, [defectId, calendarDate, buildMonthEvents]);

  useEffect(() => {
    if (viewMode === 'month') {
      loadMonthCounts();
    }
  }, [viewMode, loadMonthCounts]);

  const loadDayBlockings = useCallback(() => {
    if (!defectId || !selectedDate) return;

    getRequest(
      `${process.env.REACT_APP_BACKEND_URL}/defects/${defectId}/scheduled-blockings`,
      headers.current,
      (blockings) => {
        const dayStr = moment(selectedDate).format('YYYY-MM-DD');
        const events = blockings
          .filter(sb => {
            const sbDate = moment(sb.startDateTime).format('YYYY-MM-DD');
            return sbDate === dayStr && sb.status !== 'CANCELLED';
          })
          .map(sb => ({
            start: new Date(sb.startDateTime),
            end: new Date(sb.endDateTime),
            title: '',
            id: sb.id,
            status: sb.status,
            isExisting: true
          }));
        setDayEvents(events);
      },
      () => {}
    );
  }, [defectId, selectedDate]);

  useEffect(() => {
    if (viewMode === 'day') {
      loadDayBlockings();
    }
  }, [viewMode, loadDayBlockings]);

  const handleNavigate = (newDate, view) => {
    if (!newDate) return;
    if (!view || view === 'month') {
      setCalendarDate(moment(newDate).startOf('month').toDate());
    }
  };

  const handleScheduleClick = (date) => {
    setSelectedDate(moment(date).startOf('day').toDate());
    setSelectedSlot(null);
    setSelectedExistingBlocking(null);
    setCancelConfirmOpen(false);
    setViewMode('day');
  };

  const handleBackToMonth = useCallback(() => {
    setViewMode('month');
    setSelectedSlot(null);
    setPendingSlot(null);
    setFutureBookingCount(null);
    setBlockPromptOpen(false);
    setDayEvents([]);
    setSelectedExistingBlocking(null);
    setCancelConfirmOpen(false);
  }, []);

  const handleTopRightBack = useCallback(() => {
    if (viewMode === 'day') {
      handleBackToMonth();
      return;
    }

    if (defectId) {
      navigate('/defects', { state: { openDefectId: defectId } });
      return;
    }

    navigate('/defects');
  }, [defectId, handleBackToMonth, navigate, viewMode]);

  const handleDayNavigate = useCallback((newDate) => {
    if (!newDate) return;
    setSelectedDate(moment(newDate).startOf('day').toDate());
    setSelectedSlot(null);
    setPendingSlot(null);
    setFutureBookingCount(null);
    setBlockPromptOpen(false);
    setSelectedExistingBlocking(null);
    setCancelConfirmOpen(false);
  }, []);

  const closeExistingBlockingDialogs = () => {
    setSelectedExistingBlocking(null);
    setCancelConfirmOpen(false);
  };

  const handleSelectDayEvent = (event) => {
    if (!event?.isExisting) {
      return;
    }
    setSelectedSlot(null);
    setSelectedExistingBlocking(event);
    setCancelConfirmOpen(false);
  };

  const cancelSelectedBlocking = () => {
    const blockingId = selectedExistingBlocking?.id;
    if (!blockingId) {
      return;
    }

    deleteRequest(
      `${process.env.REACT_APP_BACKEND_URL}/defects/${defectId}/scheduled-blockings/${blockingId}`,
      headers.current,
      () => {
        toast.success(t('scheduledBlockingCancelled'));
        setSelectedSlot(null);
        closeExistingBlockingDialogs();
        loadDayBlockings();
        loadMonthCounts();
      },
      (_status, errorData) => {
        const errorMessage = errorData?.error
          || errorData?.message
          || t('scheduledBlockingCancelFailed');
        toast.error(errorMessage);
      }
    );
  };

  const selectSlot = useCallback((slotData) => {
    if (!slotData) return;

    const startTime = new Date(slotData.start);
    const endTime = new Date(slotData.end);
    const duration = endTime - startTime;

    const now = new Date();
    if (startTime < now) {
      toast.warning(t('scheduledBlockingPastDate'));
      return;
    }

    if (duration < 60 * 60 * 1000) {
      toast.warning(t('scheduledBlockingMinDuration'));
      return;
    }

    const isOverlap = dayEvents.some(
      (e) => e.isExisting &&
        (startTime < e.end && endTime > e.start)
    );
    if (isOverlap) {
      toast.warning(t('scheduledBlockingOverlap'));
      return;
    }

    const newSlot = { start: slotData.start, end: slotData.end, id: 'selection' };
    setSelectedSlot(newSlot);
    setSelectedExistingBlocking(null);
  }, [dayEvents, t]);

  const submitScheduledBlocking = (cancelFutureBookings) => {
    const slot = cancelFutureBookings !== undefined ? pendingSlot : selectedSlot;
    if (!slot) return;

    const body = {
      startDateTime: moment(slot.start).format('YYYY-MM-DDTHH:mm:ss'),
      endDateTime: moment(slot.end).format('YYYY-MM-DDTHH:mm:ss'),
      cancelFutureBookings: cancelFutureBookings !== undefined ? cancelFutureBookings : null
    };

    postRequest(
      `${process.env.REACT_APP_BACKEND_URL}/defects/${defectId}/scheduled-blockings`,
      headers.current,
      () => {
        toast.success(t('scheduledBlockingCreated'));
        setSelectedSlot(null);
        setBlockPromptOpen(false);
        setPendingSlot(null);
        loadDayBlockings();
        loadMonthCounts();
      },
      (status, errorData) => {
        const conflictWithFutureBookings = status === 409 && (
          errorData?.code === 'FUTURE_BOOKINGS_EXIST' ||
          typeof errorData?.futureBookingCount === 'number'
        );
        if (conflictWithFutureBookings) {
          setPendingSlot(slot);
          setFutureBookingCount(
            typeof errorData?.futureBookingCount === 'number'
              ? errorData.futureBookingCount
              : null
          );
          setBlockPromptOpen(true);
        } else {
          toast.error(t('scheduledBlockingFailed'));
        }
      },
      JSON.stringify(body)
    );
  };

  const calendarFormats = {
    timeGutterFormat: (date, culture, loc) => loc.format(date, 'HH:mm', culture),
    eventTimeRangeFormat: ({ start, end }, culture, loc) =>
      `${loc.format(start, 'HH:mm', culture)} - ${loc.format(end, 'HH:mm', culture)}`,
  };

  const BlockingEvent = ({ event }) => {
    const count = event?.resource?.count ?? 0;
    const date = event?.start;
    const dayKey = event?.resource?.dayKey ?? moment(date).format('YYYY-MM-DD');

    const handleClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleScheduleClick(date);
    };

    return (
      <div className="home-booking-event">
        <button
          type="button"
          id={`maintenance_calendar_open_day_${dayKey}`}
          className="home-add-booking-btn"
          onClick={handleClick}
        >
          {t('scheduleBlocking')}
        </button>
        <div className="home-bookings-sum">
          {t('blockingSum')}: {count}
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
      <span className="home-rbc-toolbar-right" />
    </div>
  );

  const locationLabel = defect ? buildLocationLabel(defect) : '';

  if (viewMode === 'day' && selectedDate) {
    const allEvents = [
      ...dayEvents,
      ...(selectedSlot ? [{ ...selectedSlot }] : [])
    ];

    return (
      <LayoutPage
        title={t('maintenanceCalendar')}
        helpText=""
        useGenericBackButton
        onGenericBack={handleTopRightBack}
        withPaddingX
      >
        <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          {locationLabel && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {locationLabel}
            </Typography>
          )}
          <Typography id="maintenance_calendar_selected_date" variant="body2" color="text.secondary">
            {moment(selectedDate).format('dddd, MMMM D, YYYY')}
          </Typography>

          <Box id="maintenance_calendar_day_view" sx={{ width: '100%', maxWidth: 900 }}>
            <Calendar
              localizer={localizer}
              events={allEvents}
              startAccessor="start"
              endAccessor="end"
              views={['day']}
              defaultView="day"
              date={selectedDate}
              onNavigate={handleDayNavigate}
              onSelectSlot={(data) => selectSlot(data)}
              onSelectEvent={handleSelectDayEvent}
              selectable
              min={new Date(0, 0, 0, 6, 0, 0)}
              max={new Date(0, 0, 0, 22, 0, 0)}
              formats={calendarFormats}
              components={{ toolbar: CustomToolbar }}
              eventPropGetter={(event) => ({
                className: event.isExisting
                  ? 'maintenance-calendar-existing-blocking'
                  : 'maintenance-calendar-selected-blocking',
                style: {
                  backgroundColor: event.isExisting
                    ? colorVars.state.neutralGrey
                    : colorVars.brand.primary,
                  cursor: 'pointer',
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

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              id="maintenance_calendar_schedule_submit"
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
              onClick={() => submitScheduledBlocking()}
              disabled={!selectedSlot}
            >
              {t('scheduleBlocking')}
            </Button>
            {selectedExistingBlocking?.status === 'SCHEDULED' && (
              <Button
                id="maintenance_calendar_cancel_selected"
                sx={{
                  margin: '10px',
                  padding: '15px',
                  backgroundColor: colorVars.text.error,
                  borderRadius: '8px',
                  color: colorVars.text.inverse,
                  fontSize: '16px',
                  textAlign: 'center',
                  textTransform: 'uppercase',
                  transition: 'all 0.5s',
                }}
                onClick={() => setCancelConfirmOpen(true)}
              >
                {t('cancel')}
              </Button>
            )}
          </Box>
        </Box>

        <Dialog id="maintenance_calendar_future_bookings_dialog" open={blockPromptOpen} onClose={() => setBlockPromptOpen(false)}>
          <DialogTitle>{t('scheduleBlocking')}</DialogTitle>
          <DialogContent>
            <Typography>
              {t('defectFutureBookingsPrompt', { count: futureBookingCount ?? '?' })}
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button
              id="maintenance_calendar_retain_bookings"
              onClick={() => { setBlockPromptOpen(false); submitScheduledBlocking(false); }}
            >
              {t('defectRetainBookings')}
            </Button>
            <Button
              id="maintenance_calendar_cancel_bookings"
              color="error"
              onClick={() => { setBlockPromptOpen(false); submitScheduledBlocking(true); }}
            >
              {t('defectCancelBookings')}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog id="maintenance_calendar_cancel_confirm_dialog" open={cancelConfirmOpen} onClose={() => setCancelConfirmOpen(false)}>
          <DialogTitle>{t('scheduledBlockingCancelConfirmTitle')}</DialogTitle>
          <DialogContent>
            <Typography>{t('scheduledBlockingCancelConfirmText')}</Typography>
          </DialogContent>
          <DialogActions>
            <Button id="maintenance_calendar_cancel_confirm_no" onClick={() => setCancelConfirmOpen(false)}>{t('no')}</Button>
            <Button id="maintenance_calendar_cancel_confirm_yes" color="error" onClick={cancelSelectedBlocking}>{t('yes')}</Button>
          </DialogActions>
        </Dialog>
      </LayoutPage>
    );
  }

  return (
    <LayoutPage
      title={t('maintenanceCalendar')}
      helpText=""
      useGenericBackButton
      onGenericBack={handleTopRightBack}
      withPaddingX
    >
      {locationLabel && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, textAlign: 'center' }}>
          {locationLabel}
        </Typography>
      )}
      <Calendar
        id="maintenance_calendar_month_view"
        localizer={localizer}
        events={monthEvents}
        date={calendarDate}
        startAccessor="start"
        endAccessor="end"
        views={['month']}
        style={{ height: 720 }}
        onSelectSlot={(slotInfo) => {
          if (slotInfo?.start) {
            handleScheduleClick(slotInfo.start);
          }
        }}
        selectable
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
        onNavigate={handleNavigate}
        components={{ event: BlockingEvent, toolbar: CustomToolbar }}
      />
    </LayoutPage>
  );
};

export default MaintenanceCalendar;
