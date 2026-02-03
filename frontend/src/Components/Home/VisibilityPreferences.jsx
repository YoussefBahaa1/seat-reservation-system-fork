import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getRequest, putRequest } from '../RequestFunctions/RequestFunctions';
import { FormControl, InputLabel, Select, MenuItem, Tooltip, Typography } from '@mui/material';
import LayoutModal from '../Templates/LayoutModal';
import { toast } from 'react-toastify';

const VisibilityPreferences = ({ isOpen, onClose }) => {
  const headers = useRef(JSON.parse(sessionStorage.getItem('headers')));
  const { t } = useTranslation();
  const [visibilityMode, setVisibilityMode] = useState('FULL_NAME');

  useEffect(() => {
    if (!localStorage.getItem('userId')) return;
    getRequest(
      `${process.env.REACT_APP_BACKEND_URL}/users/visibilityMode/${localStorage.getItem('userId')}`,
      headers.current,
      (mode) => setVisibilityMode(mode || 'FULL_NAME'),
      () => console.log('Failed to fetch visibilityMode')
    );
  }, []);

  const save = () => {
    if (!localStorage.getItem('userId')) return;
    putRequest(
      `${process.env.REACT_APP_BACKEND_URL}/users/visibilityMode/${localStorage.getItem('userId')}/${visibilityMode}`,
      headers.current,
      () => {
        toast.success(t('settingsUpdated'));
        onClose();
      },
      () => {
        console.log('Failed to set visibilityMode');
        toast.error(t('settingsUpdatedFail'));
      },
      null
    );
  };

  return (
    <LayoutModal
      isOpen={isOpen}
      onClose={onClose}
      title={''}
      submit={save}
    >
      <h1>{t('visibility')}</h1>
      <Typography variant="subtitle1" gutterBottom>
        {t('visibilityHelper')}
      </Typography>
      <Tooltip title={t('visibilityHelper')} placement='top'>
        <FormControl required id='visibilityMode' size='small' fullWidth>
          <InputLabel shrink>{t('visibility')}</InputLabel>
          <Select
            id='select_visibilityMode'
            value={visibilityMode}
            label={t('visibility')}
            onChange={(e)=> setVisibilityMode(e.target.value)}
          >
            <MenuItem value='FULL_NAME'>{t('name')}</MenuItem>
            <MenuItem value='ABBREVIATION'>{t('abbreviationCap')}</MenuItem>
            <MenuItem value='ANONYMOUS'>{t('anonymous')}</MenuItem>
          </Select>
        </FormControl>
      </Tooltip>
    </LayoutModal>
  );
};

export default VisibilityPreferences;
