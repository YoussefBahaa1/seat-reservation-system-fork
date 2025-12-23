import { useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from "react-i18next";
import DeleteFf from '../../DeleteFf';
import { deleteRequest} from '../../RequestFunctions/RequestFunctions';
import FloorImage from '../../FloorImage/FloorImage.jsx';
import InfoModal from '../../InfoModal.jsx';
import DeskSelector from '../../DeskSelector.js';
import LayoutModalAdmin from '../../Templates/LayoutModalAdmin.jsx';
import WorkStationDefinition from './WorkStationDefinition.js';

export default function DeleteWorkstation({ onClose, isOpen }) {
  const headers = useRef(JSON.parse(sessionStorage.getItem('headers')));
  const { t } = useTranslation();
  const [room, setRoom]= useState('');
  const [selectedDesk, setSelectedDesk] = useState('');
  const [openFfDialog, setOpenFfDialog] = useState(false);

  const helpText = t('helpDeleteWorkstation');

  /**
   * Delete the desk identified by selectedDeskId 
   * @param {*} urlExtension Is set to 'ff/' if fast forward deletion is needed. This means also delete all bookings associated wit this desk.
   */
  async function deleteWorkstation (urlExtension = '') {
    if(selectedDesk?.id){
      deleteRequest(
        `${process.env.REACT_APP_BACKEND_URL}/admin/desks/${urlExtension}${selectedDesk.id}`,
        headers.current,
        (data) => {
          if (data !== 0) {
            setOpenFfDialog(true);
          }
          else {
            toast.success(t('deskDelete'));
            onClose();
          }
        },
        () => {console.log('Failed to delete workstation in DeleteWorkstation.js');}
      );
    }
  }

  async function deleteWorkstationFf(){
    deleteWorkstation('ff/');
  }

  /**
   * Set the floor on which we want to create an new room with x- and y-coords.
   * @param {*} data Object with properties floor, room, x, y. 
   */
  const handleChildData = (data) => {
    if (!data || data.room === '' || data.room.id === room.id) {
      return;
    }
    setRoom(data.room);
    setSelectedDesk('');
  };

  return (
    <LayoutModalAdmin
      title={t('deleteWorkstation')}
      onClose={onClose}
      isOpen={isOpen}
      submit={()=>deleteWorkstation()}
      submitTxt={t('delete')}
    >
      <InfoModal text={helpText}/>
      <DeleteFf 
        open={openFfDialog}
        onClose={onClose}
        onDelete={deleteWorkstationFf}
        text={t('fFDeleteWorkStation')}
      />
      <FloorImage 
        sendDataToParent={handleChildData}
        click_freely={false}
      />
      <DeskSelector
        selectedRoom={room}
        t={t}
        onChangeSelectedDesk={setSelectedDesk}
      />
      {selectedDesk &&
        <WorkStationDefinition 
          t={t}
          equipment={selectedDesk.equipment}
          remark={selectedDesk.remark}
          disabled={true}
        />
      }
    </LayoutModalAdmin>
  );
}