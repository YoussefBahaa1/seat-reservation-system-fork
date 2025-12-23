import { FormControl, Grid, TextField } from '@mui/material';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import * as React from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from "react-i18next";
import moment from 'moment';
import {putRequest} from '../../RequestFunctions/RequestFunctions';

export default function EditBookingModal({ editBookingModal, id, startTimeFromDb, endTimeFromDb, onSuccess }) {
  const headers = JSON.parse(sessionStorage.getItem('headers'));
  const { t } = useTranslation();
  const [startTime, setStartTime] = React.useState("ttt");
  const [endTime, setEndTime] = React.useState("fff");
  const handleCloseBtn = () => {
    editBookingModal();
  }

  async function updateBooking(){
    console.log(moment(startTime, "HH:mm:ss a").format("HH:mm:ss"), moment(endTime, "HH:mm:ss a").format("HH:mm:ss"));
    if(!startTime  || !endTime){
      toast.error("Fields cannot be blank!");
      return false;
    }
    
    putRequest(
      `${process.env.REACT_APP_BACKEND_URL}/bookings/edit/timings`,
      headers,
      JSON.stringify({
        "begin": moment(startTime, "HH:mm:ss a").format("HH:mm:ss"),
        "end": moment(endTime, "HH:mm:ss a").format("HH:mm:ss"),
        "id": id
      }),
      () => {
        toast.success(t('bookingUpdated'));
        editBookingModal();
        onSuccess();
      },
      () => {
        console.log('Failing to update timing of booking.');
      }
    );
  }
    
  return (
    <React.Fragment>
      <DialogContent>
        <Grid container >
          <Box sx={{ flexGrow: 1, padding: '10px' }}>
            <br></br>
            <FormControl id='editBookingsModal_setStartTime' required={true} size="small" fullWidth variant="standard">
              <TextField
                id="standard-adornment-reason"
                label={t("begin")}
                size="small"
                type={"time"}
                value={startTime}
                onChange={(e)=>setStartTime(e.target.value)}
              />
            </FormControl>
            <br></br><br></br>
            <FormControl id='editBookingsModal_setEndTime' required={true} size="small" fullWidth variant="standard">
              <TextField
                id="standard-adornment-reason"
                label={t("end")}
                size="small"
                type={"time"}
                value={endTime}
                onChange={(e)=>setEndTime(e.target.value)}
              />
            </FormControl>
          </Box>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={()=>updateBooking()}>&nbsp;{t("update").toUpperCase()}</Button>
        <Button onClick={handleCloseBtn}>&nbsp;{t("cancel").toUpperCase()}</Button>
      </DialogActions>
    </React.Fragment>
  );
}