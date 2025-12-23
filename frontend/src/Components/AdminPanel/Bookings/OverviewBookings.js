import { InputLabel, Select, MenuItem, FormControl, TextField } from '@mui/material';
import { toast } from 'react-toastify';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDate_yyyymmdd_to_ddmmyyyy, formatDate_ddmmyyyy_to_yyyymmdd } from '../../misc/formatDate';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button
} from '@mui/material';
//import LayoutModal from '../../Templates/LayoutModal';
import LayoutModalAdmin from '../../Templates/LayoutModalAdmin';
import {deleteRequest, getRequest} from '../../RequestFunctions/RequestFunctions'

export default function OverviewBookings({ isOpen, onClose }) {
  const headers = useRef(JSON.parse(sessionStorage.getItem('headers')));
  const { t } = useTranslation();
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState('');
  const [text, setText] = useState('');
  
  const getBookings = useCallback(
    async () => {
      if (filter !== '' && text === '')
          return;
        let filter_text = text;

        if (filter === '/singledate/') {
          const text_split = text.split('.');
          if (text_split.length === 3) {
            filter_text = formatDate_ddmmyyyy_to_yyyymmdd(text);
          }
          else if (text_split.length === 2) {
            filter_text = `${text_split[1]}-${text_split[0]}`;
          }
        }
        const url = `${process.env.REACT_APP_BACKEND_URL}/admin/bookingFor${filter}${filter_text}`;
        getRequest(
          url,
          headers.current,
          setBookings,
          () => {console.log('Failed to fetch  bookings in OverviewBookings.js')}
        );
        
      },
      [setBookings, filter, text]
    );

    // Init fetch of all bookings.
    useEffect(() => {
      getBookings();
    }, [getBookings]);      

    function deleteBooking(bookingId) {
      deleteRequest(
        `${process.env.REACT_APP_BACKEND_URL}/admin/deleteBooking/${bookingId}`,
        headers.current,
        () => {
          toast.success(t('bookingDeleted'));
          getBookings();
        },
        () => {console.log('Error deleting bookings.')}
      );
    }

    return (
      <LayoutModalAdmin
        title={t('overviewBooking')}
        onClose={onClose}
        isOpen={isOpen}
      >
        <div id='filter-settings' style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem' }}>
              <FormControl id='overviewBookings_setFilter' variant='outlined' fullWidth disabled={false}>
                <InputLabel>Filter</InputLabel>
                  <Select
                    value={filter}
                    id='filter_overviewbooking'
                    onChange={(event)=>{
                      if (event.target.value === '')
                        setText('');  
                      setFilter(event.target.value);
                    }}
                    label={'Filter'}
                  >
                      <MenuItem value=''>-</MenuItem>
                      <MenuItem value='/email/'>Email</MenuItem>
                      <MenuItem value='/singledate/'>{t('date')}</MenuItem>
                      <MenuItem value='/deskRemark/'>{t('deskRemark')}</MenuItem>
                      <MenuItem value='/roomRemark/'>{t('roomRemark')}</MenuItem>
                    </Select>
                </FormControl>
                <FormControl id='textfield_overviewbooking' variant='outlined' fullWidth disabled={'' === filter}>
                  <TextField
                    placeholder={t('enterText')}
                    value={text}
                    onChange={(event)=>{setText(event.target.value)}}
                  />
                </FormControl>
            </div>
            <div>
            <label>{t('bookingsSum') + ': ' + bookings.length}</label>   
            </div>
            <TableContainer component={Paper} sx={{
              maxHeight: 1000, // Set max height
              overflowY: 'auto', // Enable vertical scroll
            }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('date')}</TableCell>
                    <TableCell>{t('startTime')}</TableCell>
                    <TableCell>{t('endTime')}</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>{t('deskRemark')}</TableCell>
                    <TableCell>{t('roomRemark')}</TableCell>
                    <TableCell>{t('building')}</TableCell>
                    <TableCell>{t('seriesId')}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {
                    bookings.map((booking) => (
                      <TableRow key={`${booking.booking_id}`}>
                        <TableCell>{formatDate_yyyymmdd_to_ddmmyyyy(booking.day)}</TableCell>
                        <TableCell>{booking.begin}</TableCell>
                        <TableCell>{booking.end}</TableCell>
                        <TableCell>{booking.email}</TableCell>
                        <TableCell>{booking.deskRemark}</TableCell>
                        <TableCell>{booking.roomRemark}</TableCell>
                        <TableCell>{booking.building}</TableCell>
                        <TableCell>{booking.seriesId !== '' ? booking.seriesId : '-'}</TableCell>
                        <TableCell><Button id={`bnt_delete_${booking.booking_id}`} onClick={deleteBooking.bind(null,booking.booking_id)}>{t('delete')}</Button></TableCell>
                      </TableRow>
                    ))
                  }
                </TableBody>
              </Table>
            </TableContainer>
            </LayoutModalAdmin>
    );
}