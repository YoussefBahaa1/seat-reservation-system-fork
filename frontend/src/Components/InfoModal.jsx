import { useState } from 'react';
import { Tooltip, IconButton, DialogContent, DialogActions, Box, Button } from '@mui/material';
import { HelpOutline, PriorityHighOutlined } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

const InfoModal = ({text, helpIcon=true}) => {
    const { t } = useTranslation();
    const [isModalOpen, setIsModalOpen] = useState(false);
  
    return (
      <>
      <Tooltip title={helpIcon ? t('help') : t('news')} arrow>
        <IconButton
          aria-label='help'
          onClick={setIsModalOpen.bind(null, true)}
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            backgroundColor: '#fff',
            color: '#008444',
            boxShadow: 3,
            padding: 0, // etwa 12px
            minWidth: 'auto',
            minHeight: 'auto',
            width: 'auto',
            height: 'auto',
            zIndex: 1500,
            '&:hover': {
              backgroundColor: '#f1f1f1',
            },
          }}
        >
          {helpIcon ? <HelpOutline/> : <PriorityHighOutlined style={{ color: 'red' }}/>}
        </IconButton>
      </Tooltip>

        {isModalOpen && (
          <Box sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1300,
          }}>
            <DialogContent sx={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              maxWidth: '500px',
              width: '100%',
              textAlign: 'center',
              position: 'relative',
            }}>
              <p style={{ textAlign: 'left' }} dangerouslySetInnerHTML={{ __html: text }} />
              <DialogActions>
                <Button onClick={setIsModalOpen.bind(null, false)}>
                  {t('close').toUpperCase()}
                </Button>
              </DialogActions>
            </DialogContent>
          </Box>
        )}
      </>
    );
  };
  
  export default InfoModal;