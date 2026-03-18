import { useState } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { formatDate_yyyymmdd_to_ddmmyyyy } from '../../misc/formatDate';
import JustificationDialog from './JustificationDialog';
import formatRoleName from './formatRoleName';

const formatTimeValue = (value) => {
  if (!value) return '-';
  return String(value).slice(0, 5);
};

const ParkingBookingListView = ({ bookings, onCancel, onEdit, isLoading = false }) => {
  const { t } = useTranslation();
  const [selectedJustification, setSelectedJustification] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  if (isLoading) {
    return (
      <Paper variant="outlined" sx={{ p: 2 }}>
        {t('loading')}...
      </Paper>
    );
  }

  if (!bookings.length) {
    return (
      <Paper variant="outlined" sx={{ p: 2 }}>
        {t('noBookingsFound')}
      </Paper>
    );
  }

  return (
    <TableContainer component={Paper} variant="outlined" sx={{ width: '100%', maxHeight: 'calc(100vh - 360px)', overflowY: 'auto' }}>
      <Table stickyHeader size="small" sx={{ minWidth: 980 }}>
        <TableHead>
          <TableRow>
            <TableCell>{t('date')}</TableCell>
            <TableCell>{t('startTime')}</TableCell>
            <TableCell>{t('endTime')}</TableCell>
            <TableCell>{t('email')}</TableCell>
            <TableCell>{t('filterName')}</TableCell>
            <TableCell>{t('filterRole')}</TableCell>
            <TableCell>{t('filterDepartment')}</TableCell>
            <TableCell>{t('spotNumber')}</TableCell>
            <TableCell>{t('justification')}</TableCell>
            <TableCell></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {bookings.map((booking) => (
            <TableRow key={booking.id} hover>
              <TableCell>{formatDate_yyyymmdd_to_ddmmyyyy(booking.day)}</TableCell>
              <TableCell>{formatTimeValue(booking.begin)}</TableCell>
              <TableCell>{formatTimeValue(booking.end)}</TableCell>
              <TableCell>{booking.email}</TableCell>
              <TableCell>{[booking.name, booking.surname].filter(Boolean).join(' ') || '-'}</TableCell>
              <TableCell>{formatRoleName(booking.roleName)}</TableCell>
              <TableCell>{booking.department || '-'}</TableCell>
              <TableCell>{booking.spotLabel}</TableCell>
              <TableCell>
                {booking.justification ? (
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => {
                      setSelectedJustification(booking.justification);
                      setDialogOpen(true);
                    }}
                  >
                    {t('viewJustification')}
                  </Button>
                ) : '-'}
              </TableCell>
              <TableCell>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => onEdit(booking)}
                  >
                    {t('editBooking')}
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    variant="outlined"
                    onClick={() => onCancel(booking)}
                  >
                    {t('cancel')}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <JustificationDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        justification={selectedJustification}
      />
    </TableContainer>
  );
};

export default ParkingBookingListView;
