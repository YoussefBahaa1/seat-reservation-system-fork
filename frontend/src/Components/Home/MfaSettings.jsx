import React, { useState, useRef, useEffect, useCallback } from 'react';
import { TextField, Button, Box, Typography, CircularProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { getRequest, postRequest } from '../RequestFunctions/RequestFunctions';
import LayoutModal from '../Templates/LayoutModal';
import { MdSecurity } from 'react-icons/md';

const MfaSettings = ({ isOpen, onClose }) => {
  const headers = useRef(JSON.parse(sessionStorage.getItem('headers')));
  const { t } = useTranslation();
  
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [setupData, setSetupData] = useState(null);
  const [confirmCode, setConfirmCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [showSetup, setShowSetup] = useState(false);
  const [showDisable, setShowDisable] = useState(false);

  const fetchMfaStatus = useCallback(async () => {
    setLoading(true);
    getRequest(
      `${process.env.REACT_APP_BACKEND_URL}/users/mfa/status`,
      headers.current,
      (data) => {
        setMfaEnabled(data);
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchMfaStatus();
      // Reset state when modal opens
      setSetupData(null);
      setConfirmCode('');
      setDisableCode('');
      setDisablePassword('');
      setShowSetup(false);
      setShowDisable(false);
    }
  }, [isOpen, fetchMfaStatus]);

  const startSetup = async () => {
    getRequest(
      `${process.env.REACT_APP_BACKEND_URL}/users/mfa/setup`,
      headers.current,
      (data) => {
        setSetupData(data);
        setShowSetup(true);
      },
      () => {
        toast.error('Failed to start MFA setup');
      }
    );
  };

  const confirmSetup = async () => {
    if (!confirmCode || confirmCode.length !== 6) {
      toast.error(t('mfaInvalidCode'));
      return;
    }

    postRequest(
      `${process.env.REACT_APP_BACKEND_URL}/users/mfa/confirm`,
      headers.current,
      () => {
        toast.success(t('mfaEnabledSuccess'));
        setMfaEnabled(true);
        setShowSetup(false);
        setSetupData(null);
        setConfirmCode('');
      },
      () => {
        toast.error(t('mfaInvalidCode'));
      },
      JSON.stringify({
        secret: setupData.secret,
        code: confirmCode
      })
    );
  };

  const disableMfa = async () => {
    if (!disableCode && !disablePassword) {
      toast.error(t('mfaEnterCodeOrPassword'));
      return;
    }

    postRequest(
      `${process.env.REACT_APP_BACKEND_URL}/users/mfa/disable`,
      headers.current,
      () => {
        toast.success(t('mfaDisabledSuccess'));
        setMfaEnabled(false);
        setShowDisable(false);
        setDisableCode('');
        setDisablePassword('');
      },
      () => {
        toast.error(t('mfaInvalidCode'));
      },
      JSON.stringify({
        password: disablePassword,
        code: disableCode
      })
    );
  };

  const handleClose = () => {
    setShowSetup(false);
    setShowDisable(false);
    setSetupData(null);
    onClose();
  };

  if (loading) {
    return (
      <LayoutModal isOpen={isOpen} onClose={handleClose} title={t('mfaSettings')}>
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      </LayoutModal>
    );
  }

  // Show setup flow
  if (showSetup && setupData) {
    return (
      <LayoutModal isOpen={isOpen} onClose={handleClose} title={t('mfaSetup')}>
        <Box sx={{ textAlign: 'center', p: 2 }}>
          <MdSecurity size={48} color="#008444" />
          <Typography variant="body1" sx={{ mt: 2, mb: 2 }}>
            {t('mfaScanQrCode')}
          </Typography>
          
          {/* QR Code - using a simple Google Charts API for QR generation */}
          <Box sx={{ my: 2 }}>
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(setupData.qrCodeUrl)}`}
              alt="MFA QR Code"
              style={{ border: '1px solid #ccc', borderRadius: '8px' }}
            />
          </Box>
          
          <Typography variant="caption" sx={{ display: 'block', mb: 2, wordBreak: 'break-all' }}>
            {t('mfaEnterCode')}: {setupData.secret}
          </Typography>

          <TextField
            label={t('mfaCodeLabel')}
            value={confirmCode}
            onChange={(e) => setConfirmCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
            inputProps={{ maxLength: 6, style: { textAlign: 'center', letterSpacing: '0.3em' } }}
            fullWidth
            sx={{ mb: 2 }}
          />

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button variant="outlined" onClick={() => setShowSetup(false)}>
              {t('cancel')}
            </Button>
            <Button variant="contained" color="primary" onClick={confirmSetup}>
              {t('mfaEnable')}
            </Button>
          </Box>
        </Box>
      </LayoutModal>
    );
  }

  // Show disable flow
  if (showDisable) {
    return (
      <LayoutModal isOpen={isOpen} onClose={handleClose} title={t('mfaDisable')}>
        <Box sx={{ textAlign: 'center', p: 2 }}>
          <MdSecurity size={48} color="#d32f2f" />
          <Typography variant="body1" sx={{ mt: 2, mb: 2 }}>
            {t('mfaEnterCodeOrPassword')}
          </Typography>

          <TextField
            label={t('password')}
            type="password"
            value={disablePassword}
            onChange={(e) => setDisablePassword(e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
          />

          <Typography variant="body2" sx={{ mb: 1 }}>- or -</Typography>

          <TextField
            label={t('mfaCodeLabel')}
            value={disableCode}
            onChange={(e) => setDisableCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
            inputProps={{ maxLength: 6, style: { textAlign: 'center', letterSpacing: '0.3em' } }}
            fullWidth
            sx={{ mb: 2 }}
          />

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button variant="outlined" onClick={() => setShowDisable(false)}>
              {t('cancel')}
            </Button>
            <Button variant="contained" color="error" onClick={disableMfa}>
              {t('mfaDisable')}
            </Button>
          </Box>
        </Box>
      </LayoutModal>
    );
  }

  // Main view - show current status
  return (
    <LayoutModal isOpen={isOpen} onClose={handleClose} title={t('mfaSettings')}>
      <Box sx={{ textAlign: 'center', p: 2 }}>
        <MdSecurity size={48} color={mfaEnabled ? "#008444" : "#888"} />
        
        <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
          {mfaEnabled ? t('mfaEnabled') : t('mfaDisabled')}
        </Typography>

        <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
          {mfaEnabled 
            ? 'Your account is protected with two-factor authentication.'
            : 'Enable two-factor authentication to add an extra layer of security to your account.'}
        </Typography>

        {mfaEnabled ? (
          <Button 
            variant="contained" 
            color="error" 
            onClick={() => setShowDisable(true)}
          >
            {t('mfaDisable')}
          </Button>
        ) : (
          <Button 
            variant="contained" 
            color="primary" 
            onClick={startSetup}
          >
            {t('mfaEnable')}
          </Button>
        )}
      </Box>
    </LayoutModal>
  );
};

export default MfaSettings;
