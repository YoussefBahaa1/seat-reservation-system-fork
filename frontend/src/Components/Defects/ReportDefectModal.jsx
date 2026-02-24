import { useState } from 'react';
import {
  FormControl, InputLabel, Select, MenuItem, TextField
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { getRequest, postRequest } from '../RequestFunctions/RequestFunctions';
import LayoutModal from '../Templates/LayoutModal';

const CATEGORIES = [
  { value: 'TECHNICAL_DEFECT', labelKey: 'defectCategoryTechnical' },
  { value: 'MISSING_EQUIPMENT', labelKey: 'defectCategoryMissing' },
  { value: 'INCORRECT_DESCRIPTION', labelKey: 'defectCategoryIncorrect' },
];

const URGENCIES = [
  { value: 'LOW', labelKey: 'defectUrgencyLow' },
  { value: 'MEDIUM', labelKey: 'defectUrgencyMedium' },
  { value: 'HIGH', labelKey: 'defectUrgencyHigh' },
  { value: 'CRITICAL', labelKey: 'defectUrgencyCritical' },
];

const ReportDefectModal = ({ isOpen, onClose, deskId }) => {
  const { t } = useTranslation();
  const [category, setCategory] = useState('');
  const [urgency, setUrgency] = useState('');
  const [description, setDescription] = useState('');

  const resetForm = () => {
    setCategory('');
    setUrgency('');
    setDescription('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = () => {
    if (!category || !urgency) {
      toast.warning(t('fields_not_empty'));
      return;
    }
    if (!description || description.trim().length < 20) {
      toast.warning(t('defectDescriptionMinLength'));
      return;
    }

    const headers = JSON.parse(sessionStorage.getItem('headers'));
    postRequest(
      `${process.env.REACT_APP_BACKEND_URL}/defects`,
      headers,
      () => {
        toast.success(t('defectReportedSuccess'));
        handleClose();
      },
      (status) => {
        if (status === 409) {
          toast.warning(t('defectAlreadyOpen'));
        } else {
          toast.error(t('defectReportFailed'));
        }
      },
      JSON.stringify({ deskId, category, urgency, description: description.trim() })
    );
  };

  return (
    <LayoutModal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('reportDefect')}
      submit={handleSubmit}
      widthInPx='500'
    >
      <FormControl fullWidth sx={{ mt: 1, mb: 2 }}>
        <InputLabel>{t('defectCategory')}</InputLabel>
        <Select
          value={category}
          label={t('defectCategory')}
          onChange={(e) => setCategory(e.target.value)}
        >
          {CATEGORIES.map((c) => (
            <MenuItem key={c.value} value={c.value}>{t(c.labelKey)}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>{t('defectUrgency')}</InputLabel>
        <Select
          value={urgency}
          label={t('defectUrgency')}
          onChange={(e) => setUrgency(e.target.value)}
        >
          {URGENCIES.map((u) => (
            <MenuItem key={u.value} value={u.value}>{t(u.labelKey)}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        fullWidth
        multiline
        minRows={3}
        label={t('defectDescription')}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        helperText={`${description.length}/20 ${t('defectDescriptionMinLength')}`}
        error={description.length > 0 && description.trim().length < 20}
      />
    </LayoutModal>
  );
};

export default ReportDefectModal;
