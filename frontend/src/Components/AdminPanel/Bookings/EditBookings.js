import { Autocomplete, Dialog, FormControl, Grid2, Stack, TextField } from '@mui/material';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import React, { useRef, useState, useCallback } from 'react';
import { useTranslation } from "react-i18next";
import moment from 'moment';
import styled from '@emotion/styled';
import EditBookingModal from './EditBookingsModal';
import BookingTable from './BookingTable';
import {getRequest} from '../../RequestFunctions/RequestFunctions'

export default function EditBookings({ editBookingsModal }) {
  const headers = useRef(JSON.parse(sessionStorage.getItem('headers')));
  const { t } = useTranslation();
  const [date, setDate] = useState('');
  const [isEditBookingOpen, setIsEditBookingOpen] = useState(false);
  const [allActiveRooms, setAllActiveRooms] = useState([]);
  const [selectedRoom, setSelectedRoom]= useState('');
  const [selectedId, setSelectedId]= useState('');
  const [selectedStartTime, setSelectedStartTime] = useState();
  const [selectedEndTime, setSelectedEndTime] = useState('');
  const [allBookings, setAllBookings] = useState([]);
  const getAllActiveRooms = useCallback(
    async () => {
      getRequest(
        `${process.env.REACT_APP_BACKEND_URL}/rooms/status`,
        headers.current,
        setAllActiveRooms,
        () => {console.log('Failed to fetch all rooms in EditBookings.js');},
      );
    },
    [setAllActiveRooms]
  );
  React.useEffect(() => {
    getAllActiveRooms();
  }, [getAllActiveRooms]);

  const handleClose = () => {
    editBookingsModal();
  }

  const toggleEditBookingModal = () => {
    setIsEditBookingOpen(!isEditBookingOpen);
    if (isEditBookingOpen === true) {
      searchBooking();
    }
  }

  function editBookingsById(id, start, end){
    setSelectedId(id);
    setSelectedStartTime(start);
    setSelectedEndTime(end);
    toggleEditBookingModal();
  }

  async function searchBooking(){
    if(selectedRoom){
      let idSplit = selectedRoom.split("(");
      let idVal = idSplit[1].split(")");
      let roomId = idVal[0];
      getRequest(
        `${process.env.REACT_APP_BACKEND_URL}/bookings/room/date/${roomId+"?day="+moment(date).format("YYYY-MM-DD")}`,
        headers.current,
        setAllBookings,
        () => {console.log('Error fetching bookings')},
      );
    }
  }

  const BootstrapWorkstationDialog = styled(Dialog)(({ theme }) => ({
    '& .MuiDialog-paper': {
      minWidth: '500px !important',
      height: 'auto'
    },
  }));

  return (
    <React.Fragment>
      <DialogContent>
          <Grid2 container >
                  <>
            <Stack direction={"row"} style={{padding:"30px"}} width={"100%"}>
            <Autocomplete
              id="tags-filled"
              fullWidth
              options={allActiveRooms.map((option) => (option.floor +"-"+ option.type +"("+option.id+") " + option.remark))}
              value={selectedRoom}
              onChange={(event, newValue) => {
                console.log(newValue);
                setSelectedRoom(newValue);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  fullWidth
                  variant="outlined"
                  size='small' 
                  label={t("selectRoom")}
                  placeholder={t("selectRoom")}
                />
              )}
            />&nbsp;&nbsp;&nbsp;
          
            <FormControl id='editBookings_setDate' required={true} size="small" fullWidth variant="standard">
              <TextField
                id="standard-adornment-reason"
                placeholder={t("date")}
                fullWidth
                size="small"
                type={"date"}
                value={date}
                onChange={(e)=>setDate(e.target.value)}
              />
            </FormControl>&nbsp;&nbsp;&nbsp;
            <Button variant='contained' color='success' onClick={searchBooking}>{t("search").toUpperCase()}</Button>
            </Stack>
            {
              allBookings && allBookings.length > 0 ? (
                <BookingTable  bookings={allBookings} onAction={editBookingsById} action={"EDIT"}/>
              ):<p style={{color: 'red', textAlign:'left'}}>{t("dataNotFound")}</p>
            }   
          </>
        </Grid2>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>&nbsp;{t("close").toUpperCase()}</Button>
      </DialogActions>

      <BootstrapWorkstationDialog onClose={toggleEditBookingModal} aria-labelledby="customized-dialog-title" open={isEditBookingOpen}>
        <EditBookingModal editBookingModal={toggleEditBookingModal} 
          id={selectedId} startTimeFromDb={selectedStartTime} endTimeFromDb={selectedEndTime}
        />
      </BootstrapWorkstationDialog>
    </React.Fragment>
  );
}