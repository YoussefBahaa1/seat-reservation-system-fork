import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { FaStar } from 'react-icons/fa';

import LayoutPage from '../Templates/LayoutPage.jsx';
import { deleteRequest, getRequest, postRequest } from '../RequestFunctions/RequestFunctions';
import CreateDatePicker from '../misc/CreateDatePicker.jsx';
import CreateTimePicker from '../misc/CreateTimePicker.jsx';
import { colorVars, semanticColors } from '../../theme';

const FAVOURITES_FILTER_DATE_KEY = 'favouritesSelectedDate';
const FAVOURITES_FILTER_START_KEY = 'favouritesStartTime';
const FAVOURITES_FILTER_END_KEY = 'favouritesEndTime';

const toSentenceCase = (value) => {
  const normalized = String(value || '').toLowerCase();
  if (!normalized) return '';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const formatSpotType = (spotType, t) => {
  const value = String(spotType || '').toUpperCase();
  if (value === 'STANDARD') return t('carparkStandard');
  if (value === 'SPECIAL_CASE') return t('carparkSpecialCase');
  if (value === 'ACCESSIBLE') return t('carparkAccessible');
  if (value === 'E_CHARGING_STATION') return toSentenceCase(value.replaceAll('_', ' '));
  return toSentenceCase(value.replaceAll('_', ' '));
};

const parseTimeToMinutes = (timeValue) => {
  if (!timeValue) return NaN;
  const [hh, mm] = String(timeValue).split(':');
  const hours = Number.parseInt(hh, 10);
  const minutes = Number.parseInt(mm, 10);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return NaN;
  return hours * 60 + minutes;
};

const formatDateValue = (value) => {
  if (!(value instanceof Date) || Number.isNaN(value.valueOf())) return '';
  const yyyy = value.getFullYear();
  const mm = String(value.getMonth() + 1).padStart(2, '0');
  const dd = String(value.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const buildIsoDateTime = (date, time) => {
  if (!(date instanceof Date) || Number.isNaN(date.valueOf()) || !time) return null;
  const normalizedTime = String(time).trim().length === 5 ? `${String(time).trim()}:00` : String(time).trim();
  const parsed = new Date(`${formatDateValue(date)}T${normalizedTime}`);
  return Number.isNaN(parsed.valueOf()) ? null : parsed.toISOString();
};

const parseStoredDate = () => {
  try {
    const raw = sessionStorage.getItem(FAVOURITES_FILTER_DATE_KEY);
    if (!raw) return null;
    const parsed = new Date(raw);
    return Number.isNaN(parsed.valueOf()) ? null : parsed;
  } catch {
    return null;
  }
};

const parseStoredTime = (key) => {
  try {
    return sessionStorage.getItem(key) || '';
  } catch {
    return '';
  }
};

const Favourites = () => {
  const { t } = useTranslation();
  const headers = useRef(JSON.parse(sessionStorage.getItem('headers')));
  const navigate = useNavigate();
  const userId = localStorage.getItem('userId');

  const [rooms, setRooms] = useState([]);
  const [parkings, setParkings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => parseStoredDate());
  const [startTime, setStartTime] = useState(() => parseStoredTime(FAVOURITES_FILTER_START_KEY));
  const [endTime, setEndTime] = useState(() => parseStoredTime(FAVOURITES_FILTER_END_KEY));
  const [roomAvailabilityById, setRoomAvailabilityById] = useState(new Map());
  const [parkingAvailabilityByLabel, setParkingAvailabilityByLabel] = useState(new Map());

  const isTimeframeActive = useMemo(() => {
    if (!(selectedDate instanceof Date) || Number.isNaN(selectedDate.valueOf())) return false;
    const startMinutes = parseTimeToMinutes(startTime);
    const endMinutes = parseTimeToMinutes(endTime);
    return Number.isFinite(startMinutes) && Number.isFinite(endMinutes) && endMinutes > startMinutes;
  }, [endTime, selectedDate, startTime]);

  const loadFavourites = useCallback(() => {
    if (!userId) return;
    setLoading(true);
    let remainingRequests = 2;
    const finish = () => {
      remainingRequests -= 1;
      if (remainingRequests <= 0) {
        setLoading(false);
      }
    };

    getRequest(
      `${process.env.REACT_APP_BACKEND_URL}/favourites/${userId}`,
      headers.current,
      (data) => {
        setRooms(Array.isArray(data) ? data : []);
        finish();
      },
      () => {
        setRooms([]);
        finish();
      }
    );

    getRequest(
      `${process.env.REACT_APP_BACKEND_URL}/favourites/${userId}/parking`,
      headers.current,
      (data) => {
        setParkings(Array.isArray(data) ? data : []);
        finish();
      },
      () => {
        setParkings([]);
        finish();
      }
    );
  }, [userId]);

  useEffect(() => {
    loadFavourites();
  }, [loadFavourites]);

  useEffect(() => {
    try {
      if (selectedDate instanceof Date && !Number.isNaN(selectedDate.valueOf())) {
        sessionStorage.setItem(FAVOURITES_FILTER_DATE_KEY, selectedDate.toISOString());
      } else {
        sessionStorage.removeItem(FAVOURITES_FILTER_DATE_KEY);
      }
    } catch {
      // ignore storage issues
    }
  }, [selectedDate]);

  useEffect(() => {
    try {
      if (startTime) {
        sessionStorage.setItem(FAVOURITES_FILTER_START_KEY, startTime);
      } else {
        sessionStorage.removeItem(FAVOURITES_FILTER_START_KEY);
      }
    } catch {
      // ignore storage issues
    }
  }, [startTime]);

  useEffect(() => {
    try {
      if (endTime) {
        sessionStorage.setItem(FAVOURITES_FILTER_END_KEY, endTime);
      } else {
        sessionStorage.removeItem(FAVOURITES_FILTER_END_KEY);
      }
    } catch {
      // ignore storage issues
    }
  }, [endTime]);

  useEffect(() => {
    if (!isTimeframeActive) {
      setRoomAvailabilityById(new Map());
      setParkingAvailabilityByLabel(new Map());
      return;
    }

    postRequest(
      `${process.env.REACT_APP_BACKEND_URL}/series/desksForDatesAndTimes`,
      headers.current,
      (data) => {
        const nextRoomAvailability = new Map();
        (Array.isArray(data) ? data : []).forEach((desk) => {
          const roomId = desk?.room?.id;
          if (roomId != null) {
            nextRoomAvailability.set(String(roomId), true);
          }
        });
        setRoomAvailabilityById(nextRoomAvailability);
      },
      () => setRoomAvailabilityById(new Map()),
      JSON.stringify({
        dates: [selectedDate],
        startTime,
        endTime,
      })
    );

    if (!parkings.length) {
      setParkingAvailabilityByLabel(new Map());
      return;
    }

    postRequest(
      `${process.env.REACT_APP_BACKEND_URL}/parking/availability`,
      headers.current,
      (data) => {
        const nextParkingAvailability = new Map();
        (Array.isArray(data) ? data : []).forEach((row) => {
          nextParkingAvailability.set(String(row?.spotLabel || ''), String(row?.status || '').toUpperCase() === 'AVAILABLE');
        });
        setParkingAvailabilityByLabel(nextParkingAvailability);
      },
      () => setParkingAvailabilityByLabel(new Map()),
      {
        spotLabels: parkings.map((parking) => parking.spotLabel),
        day: formatDateValue(selectedDate),
        begin: `${startTime}:00`,
        end: `${endTime}:00`,
      }
    );
  }, [endTime, headers, isTimeframeActive, parkings, selectedDate, startTime]);

  const resetFilters = () => {
    setSelectedDate(null);
    setStartTime('');
    setEndTime('');
  };

  const removeRoomFavourite = (roomId) => {
    if (!userId) return;
    deleteRequest(
      `${process.env.REACT_APP_BACKEND_URL}/favourites/${userId}/room/${roomId}`,
      headers.current,
      () => {
        toast.success(t('removeFavourite'));
        setRooms((prev) => prev.filter((room) => room.roomId !== roomId));
      },
      () => toast.error(t('favouriteToggleError'))
    );
  };

  const removeParkingFavourite = (spotLabel) => {
    if (!userId) return;
    deleteRequest(
      `${process.env.REACT_APP_BACKEND_URL}/favourites/${userId}/parking/${encodeURIComponent(spotLabel)}`,
      headers.current,
      () => {
        toast.success(t('removeFavourite'));
        setParkings((prev) => prev.filter((parking) => parking.spotLabel !== spotLabel));
      },
      () => toast.error(t('favouriteToggleError'))
    );
  };

  const goToRoomBooking = (room) => {
    if (!isTimeframeActive) {
      navigate('/desks', { state: { roomId: room.roomId, date: new Date() } });
      return;
    }

    const nextState = {
      roomId: room.roomId,
      date: selectedDate,
    };
    if (roomAvailabilityById.get(String(room.roomId))) {
      const start = buildIsoDateTime(selectedDate, startTime);
      const end = buildIsoDateTime(selectedDate, endTime);
      if (start && end) {
        nextState.preferredSlot = { start, end };
      }
    }
    navigate('/desks', { state: nextState });
  };

  const goToParkingBooking = (parking) => {
    if (!isTimeframeActive) {
      navigate('/carpark', { state: { spotLabel: parking.spotLabel } });
      return;
    }

    const isAvailable = parkingAvailabilityByLabel.get(String(parking.spotLabel)) === true;
    navigate('/carpark', {
      state: {
        spotLabel: parking.spotLabel,
        date: selectedDate,
        ...(isAvailable
          ? {
              preferredTimeRange: {
                startTime,
                endTime,
              },
              applyExplicitTimeSelection: true,
            }
          : {
              applyExplicitTimeSelection: false,
            }),
      },
    });
  };

  const getStatusChip = (isAvailable) => (
    <Chip
      size="small"
      label={isAvailable ? t('favouritesAvailable') : t('favouritesUnavailable')}
      sx={{
        mr: 0.75,
        backgroundColor: isAvailable ? semanticColors.carpark.status.AVAILABLE : semanticColors.carpark.status.OCCUPIED,
        color: colorVars.text.inverse,
        fontWeight: 600,
      }}
    />
  );

  const getCardStyles = (isAvailable) => ({
    borderRadius: 2,
    boxShadow: colorVars.shadow.card,
    borderLeft: `6px solid ${isAvailable ? semanticColors.carpark.status.AVAILABLE : semanticColors.carpark.status.OCCUPIED}`,
    backgroundColor: isAvailable ? 'rgba(105, 190, 40, 0.10)' : 'rgba(198, 40, 40, 0.08)',
  });

  const renderRoomCards = () => {
    if (loading) return <Typography>{t('loading')}...</Typography>;
    if (!rooms.length) {
      return (
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          {t('favouritesEmpty')}
        </Typography>
      );
    }

    return (
      <Stack spacing={2}>
        {rooms.map((room) => {
          const isAvailable = roomAvailabilityById.get(String(room.roomId)) === true;
          return (
            <Card
              key={room.roomId}
              variant="outlined"
              sx={isTimeframeActive ? getCardStyles(isAvailable) : { borderRadius: 2, boxShadow: colorVars.shadow.card }}
            >
              <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                  <Typography variant="h6">{room.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {room.building}{room.building && room.floor ? ' · ' : ''}{room.floor}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    {isTimeframeActive && getStatusChip(isAvailable)}
                    <Button
                      id={`favourites_room_book_${room.roomId}`}
                      variant="contained"
                      onClick={() => goToRoomBooking(room)}
                      sx={{
                        backgroundColor: colorVars.brand.accent,
                        borderRadius: '8px',
                        color: colorVars.text.inverse,
                        px: 2.5,
                        '&:hover': { backgroundColor: colorVars.brand.primaryPressed },
                      }}
                    >
                      {t('book')}
                    </Button>
                    <Tooltip title={t('removeFavourite')}>
                      <IconButton color="warning" onClick={() => removeRoomFavourite(room.roomId)}>
                        <FaStar />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Box>
              </CardContent>
            </Card>
          );
        })}
      </Stack>
    );
  };

  const renderParkingCards = () => {
    if (loading) return <Typography>{t('loading')}...</Typography>;
    if (!parkings.length) {
      return (
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          {t('favouritesParkingEmpty')}
        </Typography>
      );
    }

    return (
      <Stack spacing={2}>
        {parkings.map((parking) => {
          const isAvailable = parkingAvailabilityByLabel.get(String(parking.spotLabel)) === true;
          return (
            <Card
              key={parking.spotLabel}
              variant="outlined"
              sx={isTimeframeActive ? getCardStyles(isAvailable) : { borderRadius: 2, boxShadow: colorVars.shadow.card }}
            >
              <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                  <Typography variant="h6">
                    {t('favouritesParkingSpotName', { spot: parking.displayLabel || parking.spotLabel })}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('carparkType')}: {formatSpotType(parking.spotType, t)} · {t('carparkCovered')}: {parking.covered ? t('carparkYes') : t('carparkNo')}
                  </Typography>
                  {parking.chargingKw != null && (
                    <Typography variant="body2" color="text.secondary">
                      {t('carparkChargingKw')}: {parking.chargingKw}
                    </Typography>
                  )}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    {isTimeframeActive && getStatusChip(isAvailable)}
                    <Button
                      variant="contained"
                      onClick={() => goToParkingBooking(parking)}
                      sx={{
                        backgroundColor: colorVars.brand.accent,
                        borderRadius: '8px',
                        color: colorVars.text.inverse,
                        px: 2.5,
                        '&:hover': { backgroundColor: colorVars.brand.primaryPressed },
                      }}
                    >
                      {t('book')}
                    </Button>
                    <Tooltip title={t('removeFavourite')}>
                      <IconButton color="warning" onClick={() => removeParkingFavourite(parking.spotLabel)}>
                        <FaStar />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Box>
              </CardContent>
            </Card>
          );
        })}
      </Stack>
    );
  };

  return (
    <LayoutPage
      title={t('favourites')}
      helpText={t('favouritesHelper')}
      withPaddingX
      useGenericBackButton
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, px: 2 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-end' }}>
          <Box id="favourites_date" sx={{ minWidth: 220, flex: '1 1 220px' }}>
            <CreateDatePicker
              date={selectedDate}
              setter={setSelectedDate}
              label={t('date')}
              required={false}
              clearable
              size="small"
            />
          </Box>
          <Box id="favourites_startTime" sx={{ minWidth: 180, flex: '1 1 180px' }}>
            <CreateTimePicker
              time={startTime}
              setter={setStartTime}
              label={t('startTime')}
              required={false}
              stepSeconds={1800}
              size="small"
            />
          </Box>
          <Box id="favourites_endTime" sx={{ minWidth: 180, flex: '1 1 180px' }}>
            <CreateTimePicker
              time={endTime}
              setter={setEndTime}
              label={t('endTime')}
              required={false}
              stepSeconds={1800}
              size="small"
            />
          </Box>
          <Button variant="outlined" onClick={resetFilters}>
            Reset
          </Button>
        </Box>

        <Box>
          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
            {t('rooms')}
          </Typography>
          {renderRoomCards()}
        </Box>
        <Divider />
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
            {t('parking')}
          </Typography>
          {renderParkingCards()}
        </Box>
      </Box>
    </LayoutPage>
  );
};

export default Favourites;
