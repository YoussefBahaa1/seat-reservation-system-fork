import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, FormControlLabel, Switch, CircularProgress, Typography } from '@mui/material';
import LayoutModal from '../Templates/LayoutModal';
import { getRequest, putRequest } from '../RequestFunctions/RequestFunctions';
import { toast } from 'react-toastify';

const NotificationSettings = ({ isOpen, onClose }) => {
  const headers = useRef(JSON.parse(sessionStorage.getItem('headers')));
  const { t } = useTranslation();
  const isAdmin = localStorage.getItem('admin') === 'true';

  const [loading, setLoading] = useState(false);
  const [prefs, setPrefs] = useState({
    bookingCreate: true,
    bookingCancel: true,
    parkingDecision: true,
  });

  const fetchPrefs = () => {
    setLoading(true);
    getRequest(
      `${process.env.REACT_APP_BACKEND_URL}/users/me/notification-preferences`,
      headers.current,
      (data) => {
        setPrefs(data);
        setLoading(false);
      },
      () => setLoading(false)
    );
  };

  useEffect(() => {
    if (isOpen) {
      fetchPrefs();
    }
  }, [isOpen]);

  const handleToggle = (field) => {
    setPrefs((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSave = () => {
    setLoading(true);
    putRequest(
      `${process.env.REACT_APP_BACKEND_URL}/users/me/notification-preferences`,
      headers.current,
      (data) => {
        setPrefs(data);
        setLoading(false);
        toast.success(t('notificationsSaved'));
        onClose();
      },
      () => {
        setLoading(false);
        toast.error(t('notificationsSaveFailed'));
      },
      JSON.stringify(prefs)
    );
  };

  return (
    <LayoutModal
      isOpen={isOpen}
      onClose={onClose}
      title={t('notifications')}
      submit={handleSave}
      submitTxt={t('submit')}
    >
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant='body2'>{t('notificationsInfo')}</Typography>
          <FormControlLabel
            control={<Switch checked={prefs.bookingCreate} onChange={() => handleToggle('bookingCreate')} />}
            label={t('notifyBookingCreate')}
          />
          <FormControlLabel
            control={<Switch checked={prefs.bookingCancel} onChange={() => handleToggle('bookingCancel')} />}
            label={t('notifyBookingCancel')}
          />
          {!isAdmin && (
            <FormControlLabel
              control={<Switch checked={prefs.parkingDecision} onChange={() => handleToggle('parkingDecision')} />}
              label={t('notifyParkingDecision')}
            />
          )}
        </Box>
      )}
    </LayoutModal>
  );
};

export default NotificationSettings;
