import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography
} from '@mui/material';
import { useTranslation } from 'react-i18next';

const JustificationDialog = ({ open, onClose, justification }) => {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('justification')}</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {justification || t('noJustificationAvailable')}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('close')}</Button>
      </DialogActions>
    </Dialog>
  );
};

export default JustificationDialog;
