import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { deleteRequest } from '../../RequestFunctions/RequestFunctions';

const CancellationDialog = ({ open, onClose, onConfirm, booking, type }) => {
  const { t } = useTranslation();
  const [justification, setJustification] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const headers = JSON.parse(sessionStorage.getItem('headers'));

  const handleConfirm = () => {
    if (!justification.trim()) return;
    setSubmitting(true);

    const bookingId = type === 'desk' ? booking.booking_id : booking.id;
    const url = type === 'desk'
      ? `${process.env.REACT_APP_BACKEND_URL}/admin/cancelBooking/${bookingId}`
      : `${process.env.REACT_APP_BACKEND_URL}/admin/cancelParkingReservation/${bookingId}`;

    deleteRequest(
      url,
      headers,
      () => {
        toast.success(t('cancelBookingSuccess'));
        setJustification('');
        setSubmitting(false);
        onConfirm();
      },
      () => {
        toast.error(t('httpOther'));
        setSubmitting(false);
      },
      JSON.stringify({ justification: justification.trim() })
    );
  };

  const handleClose = () => {
    if (submitting) return;
    setJustification('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth disableEscapeKeyDown={submitting}>
      <DialogTitle>{t('cancelBooking')}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label={t('cancelBookingJustification')}
          fullWidth
          multiline
          minRows={3}
          value={justification}
          onChange={(e) => setJustification(e.target.value)}
          required
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={submitting}>
          {t('cancel')}
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color="error"
          disabled={!justification.trim() || submitting}
        >
          {submitting ? `${t('loading')}...` : t('cancelBookingConfirm')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CancellationDialog;
