import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { postRequest, putRequest } from '../../RequestFunctions/RequestFunctions';

const normalizeDateValue = (value) => {
  if (!value) return '';
  return String(value).slice(0, 10);
};

const normalizeTimeValue = (value) => {
  if (!value) return '';
  return String(value).slice(0, 5);
};

const toTimeMinutes = (value) => {
  if (!value || !String(value).includes(':')) {
    return null;
  }

  const [hours, minutes] = String(value).slice(0, 5).split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  return (hours * 60) + minutes;
};

const extractErrorMessage = (payload) => {
  if (!payload) return null;
  if (typeof payload === 'string') return payload;
  if (typeof payload?.message === 'string') return payload.message;
  if (typeof payload?.error === 'string') return payload.error;
  return null;
};

const sortByLabel = (items) => [...items].sort((left, right) => left.label.localeCompare(right.label));

const EditBookingDialog = ({ open, onClose, onConfirm, booking, type }) => {
  const { t } = useTranslation();
  const headers = useMemo(() => JSON.parse(sessionStorage.getItem('headers')), []);
  const initialSelectionPendingRef = useRef(true);

  const [day, setDay] = useState('');
  const [begin, setBegin] = useState('');
  const [end, setEnd] = useState('');
  const [justification, setJustification] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [selectedDeskId, setSelectedDeskId] = useState('');
  const [selectedSpotLabel, setSelectedSpotLabel] = useState('');
  const [deskCandidates, setDeskCandidates] = useState([]);
  const [parkingCandidates, setParkingCandidates] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const bookingId = type === 'desk' ? booking?.booking_id : booking?.id;
  const initialDay = normalizeDateValue(booking?.day);
  const initialBegin = normalizeTimeValue(booking?.begin);
  const initialEnd = normalizeTimeValue(booking?.end);
  const initialDeskId = booking?.deskId == null ? '' : String(booking.deskId);
  const initialSpotLabel = booking?.spotLabel || '';
  const isPeriodComplete = Boolean(day && begin && end);
  const beginMinutes = toTimeMinutes(begin);
  const endMinutes = toTimeMinutes(end);
  const hasValidPeriod = isPeriodComplete
    && beginMinutes !== null
    && endMinutes !== null
    && endMinutes > beginMinutes;
  const periodError = isPeriodComplete && !hasValidPeriod;

  useEffect(() => {
    if (!open || !booking) {
      return;
    }

    initialSelectionPendingRef.current = true;
    setDay(initialDay);
    setBegin(initialBegin);
    setEnd(initialEnd);
    setJustification('');
    setSelectedBuilding('');
    setSelectedRoom('');
    setSelectedDeskId('');
    setSelectedSpotLabel('');
    setDeskCandidates([]);
    setParkingCandidates([]);
    setLoadingCandidates(false);
    setSubmitting(false);
  }, [booking, initialBegin, initialDay, initialEnd, open]);

  useEffect(() => {
    if (!open || !bookingId || !type) {
      return;
    }

    if (!isPeriodComplete || !hasValidPeriod) {
      setLoadingCandidates(false);
      if (type === 'desk') {
        setDeskCandidates([]);
      } else {
        setParkingCandidates([]);
      }
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setLoadingCandidates(true);

      const url = type === 'desk'
        ? `${process.env.REACT_APP_BACKEND_URL}/admin/bookings/${bookingId}/candidate-desks`
        : `${process.env.REACT_APP_BACKEND_URL}/admin/parkingReservations/${bookingId}/candidate-spots`;

      postRequest(
        url,
        headers,
        (data) => {
          if (type === 'desk') {
            setDeskCandidates(Array.isArray(data) ? data : []);
          } else {
            setParkingCandidates(Array.isArray(data) ? data : []);
          }
          setLoadingCandidates(false);
        },
        () => {
          setLoadingCandidates(false);
          if (type === 'desk') {
            setDeskCandidates([]);
          } else {
            setParkingCandidates([]);
          }
        },
        JSON.stringify({
          day,
          begin,
          end,
        })
      );
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [begin, bookingId, day, end, hasValidPeriod, headers, isPeriodComplete, open, type]);

  const buildingOptions = useMemo(() => sortByLabel(
    Array.from(new Map(
      deskCandidates
        .filter((candidate) => candidate?.buildingId != null)
        .map((candidate) => [String(candidate.buildingId), {
          id: String(candidate.buildingId),
          label: candidate.buildingName || '-',
        }])
    ).values())
  ), [deskCandidates]);

  const roomOptions = useMemo(() => sortByLabel(
    Array.from(new Map(
      deskCandidates
        .filter((candidate) => String(candidate?.buildingId) === String(selectedBuilding))
        .filter((candidate) => candidate?.roomId != null)
        .map((candidate) => [String(candidate.roomId), {
          id: String(candidate.roomId),
          label: candidate.roomLabel || '-',
        }])
    ).values())
  ), [deskCandidates, selectedBuilding]);

  const deskOptions = useMemo(() => sortByLabel(
    deskCandidates
      .filter((candidate) => String(candidate?.buildingId) === String(selectedBuilding))
      .filter((candidate) => String(candidate?.roomId) === String(selectedRoom))
      .map((candidate) => ({
        id: String(candidate.deskId),
        label: candidate.deskLabel || `#${candidate.deskId}`,
      }))
  ), [deskCandidates, selectedBuilding, selectedRoom]);

  useEffect(() => {
    if (!open || type !== 'desk') {
      return;
    }

    const currentDeskCandidate = deskCandidates.find((candidate) => String(candidate.deskId) === String(initialDeskId));
    const buildingStillValid = buildingOptions.some((option) => option.id === selectedBuilding);
    const roomStillValid = roomOptions.some((option) => option.id === selectedRoom);
    const deskStillValid = deskOptions.some((option) => option.id === selectedDeskId);

    if (initialSelectionPendingRef.current) {
      if (currentDeskCandidate) {
        setSelectedBuilding(String(currentDeskCandidate.buildingId));
        setSelectedRoom(String(currentDeskCandidate.roomId));
        setSelectedDeskId(String(currentDeskCandidate.deskId));
      } else {
        setSelectedBuilding('');
        setSelectedRoom('');
        setSelectedDeskId('');
      }
      initialSelectionPendingRef.current = false;
      return;
    }

    if (!buildingStillValid) {
      setSelectedBuilding('');
      setSelectedRoom('');
      setSelectedDeskId('');
      return;
    }
    if (!roomStillValid) {
      setSelectedRoom('');
      setSelectedDeskId('');
      return;
    }
    if (!deskStillValid) {
      setSelectedDeskId('');
    }
  }, [buildingOptions, deskCandidates, deskOptions, initialDeskId, open, roomOptions, selectedBuilding, selectedDeskId, selectedRoom, type]);

  useEffect(() => {
    if (!open || type !== 'parking') {
      return;
    }

    const currentSpotStillValid = parkingCandidates.some((candidate) => candidate?.spotLabel === selectedSpotLabel);
    const initialSpotStillValid = parkingCandidates.some((candidate) => candidate?.spotLabel === initialSpotLabel);

    if (initialSelectionPendingRef.current) {
      setSelectedSpotLabel(initialSpotStillValid ? initialSpotLabel : '');
      initialSelectionPendingRef.current = false;
      return;
    }

    if (!currentSpotStillValid) {
      setSelectedSpotLabel('');
    }
  }, [initialSpotLabel, open, parkingCandidates, selectedSpotLabel, type]);

  const handleClose = () => {
    if (submitting) return;
    onClose();
  };

  const handleBuildingChange = (value) => {
    setSelectedBuilding(value);
    setSelectedRoom('');
    setSelectedDeskId('');
  };

  const handleRoomChange = (value) => {
    setSelectedRoom(value);
    setSelectedDeskId('');
  };

  const hasChanged = type === 'desk'
    ? initialDay !== day
      || initialBegin !== begin
      || initialEnd !== end
      || initialDeskId !== String(selectedDeskId || '')
    : initialDay !== day
      || initialBegin !== begin
      || initialEnd !== end
      || initialSpotLabel !== selectedSpotLabel;

  const saveDisabled = !day
    || !begin
    || !end
    || !hasValidPeriod
    || !justification.trim()
    || !hasChanged
    || loadingCandidates
    || submitting
    || (type === 'desk' ? !selectedBuilding || !selectedRoom || !selectedDeskId : !selectedSpotLabel);

  const handleConfirm = () => {
    if (!bookingId || saveDisabled) {
      return;
    }

    setSubmitting(true);

    const url = type === 'desk'
      ? `${process.env.REACT_APP_BACKEND_URL}/admin/bookings/${bookingId}`
      : `${process.env.REACT_APP_BACKEND_URL}/admin/parkingReservations/${bookingId}`;

    const payload = type === 'desk'
      ? {
        day,
        begin,
        end,
        deskId: Number(selectedDeskId),
        justification: justification.trim(),
      }
      : {
        day,
        begin,
        end,
        spotLabel: selectedSpotLabel,
        justification: justification.trim(),
      };

    putRequest(
      url,
      headers,
      () => {
        toast.success(t('editBookingSuccess'));
        setSubmitting(false);
        onConfirm();
      },
      (_status, payloadResponse) => {
        setSubmitting(false);
        toast.error(extractErrorMessage(payloadResponse) || t('httpOther'));
      },
      JSON.stringify(payload)
    );
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth disableEscapeKeyDown={submitting}>
      <DialogTitle>{t('editBooking')}</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: '12px !important' }}>
        <Box sx={{ display: 'grid', gap: 0.5 }}>
          <Typography variant="subtitle2">{t('currentAssignment')}</Typography>
          {type === 'desk' ? (
            <>
              <Typography variant="body2">{t('building')}: {booking?.building || '-'}</Typography>
              <Typography variant="body2">{t('room')}: {booking?.roomRemark || '-'}</Typography>
              <Typography variant="body2">{t('desk')}: {booking?.deskRemark || '-'}</Typography>
            </>
          ) : (
            <Typography variant="body2">{t('spotNumber')}: {booking?.spotLabel || '-'}</Typography>
          )}
        </Box>

        <Box sx={{ display: 'grid', gap: 1.5 }}>
          <Typography variant="subtitle2">{t('periodSection')}</Typography>
          <TextField
            label={t('date')}
            type="date"
            value={day}
            onChange={(event) => setDay(event.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <TextField
            label={t('startTime')}
            type="time"
            value={begin}
            onChange={(event) => setBegin(event.target.value)}
            InputLabelProps={{ shrink: true }}
            inputProps={{ step: 1800 }}
            error={periodError}
            fullWidth
          />
          <TextField
            label={t('endTime')}
            type="time"
            value={end}
            onChange={(event) => setEnd(event.target.value)}
            InputLabelProps={{ shrink: true }}
            inputProps={{ step: 1800 }}
            error={periodError}
            helperText={periodError ? t('timeRangeInvalid') : ' '}
            fullWidth
          />
        </Box>

        <Box sx={{ display: 'grid', gap: 1.5 }}>
          <Typography variant="subtitle2">{t('assignmentSection')}</Typography>
          {type === 'desk' ? (
            <>
              <TextField
                select
                label={t('building')}
                value={selectedBuilding}
                onChange={(event) => handleBuildingChange(event.target.value)}
                fullWidth
                disabled={loadingCandidates}
                helperText={buildingOptions.length ? ' ' : t('noAvailableDesks')}
              >
                <MenuItem value="">{t('building')}</MenuItem>
                {buildingOptions.map((option) => (
                  <MenuItem key={option.id} value={option.id}>{option.label}</MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label={t('room')}
                value={selectedRoom}
                onChange={(event) => handleRoomChange(event.target.value)}
                fullWidth
                disabled={!selectedBuilding || loadingCandidates}
                helperText={selectedBuilding && !roomOptions.length ? t('noAvailableDesks') : ' '}
              >
                <MenuItem value="">{t('room')}</MenuItem>
                {roomOptions.map((option) => (
                  <MenuItem key={option.id} value={option.id}>{option.label}</MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label={t('desk')}
                value={selectedDeskId}
                onChange={(event) => setSelectedDeskId(event.target.value)}
                fullWidth
                disabled={!selectedRoom || loadingCandidates}
                helperText={selectedRoom && !deskOptions.length ? t('noAvailableDesks') : ' '}
              >
                <MenuItem value="">{t('desk')}</MenuItem>
                {deskOptions.map((option) => (
                  <MenuItem key={option.id} value={option.id}>{option.label}</MenuItem>
                ))}
              </TextField>
            </>
          ) : (
            <TextField
              select
              label={t('spotNumber')}
              value={selectedSpotLabel}
              onChange={(event) => setSelectedSpotLabel(event.target.value)}
              fullWidth
              disabled={loadingCandidates}
              helperText={!parkingCandidates.length ? t('noAvailableParkingSpots') : ' '}
            >
              <MenuItem value="">{t('spotNumber')}</MenuItem>
              {parkingCandidates.map((candidate) => (
                <MenuItem key={candidate.spotLabel} value={candidate.spotLabel}>
                  {candidate.displayLabel || candidate.spotLabel}
                </MenuItem>
              ))}
            </TextField>
          )}
        </Box>

        <TextField
          label={t('editBookingJustification')}
          value={justification}
          onChange={(event) => setJustification(event.target.value)}
          multiline
          minRows={3}
          fullWidth
          required
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={submitting}>
          {t('cancel')}
        </Button>
        <Button variant="contained" onClick={handleConfirm} disabled={saveDisabled}>
          {submitting ? `${t('loading')}...` : t('editBookingConfirm')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditBookingDialog;
