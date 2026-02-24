import { FormControl, InputLabel, Select, MenuItem, TextField, Box } from '@mui/material';
import { useTranslation } from 'react-i18next';

const CATEGORIES = [
  'TECHNICAL_DEFECT', 'MISSING_EQUIPMENT', 'INCORRECT_DESCRIPTION'
];
const URGENCIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const STATUSES = ['NEW', 'IN_PROGRESS', 'RESOLVED'];

const DefectFilters = ({ filters, setFilters, rooms }) => {
  const { t } = useTranslation();

  const update = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2, alignItems: 'center' }}>
      <FormControl size="small" sx={{ minWidth: 150 }}>
        <InputLabel>{t('defectFilterUrgency')}</InputLabel>
        <Select
          value={filters.urgency || ''}
          label={t('defectFilterUrgency')}
          onChange={(e) => update('urgency', e.target.value || null)}
        >
          <MenuItem value="">{t('defectAllUrgencies')}</MenuItem>
          {URGENCIES.map(u => (
            <MenuItem key={u} value={u}>{t(`defectUrgency${u.charAt(0) + u.slice(1).toLowerCase()}`)}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ minWidth: 180 }}>
        <InputLabel>{t('defectFilterCategory')}</InputLabel>
        <Select
          value={filters.category || ''}
          label={t('defectFilterCategory')}
          onChange={(e) => update('category', e.target.value || null)}
        >
          <MenuItem value="">{t('defectAllCategories')}</MenuItem>
          {CATEGORIES.map(c => {
            const key = c === 'TECHNICAL_DEFECT' ? 'Technical'
              : c === 'MISSING_EQUIPMENT' ? 'Missing' : 'Incorrect';
            return <MenuItem key={c} value={c}>{t(`defectCategory${key}`)}</MenuItem>;
          })}
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ minWidth: 150 }}>
        <InputLabel>{t('status')}</InputLabel>
        <Select
          value={filters.status || ''}
          label={t('status')}
          onChange={(e) => update('status', e.target.value || null)}
        >
          <MenuItem value="">{t('defectAllStatuses')}</MenuItem>
          {STATUSES.map(s => (
            <MenuItem key={s} value={s}>{t(`defect${s === 'NEW' ? 'New' : s === 'IN_PROGRESS' ? 'InProgress' : 'Resolved'}`)}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ minWidth: 150 }}>
        <InputLabel>{t('defectFilterRoom')}</InputLabel>
        <Select
          value={filters.roomId || ''}
          label={t('defectFilterRoom')}
          onChange={(e) => update('roomId', e.target.value || null)}
        >
          <MenuItem value="">{t('defectAllRooms')}</MenuItem>
          {rooms.map(r => (
            <MenuItem key={r.id} value={r.id}>{r.remark || `Room ${r.id}`}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        size="small"
        type="number"
        label={t('defectFilterAgeMin')}
        value={filters.ageMin || ''}
        onChange={(e) => update('ageMin', e.target.value ? parseInt(e.target.value) : null)}
        sx={{ width: 190 }}
        inputProps={{ min: 0 }}
      />

      <TextField
        size="small"
        type="number"
        label={t('defectFilterAgeMax')}
        value={filters.ageMax || ''}
        onChange={(e) => update('ageMax', e.target.value ? parseInt(e.target.value) : null)}
        sx={{ width: 190 }}
        inputProps={{ min: 0 }}
      />
    </Box>
  );
};

export default DefectFilters;
