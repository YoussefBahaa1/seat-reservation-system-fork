import { Box, Button, FormControl, InputLabel, MenuItem, Select, TextField } from '@mui/material';
import { useTranslation } from 'react-i18next';

const DESK_FILTER_FIELDS = [
  { key: 'day', labelKey: 'date', type: 'date' },
  { key: 'begin', labelKey: 'startTime', type: 'time' },
  { key: 'end', labelKey: 'endTime', type: 'time' },
  { key: 'email', labelKey: 'email', type: 'text' },
  { key: 'name', labelKey: 'filterName', type: 'text' },
  { key: 'roleName', labelKey: 'filterRole', type: 'select' },
  { key: 'department', labelKey: 'filterDepartment', type: 'text' },
  { key: 'building', labelKey: 'building', type: 'select' },
  { key: 'roomRemark', labelKey: 'room', type: 'select' },
  { key: 'deskRemark', labelKey: 'desk', type: 'select' },
  { key: 'seriesId', labelKey: 'seriesId', type: 'text' },
  { key: 'bulkGroupId', labelKey: 'bulkGroupId', type: 'text' },
];

const PARKING_FILTER_FIELDS = [
  { key: 'day', labelKey: 'date', type: 'date' },
  { key: 'begin', labelKey: 'startTime', type: 'time' },
  { key: 'end', labelKey: 'endTime', type: 'time' },
  { key: 'email', labelKey: 'email', type: 'text' },
  { key: 'name', labelKey: 'filterName', type: 'text' },
  { key: 'roleName', labelKey: 'filterRole', type: 'select' },
  { key: 'department', labelKey: 'filterDepartment', type: 'text' },
  { key: 'spotLabel', labelKey: 'spotNumber', type: 'select' },
];

export const getBookingFilterFields = (viewMode) => (
  viewMode === 'desks' ? DESK_FILTER_FIELDS : PARKING_FILTER_FIELDS
);

const BookingFilters = ({ viewMode, filters, setFilters, onReset, selectOptions = {} }) => {
  const { t } = useTranslation();
  const fields = getBookingFilterFields(viewMode);

  const update = (key, value) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value || '' };

      if (viewMode === 'desks' && key === 'building') {
        next.roomRemark = '';
        next.deskRemark = '';
      }

      if (viewMode === 'desks' && key === 'roomRemark') {
        next.deskRemark = '';
      }

      return next;
    });
  };

  const hasFilters = Object.values(filters || {}).some((value) => (
    value !== null && value !== undefined && value !== ''
  ));

  const buildingValue = filters?.building || '';
  const roomValue = filters?.roomRemark || '';

  const allBuildingOptions = [...new Set((selectOptions.buildings || []).filter(Boolean))];
  const roomOptions = [...new Set((selectOptions.rooms || []).filter(Boolean))];
  const deskOptions = [...new Set((selectOptions.desks || []).filter(Boolean))];

  const renderField = (field) => {
    if (field.type !== 'select') {
      return (
        <TextField
          key={field.key}
          size="small"
          type={field.type}
          label={t(field.labelKey)}
          value={filters[field.key] || ''}
          onChange={(e) => update(field.key, e.target.value)}
          fullWidth
          InputLabelProps={field.type === 'date' || field.type === 'time' ? { shrink: true } : undefined}
          inputProps={field.type === 'time' ? { step: 1800 } : undefined}
        />
      );
    }

    const options = field.key === 'building'
      ? allBuildingOptions
      : field.key === 'roleName'
        ? [...new Set((selectOptions.roles || []).filter(Boolean))]
      : field.key === 'roomRemark'
        ? roomOptions
        : field.key === 'deskRemark'
          ? deskOptions
          : [...new Set((selectOptions.spotLabels || []).filter(Boolean))];

    const disabled = field.key === 'roomRemark'
      ? !buildingValue
      : field.key === 'deskRemark'
        ? !buildingValue || !roomValue
        : false;

    return (
      <FormControl key={field.key} size="small" fullWidth disabled={disabled}>
        <InputLabel>{t(field.labelKey)}</InputLabel>
        <Select
          label={t(field.labelKey)}
          value={filters[field.key] || ''}
          onChange={(e) => update(field.key, e.target.value)}
        >
          <MenuItem value="">{t('all')}</MenuItem>
          {options.map((option) => (
            <MenuItem key={option} value={option}>{option}</MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box
        sx={{
          display: 'grid',
          gap: 1.5,
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, minmax(0, 1fr))',
            lg: 'repeat(4, minmax(0, 1fr))',
          },
        }}
      >
        {fields.map(renderField)}
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button size="small" onClick={onReset} disabled={!hasFilters}>
          {t('clearFilters')}
        </Button>
      </Box>
    </Box>
  );
};

export default BookingFilters;
