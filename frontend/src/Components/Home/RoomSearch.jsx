import { useEffect, useRef, useState, useCallback } from 'react';
import {Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Tooltip, TextField, IconButton, Typography} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { getRequest, postRequest, deleteRequest } from '../RequestFunctions/RequestFunctions';
import CreateDatePicker from '../misc/CreateDatePicker';
import CreateTimePicker from '../misc/CreateTimePicker';
import LayoutPage from '../Templates/LayoutPage';
import { FaStar, FaRegStar } from 'react-icons/fa';
import { semanticColors } from '../../theme';

const ROOM_SEARCH_DATE_KEY = 'roomSearchSelectedDate';
const ROOM_SEARCH_START_KEY = 'roomSearchStartTime';
const ROOM_SEARCH_END_KEY = 'roomSearchEndTime';
const ROOM_SEARCH_MIN_DESKS_KEY = 'roomSearchMinDesks';

const parseStoredDate = () => {
  try {
    const raw = sessionStorage.getItem(ROOM_SEARCH_DATE_KEY);
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

const parseStoredPositiveInteger = (key, fallback) => {
  try {
    const raw = sessionStorage.getItem(key);
    const parsed = Number.parseInt(String(raw ?? ''), 10);
    return Number.isInteger(parsed) && parsed >= 1 ? parsed : fallback;
  } catch {
    return fallback;
  }
};

const sortRoomsByFavouriteIds = (list, favouriteRoomIds) => {
  return [...list].sort((a, b) => {
    const aFav = favouriteRoomIds.has(a.id) ? 1 : 0;
    const bFav = favouriteRoomIds.has(b.id) ? 1 : 0;
    if (aFav !== bFav) return bFav - aFav;
    return (a.remark || '').localeCompare(b.remark || '');
  });
};

const RoomSearch = () => {
    const headers = useRef(JSON.parse(sessionStorage.getItem('headers')));
    const favouriteIdsRef = useRef(new Set());
    const { t } = useTranslation();
    const [date, setDate] = useState(() => parseStoredDate());
    const [startTime, setStartTime] = useState(() => parseStoredTime(ROOM_SEARCH_START_KEY));
    const [endTime, setEndTime] = useState(() => parseStoredTime(ROOM_SEARCH_END_KEY));
    const [minimalAmountOfWorkstations, setminimalAmountOfWorkstations] = useState(() => parseStoredPositiveInteger(ROOM_SEARCH_MIN_DESKS_KEY, 1));
    const [rooms, setRooms] = useState([]);
    const [favouriteIds, setFavouriteIds] = useState(new Set());
    const hasCompleteTimeframe = Boolean(date && startTime && endTime && endTime > startTime);

    const userId = localStorage.getItem('userId');

    const refreshFavourites = useCallback(() => {
      if (!userId) return;
      getRequest(
        `${process.env.REACT_APP_BACKEND_URL}/favourites/${userId}`,
        headers.current,
        (data) => {
          const ids = new Set((data || []).map((r) => r.roomId));
          favouriteIdsRef.current = ids;
          setFavouriteIds(ids);
          setRooms((prev) => sortRoomsByFavouriteIds(prev, ids));
        },
        () => {
          favouriteIdsRef.current = new Set();
          setFavouriteIds(new Set());
        }
      );
    }, [userId]);

    useEffect(() => {
      try {
        if (date instanceof Date && !Number.isNaN(date.valueOf())) {
          sessionStorage.setItem(ROOM_SEARCH_DATE_KEY, date.toISOString());
        } else {
          sessionStorage.removeItem(ROOM_SEARCH_DATE_KEY);
        }
      } catch {
        // ignore storage issues
      }
    }, [date]);

    useEffect(() => {
      try {
        if (startTime) {
          sessionStorage.setItem(ROOM_SEARCH_START_KEY, startTime);
        } else {
          sessionStorage.removeItem(ROOM_SEARCH_START_KEY);
        }
      } catch {
        // ignore storage issues
      }
    }, [startTime]);

    useEffect(() => {
      try {
        if (endTime) {
          sessionStorage.setItem(ROOM_SEARCH_END_KEY, endTime);
        } else {
          sessionStorage.removeItem(ROOM_SEARCH_END_KEY);
        }
      } catch {
        // ignore storage issues
      }
    }, [endTime]);

    useEffect(() => {
      try {
        sessionStorage.setItem(ROOM_SEARCH_MIN_DESKS_KEY, String(minimalAmountOfWorkstations));
      } catch {
        // ignore storage issues
      }
    }, [minimalAmountOfWorkstations]);

    useEffect(()=>{
      if (hasCompleteTimeframe) {
        postRequest(
          `${process.env.REACT_APP_BACKEND_URL}/rooms/byMinimalAmountOfWorkstationsAndFreeOnDate/${minimalAmountOfWorkstations}`,
          headers.current,
          (data) => {
            const sorted = sortRoomsByFavouriteIds(data || [], favouriteIdsRef.current);
            setRooms(sorted);
            refreshFavourites();
          },
          () => {console.log('Error fetching rooms in RoomSearch.jsx');},
          JSON.stringify({
            dates: [date],
            startTime,
            endTime
          })
        );
      }
      else {
        getRequest(
          `${process.env.REACT_APP_BACKEND_URL}/rooms/byMinimalAmountOfWorkstations/${minimalAmountOfWorkstations}`,
          headers.current,
          (data) => {
            const sorted = sortRoomsByFavouriteIds(data || [], favouriteIdsRef.current);
            setRooms(sorted);
            refreshFavourites();
          },
          () => {console.log('Error fetching rooms in RoomSearch.jsx');}
        );
      }
    }, [hasCompleteTimeframe, minimalAmountOfWorkstations, date, startTime, endTime, refreshFavourites]);

    const toggleFavourite = (roomId) => {
      if (!userId) return;
      const isFav = favouriteIds.has(roomId);
      const onSuccess = () => {
        const updated = new Set(favouriteIds);
        if (isFav) {
          updated.delete(roomId);
          setRooms((prev) => sortRoomsByFavouriteIds(prev, updated));
        } else {
          updated.add(roomId);
          setRooms((prev) => sortRoomsByFavouriteIds(prev, updated));
        }
        favouriteIdsRef.current = updated;
        setFavouriteIds(updated);
      };
      const onFail = () => refreshFavourites();

      if (isFav) {
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


    function CreateContent() {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, minHeight: 'calc(100vh - 260px)' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, maxWidth: 860 }}>
            <Box id='div_minimalAmountOfWorkstationsInput' sx={{ width: 200 }}>
              <Tooltip title={t('roomSearchMinDesksTooltip')}>
                <TextField
                  id='minimalAmountOfWorkstationsInput'
                  label={t('roomSearchMinDesksLabel')}
                  type='number'
                  variant='outlined'
                  size='small'
                  value={minimalAmountOfWorkstations}
                  onChange={(e) => {
                    const value = parseInt(e.target.value, 10);
                    setminimalAmountOfWorkstations(value < 1 ? minimalAmountOfWorkstations : value);
                  }}
                  inputProps={{ min: 1 }}
                  sx={{ width: '100%' }}
                />
              </Tooltip>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <Box id='roomSearch_date' sx={{ width: 200 }}>
                <CreateDatePicker     
                  date={date}
                  setter={setDate}
                  label={t('date')}
                  required={false}
                  clearable
                  size='small'
                />
              </Box>
              <Box id='roomSearch_startTime' sx={{ width: 200 }}>
                <CreateTimePicker
                  time={startTime}
                  setter={setStartTime}
                  label={t('startTime')}
                  stepSeconds={60}
                  required={false}
                  size='small'
                />
              </Box>
              <Box id='roomSearch_endTime' sx={{ width: 200 }}>
                <CreateTimePicker
                  time={endTime}
                  setter={setEndTime}
                  label={t('endTime')}
                  stepSeconds={60}
                  required={false}
                  size='small'
                />
              </Box>
            </Box>
          </Box>
          {rooms.length > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
              <Typography id='roomSearch_roomsFound' variant='subtitle2'>
                {t('roomsFound', { count: rooms.length })}
              </Typography>
            </Box>
          )}
          <TableContainer
            component={Paper}
            sx={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
            }}
          >
            <Table stickyHeader id='room_table'>
              <TableHead>
                <TableRow key='room_table_header' id='room_table_header'>
                  <TableCell />
                  <TableCell>{t('roomRemark')}</TableCell>
                  <TableCell>{t('building')}</TableCell>
                  <TableCell>{t('floor')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rooms.map(room => (
                  <TableRow key={room.id} id={room.id}>
                    <TableCell padding="checkbox">
                      <IconButton
                        aria-label="favourite"
                        onClick={() => toggleFavourite(room.id)}
                        sx={{ color: favouriteIds.has(room.id) ? semanticColors.booking.favourite.active : semanticColors.booking.favourite.inactive }}
                      >
                        {favouriteIds.has(room.id) ? <FaStar /> : <FaRegStar />}
                      </IconButton>
                    </TableCell>
                    <TableCell id={`${room.id}_remark`}>{room.remark}</TableCell>
                    <TableCell id={`${room.id}_buildingName`}> {room.floor.building.name}</TableCell>
                    <TableCell id={`${room.id}_floorName`}>{room.floor.name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      );
    }

    function create_helpText() {
      return t('roomSearchHelp');
    }

    return (
      <LayoutPage
        title={t('roomSearchTitle')}
        helpText={create_helpText()}
        withPaddingX={true}
      >
        <CreateContent/>
      </LayoutPage>
    );
};

//export default memo(Settings);
export default RoomSearch;
