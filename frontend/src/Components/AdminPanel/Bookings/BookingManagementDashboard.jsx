import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Box, Paper, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { getRequest } from '../../RequestFunctions/RequestFunctions';
import BookingFilters, { getBookingFilterFields } from './BookingFilters';
import DeskBookingListView from './DeskBookingListView';
import ParkingBookingListView from './ParkingBookingListView';
import ParkingRequestsView from './ParkingRequestsView';
import CancellationDialog from './CancellationDialog';
import EditBookingDialog from './EditBookingDialog';

const normalizeDateValue = (value) => {
  if (!value) {
    return '';
  }
  return String(value).slice(0, 10);
};

const normalizeTimeValue = (value) => {
  if (!value) {
    return '';
  }
  return String(value).slice(0, 5);
};

const toTimeMinutes = (value) => {
  const normalized = normalizeTimeValue(value);
  if (!normalized.includes(':')) {
    return null;
  }

  const [hours, minutes] = normalized.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  return (hours * 60) + minutes;
};

const getFilterCandidateValue = (item, key) => {
  if (key === 'name') {
    return [item?.name, item?.surname].filter(Boolean).join(' ');
  }
  return item?.[key];
};

const valueMatchesFilter = (itemValue, filterValue, field) => {
  if (!filterValue) {
    return true;
  }

  if (field.type === 'select') {
    return String(itemValue || '') === String(filterValue);
  }

  if (field.type === 'date') {
    return normalizeDateValue(itemValue) === filterValue;
  }

  if (field.type === 'time') {
    const itemMinutes = toTimeMinutes(itemValue);
    const filterMinutes = toTimeMinutes(filterValue);

    if (itemMinutes === null || filterMinutes === null) {
      return false;
    }

    if (field.key === 'begin') {
      return itemMinutes >= filterMinutes;
    }

    if (field.key === 'end') {
      return itemMinutes <= filterMinutes;
    }
  }

  return String(itemValue || '').toLowerCase().includes(String(filterValue).toLowerCase());
};

const applyFilters = (data, fields, currentFilters) => {
  if (!currentFilters || Object.keys(currentFilters).length === 0) {
    return data;
  }

  return data.filter((item) => (
    fields.every((field) => (
      valueMatchesFilter(getFilterCandidateValue(item, field.key), currentFilters[field.key], field)
    ))
  ));
};

