import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getRequest } from '../RequestFunctions/RequestFunctions';
import { toast } from 'react-toastify';
import FloorSelector from '../FloorSelector';
import LayoutModal from '../Templates/LayoutModal';
/**
 * This component allows the user to set its default building and default floor.
 * After setting the defaults, the specified building and floor is always shown first when selecting an desk.
 * @param isOpen Define if the modal shall be open.
 * @param onClose A function that close this modal. 
 * @returns  A component that allows the user to set the default building and floor.
 */
const DefaultFloor = ({ isOpen, onClose }) => {
    const headers = useRef(JSON.parse(sessionStorage.getItem('headers')));
    //const [defaultBuilding, setDefaultBuilding] = useState('');
    const [defaultFloor, setDefaultFloor] = useState('');
    const { t, i18n } = useTranslation();

    const handleChildData = (data) => {
      setDefaultFloor(data);
      //setDefaultBuilding(data.building);
    };

    /**
     * Sends the default building and floor to database.
     */
    function saveDefaults() {
      if (!localStorage.getItem('userId')) {
        console.log('userId is null');
        return;
      }
      getRequest(
        `${process.env.REACT_APP_BACKEND_URL}/users/setDefaulFloorForUserId/${localStorage.getItem('userId')}/${defaultFloor.floor_id}`, 
        headers.current,
        (ret => {
          if (ret === true) {
            toast.success(t('settingsUpdated'));
            onClose()
          } else {
            toast.error(t('settingsUpdatedFail'));
          }
        }),
        () => {
          console.log('Failing to put defaults in Settings.jsx.');
        }
      );
    };

  /*return (
    <Dialog open={isOpen} onClose={onClose}>
      <DialogTitle>{t('settings')}</DialogTitle>
      <DialogContent>
        <br/>
        <FloorSelector
          idString={'settings'}
          sendDataToParent={handleChildData}
        />
      </DialogContent>
      <DialogActions>
        <Button id='settings_btn_onClose' onClick={onClose} color='primary'>
          {t('cancel')}
        </Button>
        <Button id='settings_btn_onConfirm' disabled={defaultBuilding === '' || defaultFloor === ''} onClick={saveDefaults} color='primary' autoFocus>
          {t('submit')}
        </Button>
      </DialogActions>
    </Dialog>
  );*/
  return (
    <LayoutModal
      isOpen={isOpen} 
      onClose={onClose}
      title={i18n.language === 'de' ? 'Standard Etage' : 'Default floor'}
      submit={saveDefaults}
    >
      <br/>
      <FloorSelector
        idString={'settings'}
        sendDataToParent={handleChildData}
      />
    </LayoutModal>
  )
};

export default DefaultFloor;