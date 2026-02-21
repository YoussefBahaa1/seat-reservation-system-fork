import { useState } from 'react';
import { Box, Button, MenuItem, Paper, TextField, Typography } from '@mui/material';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import LayoutPage from '../Templates/LayoutPage';

const contacts = [
  {
    id: 'admin',
    email: 'test.admin@mail.de',
    phone: '000 000 000',
  },
  {
    id: 'service',
    email: 'test.servicepersonnel@mail.de',
    phone: '111 111 111',
  },
];

const SupportContacts = () => {
  const { t } = useTranslation();
  const [recipient, setRecipient] = useState('admin');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    toast.info(t('supportPlaceholderToast'));
    setSubject('');
    setMessage('');
  };

  return (
    <LayoutPage
      title={t('supportContactsTitle')}
      helpText={t('supportContactsHelp')}
      useGenericBackButton={true}
      withPaddingX={true}
    >
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>{t('supportContacts')}</Typography>
          {contacts.map((contact) => (
            <Box key={contact.id} sx={{ mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {contact.id === 'admin' ? t('supportContactAdmin') : t('supportContactService')}
              </Typography>
              <Typography variant="body2">{t('supportEmail')}: {contact.email}</Typography>
              <Typography variant="body2">{t('supportPhone')}: {contact.phone}</Typography>
            </Box>
          ))}
        </Paper>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>{t('supportFormTitle')}</Typography>
          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'grid', gap: 2 }}>
            <TextField
              select
              size="small"
              label={t('supportRecipient')}
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            >
              <MenuItem value="admin">{t('supportContactAdmin')}</MenuItem>
              <MenuItem value="service">{t('supportContactService')}</MenuItem>
            </TextField>
            <TextField
              size="small"
              label={t('supportSubject')}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
            <TextField
              multiline
              minRows={5}
              label={t('supportMessage')}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <Button type="submit" variant="contained">
              {t('supportSubmit')}
            </Button>
          </Box>
        </Paper>
      </Box>
    </LayoutPage>
  );
};

export default SupportContacts;
