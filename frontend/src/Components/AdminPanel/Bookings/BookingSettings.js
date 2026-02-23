import { useEffect, useState, useRef } from 'react';
import { FormControl, InputLabel, Select, MenuItem, Button, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import LayoutModalAdmin from '../../Templates/LayoutModalAdmin';
import { getRequest, putRequest } from '../../RequestFunctions/RequestFunctions';
import { toast } from 'react-toastify';

const leadTimeOptionsHours = Array.from({ length: 25 }, (_, i) => i * 0.5); // 0..12 in 0.5 steps
const durationValuesHours = ['unrestricted', 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12];
const advanceOptionsDays = ['unrestricted', 7, 14, 30, 60, 90, 180];

const DEFAULTS = {
  leadTimeMinutes: 30,
  maxDurationMinutes: 360,
  maxAdvanceDays: 30,
};

export default function BookingSettings({ isOpen, onClose }) {
  const headers = useRef(JSON.parse(sessionStorage.getItem('headers')));
  const { t } = useTranslation();

  const [leadTimeHours, setLeadTimeHours] = useState(DEFAULTS.leadTimeMinutes / 60);
  const [maxDurationChoice, setMaxDurationChoice] = useState('6'); // hours as string or 'unrestricted'
  const [maxAdvanceChoice, setMaxAdvanceChoice] = useState('30'); // days as string or 'unrestricted'
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    getRequest(
      `${process.env.REACT_APP_BACKEND_URL}/booking-settings`,
      headers.current,
      (data) => {
        setLeadTimeHours((data.leadTimeMinutes ?? DEFAULTS.leadTimeMinutes) / 60);
        setMaxDurationChoice(
          data.maxDurationMinutes === null || data.maxDurationMinutes === undefined
            ? 'unrestricted'
            : `${data.maxDurationMinutes / 60}`
        );
        setMaxAdvanceChoice(
          data.maxAdvanceDays === null || data.maxAdvanceDays === undefined
            ? 'unrestricted'
            : `${data.maxAdvanceDays}`
        );
      },
      () => toast.error(t('bookingSettingsLoadError'))
    ).finally(() => setLoading(false));
  }, [isOpen, t]);

  const handleReset = () => {
    setLeadTimeHours(DEFAULTS.leadTimeMinutes / 60);
    setMaxDurationChoice(`${DEFAULTS.maxDurationMinutes / 60}`);
    setMaxAdvanceChoice(`${DEFAULTS.maxAdvanceDays}`);
  };

  const handleSave = () => {
    const dto = {
      leadTimeMinutes: Math.round(leadTimeHours * 60),
      maxDurationMinutes:
        maxDurationChoice === 'unrestricted' ? null : Math.round(parseFloat(maxDurationChoice) * 60),
      maxAdvanceDays: maxAdvanceChoice === 'unrestricted' ? null : parseInt(maxAdvanceChoice, 10),
    };

    // simple front validation to mirror backend constraints
    if (dto.leadTimeMinutes < 0 || dto.leadTimeMinutes > 720 || dto.leadTimeMinutes % 30 !== 0) {
      toast.error(t('bookingSettingsLeadTimeInvalid'));
      return;
    }
    if (dto.maxDurationMinutes !== null) {
      if (dto.maxDurationMinutes < 120 || dto.maxDurationMinutes > 720 || dto.maxDurationMinutes % 30 !== 0) {
        toast.error(t('bookingSettingsMaxDurationInvalid'));
        return;
      }
    }
    if (dto.maxAdvanceDays !== null) {
      const allowed = [7, 14, 30, 60, 90, 180];
      if (!allowed.includes(dto.maxAdvanceDays)) {
        toast.error(t('bookingSettingsMaxAdvanceInvalid'));
        return;
      }
    }

    setLoading(true);
    putRequest(
      `${process.env.REACT_APP_BACKEND_URL}/admin/booking-settings`,
      headers.current,
      () => {
        toast.success(t('bookingSettingsSaved'));
        onClose();
      },
      () => toast.error(t('bookingSettingsSaveError')),
      JSON.stringify(dto)
    ).finally(() => setLoading(false));
  };

  return (
    <LayoutModalAdmin title={t('bookingSettings')} onClose={onClose} isOpen={isOpen}>
      <Stack spacing={3} sx={{ minWidth: 320 }}>
        <Typography variant="body2">{t('bookingSettingsHelper')}</Typography>

        <FormControl fullWidth>
          <InputLabel>{t('leadTime')}</InputLabel>
          <Select
            value={`${leadTimeHours}`}
            label={t('leadTime')}
            onChange={(e) => setLeadTimeHours(parseFloat(e.target.value))}
          >
            {leadTimeOptionsHours.map((opt) => (
              <MenuItem key={opt} value={`${opt}`}>
                {t('hoursValue', { value: opt })}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel>{t('maxDuration')}</InputLabel>
          <Select
            value={`${maxDurationChoice}`}
            label={t('maxDuration')}
            onChange={(e) => setMaxDurationChoice(e.target.value)}
          >
            <MenuItem value="unrestricted">{t('unrestricted')}</MenuItem>
            {durationValuesHours.map((opt) =>
              opt === 'unrestricted' ? null : (
                <MenuItem key={opt} value={`${opt}`}>
                  {t('hoursValue', { value: opt })}
                </MenuItem>
              )
            )}
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel>{t('maxAdvance')}</InputLabel>
          <Select
            value={`${maxAdvanceChoice}`}
            label={t('maxAdvance')}
            onChange={(e) => setMaxAdvanceChoice(e.target.value)}
          >
            {advanceOptionsDays.map((opt) => (
              <MenuItem key={opt} value={`${opt}`}>
                {opt === 'unrestricted' ? t('unrestricted') : t('daysValue', { value: opt })}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button variant="outlined" onClick={handleReset} disabled={loading}>
            {t('resetDefaults')}
          </Button>
          <Button variant="contained" onClick={handleSave} disabled={loading}>
            {t('submit')}
          </Button>
        </Stack>
      </Stack>
    </LayoutModalAdmin>
  );
}
