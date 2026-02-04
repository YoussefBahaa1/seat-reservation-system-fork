import { useEffect, useRef, useState, useCallback } from 'react';
import {Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Tooltip, TextField, Checkbox, FormControlLabel, IconButton} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { getRequest, postRequest, deleteRequest } from '../RequestFunctions/RequestFunctions';
import CreateDatePicker from '../misc/CreateDatePicker';
import CreateTimePicker from '../misc/CreateTimePicker';
import LayoutPage from '../Templates/LayoutPage';
import { FaStar, FaRegStar } from 'react-icons/fa';

const RoomSearch = () => {
    const headers = useRef(JSON.parse(sessionStorage.getItem('headers')));
    const { t, i18n } = useTranslation();
    const [date, setDate] = useState(new Date());
    const defaultStartTime = date.toLocaleTimeString();
    const [startTime, setStartTime] = useState(defaultStartTime);
    // Default endTime is 2 hours ahead.
    const defaultEndTime = date.toLocaleTimeString();
    const [endTime, setEndTime] = useState(defaultEndTime);
    const [onDate, setOnDate] = useState(false);
    const [minimalAmountOfWorkstations, setminimalAmountOfWorkstations] = useState(2);
    const [rooms, setRooms] = useState([]);
    const [favouriteIds, setFavouriteIds] = useState(new Set());

    const userId = localStorage.getItem('userId');

    const refreshFavourites = useCallback(() => {
      if (!userId) return;
      getRequest(
        `${process.env.REACT_APP_BACKEND_URL}/favourites/${userId}`,
        headers.current,
        (data) => {
          const ids = new Set((data || []).map((r) => r.roomId));
          setFavouriteIds(ids);
          setRooms((prev) => sortRooms(prev, ids));
        },
        () => setFavouriteIds(new Set())
      );
    }, [userId]);

    const sortRooms = (list, favSet = favouriteIds) => {
      return [...list].sort((a, b) => {
        const aFav = favSet.has(a.id) ? 1 : 0;
        const bFav = favSet.has(b.id) ? 1 : 0;
        if (aFav !== bFav) return bFav - aFav; // favourites first
        return (a.remark || '').localeCompare(b.remark || '');
      });
    };

    useEffect(()=>{
      // We want to get all free rooms on an fixed date. 
      if (onDate) {
        postRequest(
          `${process.env.REACT_APP_BACKEND_URL}/rooms/byMinimalAmountOfWorkstationsAndFreeOnDate/${minimalAmountOfWorkstations}`,
          headers.current,
          (data) => {
            const sorted = sortRooms(data || []);
            setRooms(sorted);
            refreshFavourites();
          },
          () => {console.log('Error fetching rooms in RoomSearch.jsx');},
          JSON.stringify({
            dates: [date],
            startTime: startTime,
            endTime: endTime
          })
        );
      }
      // We want an overview of all rooms that have an specified amount of workstations.
      else {
        getRequest(
          `${process.env.REACT_APP_BACKEND_URL}/rooms/byMinimalAmountOfWorkstations/${minimalAmountOfWorkstations}`,
          headers.current,
          (data) => {
            const sorted = sortRooms(data || []);
            setRooms(sorted);
            refreshFavourites();
          },
          () => {console.log('Error fetching rooms in RoomSearch.jsx');}
        );
      }
    }, [onDate, minimalAmountOfWorkstations, date, startTime, endTime, refreshFavourites]);

    const toggleFavourite = (roomId) => {
      if (!userId) return;
      const isFav = favouriteIds.has(roomId);
      const onSuccess = () => {
        const updated = new Set(favouriteIds);
        if (isFav) {
          updated.delete(roomId);
          setRooms((prev) => sortRooms(prev, updated));
        } else {
          updated.add(roomId);
          setRooms((prev) => sortRooms(prev, updated));
        }
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
        <>
        <div id='div_minimalAmountOfWorkstationsInput'>
          <Tooltip title={i18n.language === 'de' ? 'Die Mindestanzahl der Arbeitsplätze im Raum' : 'The minimal amount of workstations in room'}>
            <TextField
              id='minimalAmountOfWorkstationsInput'
              label={i18n.language === 'de' ? 'Mindestanzahl der Arbeitsplätze' : 'Minimal amount of desks in room'}
              type='number'
              variant='outlined'
              size='small'
              value={minimalAmountOfWorkstations}
              onChange={(e) => {
                const value = parseInt(e.target.value, 10);
                setminimalAmountOfWorkstations(value < 1 ? minimalAmountOfWorkstations : value);
              }}
              inputProps={{ min: 1 }}
              sx={{ width: '250px' }}
            />
          </Tooltip>
          </div>
          <br/><br/>
          <div>
          <Tooltip title={i18n.language === 'de' ? 'Aktiviere dies um Räume mit n Arbeitsplätzen zu einem festen Datum zu finden.' : 'Enable this to find rooms with n workstations on a fixed date'}>
          <FormControlLabel 
            id='onDate_checkbox'  
            control={
              <Checkbox checked={onDate}   
                onChange={
                  e=>setOnDate(e.target.checked)} 
              />
            } 
            label={i18n.language === 'de' ? 'Zu bestimmten Datum' : 'On an fixed date'} 
            />
            </Tooltip>
            </div>
            <br/><br/>
            <div
              id='roomSearch_date'
            >
              <CreateDatePicker     
                disabledFunc={()=>{return !onDate}}
                date={date}
                setter={setDate}
                label={t('date')}
              />
            </div>
            <br/><br/>
            <div
              id='roomSearch_startTime'
            >
              <CreateTimePicker
                disabledFunc={()=>{return !onDate}}
                time={startTime}
                setter={setStartTime}
                label={t('startTime')}
              />
            </div>
            <br/><br/>
            <div
              id='roomSearch_endTime'
            >
              <CreateTimePicker
                disabledFunc={()=>{return !onDate}}
                time={endTime}
                setter={setEndTime}
                label={t('endTime')}
              />
            </div>
            <br/><br/>
            
            <TableContainer component={Paper} sx={{
              maxHeight: 400, // Set max height
              overflowY: 'auto', // Enable vertical scroll
            }}>
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
                          sx={{ color: favouriteIds.has(room.id) ? '#ffb300' : '#9e9e9e' }}
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
        </>
      );
    }

    function create_helpText() {
      return i18n.language === 'de' ? 'Für eine allgemeine Übersicht wählen Sie die Mindestanazhl an Arbeitsplätzen aus und schauen sie in der unten stehenden Tabelle nach einen passenden Raum.<br/>Wenn Sie überprüfen wollen ob ein Raum mit einer Mindestkapazität noch in einer bestimmten Zeitspanne frei ist, setzen Sie zusätzlich das Häckchen und wählen den Tag sowie Start- und Endzeit aus.' : 'For a general overview, select the minimum number of desks and check the table below for a suitable room.<br/>If you want to check if a room with a minimum capacity is available during a specific time frame, also check the box and select the day as well as the start and end time.'
    }

    return (
      <LayoutPage
        title={i18n.language === 'de' ? 'Raumsuche' : 'Roomsearch'}
        helpText={create_helpText()}
        withPaddingX={true}
      >
        <CreateContent/>
      </LayoutPage>
    );
};

//export default memo(Settings);
export default RoomSearch;