const BookingManagementDashboard = () => {
  const { t } = useTranslation();
  const headers = useRef(JSON.parse(sessionStorage.getItem('headers')));

  const [bookingViewMode, setBookingViewMode] = useState('desks');
  const [deskBookings, setDeskBookings] = useState([]);
  const [parkingBookings, setParkingBookings] = useState([]);
  const [deskBookingsLoading, setDeskBookingsLoading] = useState(false);
  const [parkingBookingsLoading, setParkingBookingsLoading] = useState(false);
  const [pendingParkingCount, setPendingParkingCount] = useState(0);
  const pendingParkingCountRef = useRef(0);
  const hasLoadedDeskBookingsRef = useRef(false);
  const hasLoadedParkingBookingsRef = useRef(false);

  const [deskFilters, setDeskFilters] = useState({});
  const [parkingFilters, setParkingFilters] = useState({});
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [cancelType, setCancelType] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editType, setEditType] = useState(null);

  const deskFilterFields = useMemo(() => getBookingFilterFields('desks'), []);
  const parkingFilterFields = useMemo(() => getBookingFilterFields('parkings'), []);

  const deskLocationOptions = useMemo(() => {
    const building = deskFilters.building || '';
    const roomRemark = deskFilters.roomRemark || '';

    const bookingsForBuilding = building
      ? deskBookings.filter((booking) => String(booking?.building || '') === String(building))
      : deskBookings;

    const bookingsForRoom = roomRemark
      ? bookingsForBuilding.filter((booking) => String(booking?.roomRemark || '') === String(roomRemark))
      : bookingsForBuilding;

    return {
      buildings: deskBookings
        .map((booking) => booking?.building)
        .filter(Boolean)
        .sort((a, b) => String(a).localeCompare(String(b))),
      roles: deskBookings
        .map((booking) => booking?.roleName)
        .filter(Boolean)
        .sort((a, b) => String(a).localeCompare(String(b))),
      rooms: bookingsForBuilding
        .map((booking) => booking?.roomRemark)
        .filter(Boolean)
        .sort((a, b) => String(a).localeCompare(String(b))),
      desks: bookingsForRoom
        .map((booking) => booking?.deskRemark)
        .filter(Boolean)
        .sort((a, b) => String(a).localeCompare(String(b))),
    };
  }, [deskBookings, deskFilters.building, deskFilters.roomRemark]);

  const parkingFilterOptions = useMemo(() => ({
    roles: parkingBookings
      .map((booking) => booking?.roleName)
      .filter(Boolean)
      .sort((a, b) => String(a).localeCompare(String(b))),
    spotLabels: parkingBookings
      .map((booking) => booking?.spotLabel)
      .filter(Boolean)
      .sort((a, b) => String(a).localeCompare(String(b))),
  }), [parkingBookings]);

  const fetchDeskBookings = useCallback(() => {
    setDeskBookingsLoading(true);
    getRequest(
      `${process.env.REACT_APP_BACKEND_URL}/admin/bookingFor`,
      headers.current,
      (data) => {
        setDeskBookings(Array.isArray(data) ? data : []);
        hasLoadedDeskBookingsRef.current = true;
        setDeskBookingsLoading(false);
      },
      () => {
        setDeskBookingsLoading(false);
        toast.error(t('httpOther'));
      }
    );
  }, [t]);

  const fetchParkingBookings = useCallback(() => {
    setParkingBookingsLoading(true);
    getRequest(
      `${process.env.REACT_APP_BACKEND_URL}/admin/parkingBookings`,
      headers.current,
      (data) => {
        setParkingBookings(Array.isArray(data) ? data : []);
        hasLoadedParkingBookingsRef.current = true;
        setParkingBookingsLoading(false);
      },
      () => {
        setParkingBookingsLoading(false);
        toast.error(t('httpOther'));
      }
    );
  }, [t]);

  const refreshPendingParkingCount = useCallback(() => {
    getRequest(
      `${process.env.REACT_APP_BACKEND_URL}/parking/review/pending/count`,
      headers.current,
      (count) => {
        const nextCount = Number.isFinite(Number(count)) ? Number(count) : 0;
        if (nextCount > pendingParkingCountRef.current) {
          toast.info(t('parkingReviewPendingCount', { count: nextCount }));
        }
        pendingParkingCountRef.current = nextCount;
        setPendingParkingCount(nextCount);
      },
      () => {}
    );
  }, [t]);

  useEffect(() => {
    if (bookingViewMode === 'desks' && !hasLoadedDeskBookingsRef.current && !deskBookingsLoading) {
      fetchDeskBookings();
    }

    if (bookingViewMode === 'parkings' && !hasLoadedParkingBookingsRef.current && !parkingBookingsLoading) {
      fetchParkingBookings();
    }
  }, [
    bookingViewMode,
    deskBookingsLoading,
    fetchDeskBookings,
    fetchParkingBookings,
    parkingBookingsLoading,
  ]);

  useEffect(() => {
    let timer = null;

    const stopPolling = () => {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    };

    const startPolling = () => {
      stopPolling();
      if (document.visibilityState === 'visible') {
        refreshPendingParkingCount();
        timer = setInterval(refreshPendingParkingCount, 30000);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        startPolling();
      } else {
        stopPolling();
      }
    };

    startPolling();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshPendingParkingCount]);

  const handleCancelBooking = (booking, type) => {
    setSelectedBooking(booking);
    setCancelType(type);
    setCancelDialogOpen(true);
  };

  const handleEditBooking = (booking, type) => {
    setSelectedBooking(booking);
    setEditType(type);
    setEditDialogOpen(true);
  };

  const handleCancelComplete = () => {
    setCancelDialogOpen(false);
    setSelectedBooking(null);
    setCancelType(null);

    if (bookingViewMode === 'desks') {
      fetchDeskBookings();
    } else if (bookingViewMode === 'parkings') {
      fetchParkingBookings();
    }
  };

  const handleEditComplete = () => {
    setEditDialogOpen(false);
    setSelectedBooking(null);
    setEditType(null);

    if (bookingViewMode === 'desks') {
      fetchDeskBookings();
    } else if (bookingViewMode === 'parkings') {
      fetchParkingBookings();
    }
  };

  const activeFilters = bookingViewMode === 'desks' ? deskFilters : parkingFilters;
  const setActiveFilters = bookingViewMode === 'desks' ? setDeskFilters : setParkingFilters;
  const resetActiveFilters = () => {
    if (bookingViewMode === 'desks') {
      setDeskFilters({});
      return;
    }
    setParkingFilters({});
  };

  const filteredDeskBookings = useMemo(
    () => applyFilters(deskBookings, deskFilterFields, deskFilters),
    [deskBookings, deskFilterFields, deskFilters]
  );
  const filteredParkingBookings = useMemo(
    () => applyFilters(parkingBookings, parkingFilterFields, parkingFilters),
    [parkingBookings, parkingFilterFields, parkingFilters]
  );

  const currentTitle = bookingViewMode === 'desks'
    ? t('bookingViewDesks')
    : bookingViewMode === 'parkings'
      ? t('bookingViewParkings')
      : t('bookingViewRequests');

  const currentDescription = bookingViewMode === 'desks'
    ? t('bookingManagementDeskHelper')
    : bookingViewMode === 'parkings'
      ? t('bookingManagementParkingHelper')
      : t('bookingManagementRequestsHelper');

  return (
    <>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
            <Box>
              <Typography variant="h6">{currentTitle}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {currentDescription}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <ToggleButtonGroup
                size="small"
                value={bookingViewMode}
                exclusive
                onChange={(_, value) => {
                  if (value) {
                    setBookingViewMode(value);
                  }
                }}
              >
                <ToggleButton value="desks">{t('bookingViewDesks')}</ToggleButton>
                <ToggleButton value="parkings">{t('bookingViewParkings')}</ToggleButton>
                <ToggleButton value="requests">
                  {t('bookingViewRequests')}{pendingParkingCount > 0 ? ` (${pendingParkingCount})` : ''}
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Box>
        </Paper>

        {bookingViewMode !== 'requests' && (
          <Paper variant="outlined" sx={{ p: 2 }}>
            <BookingFilters
              viewMode={bookingViewMode}
              filters={activeFilters}
              setFilters={setActiveFilters}
              onReset={resetActiveFilters}
              selectOptions={bookingViewMode === 'desks' ? deskLocationOptions : parkingFilterOptions}
            />
          </Paper>
        )}

        {bookingViewMode === 'desks' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, width: '100%' }}>
            <Typography variant="body2">{t('resultsShown', { count: filteredDeskBookings.length })}</Typography>
            <DeskBookingListView
              bookings={filteredDeskBookings}
              isLoading={deskBookingsLoading}
              onEdit={(booking) => handleEditBooking(booking, 'desk')}
              onCancel={(booking) => handleCancelBooking(booking, 'desk')}
            />
          </Box>
        )}

        {bookingViewMode === 'parkings' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, width: '100%' }}>
            <Typography variant="body2">{t('resultsShown', { count: filteredParkingBookings.length })}</Typography>
            <ParkingBookingListView
              bookings={filteredParkingBookings}
              isLoading={parkingBookingsLoading}
              onEdit={(booking) => handleEditBooking(booking, 'parking')}
              onCancel={(booking) => handleCancelBooking(booking, 'parking')}
            />
          </Box>
        )}

        {bookingViewMode === 'requests' && (
          <ParkingRequestsView onChanged={refreshPendingParkingCount} />
        )}
      </Box>

      <CancellationDialog
        open={cancelDialogOpen}
        onClose={() => {
          setCancelDialogOpen(false);
          setSelectedBooking(null);
          setCancelType(null);
        }}
        onConfirm={handleCancelComplete}
        booking={selectedBooking}
        type={cancelType}
      />
      <EditBookingDialog
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setSelectedBooking(null);
          setEditType(null);
        }}
        onConfirm={handleEditComplete}
        booking={selectedBooking}
        type={editType}
      />
    </>
  );
};

export default BookingManagementDashboard;
