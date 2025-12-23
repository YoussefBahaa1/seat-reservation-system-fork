import React, {useRef} from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from "react-i18next";
import {roomToOption} from '../Room/RoomAndOption';
import {postRequest} from '../../RequestFunctions/RequestFunctions';
import FloorImage from '../../FloorImage/FloorImage.jsx';
import InfoModal from '../../InfoModal.jsx';
import WorkStationDefinition from './WorkStationDefinition.js';
import LayoutModalAdmin from '../../Templates/LayoutModalAdmin.jsx';

export default function AddWorkstation({ isOpen, onClose }) {
  const headers = useRef(JSON.parse(sessionStorage.getItem('headers')));
  const { t } = useTranslation();
  const [room, setRoom]= React.useState('');
  const [equipment, setEquipment]= React.useState('');
  const [remark, setRemark]= React.useState('');

  const helpText = t('helpAddWorkstation');

  async function addWorkstation(){
    if(!room){
      toast.error(t('selectRoomError'));
      return false;
    }
    const roomId = room.id;
    
    if(!roomId || !equipment ){
      toast.error('Field cannot be blank!');
      return false;
    }
    postRequest(
      `${process.env.REACT_APP_BACKEND_URL}/admin/desks`,
      headers.current,
      (_) => {
        toast.success(t('deskCreated'));
        onClose();
      },
      () => {console.log('Failed to create a new desk in AddWorkstation.js.');},
      JSON.stringify({
        'roomId': roomId,
        'equipment': equipment.equipmentName,
        'remark': remark
      })
    );
  }

  /**
   * Set the floor on which we want to create an new room with x- and y-coords.
   * @param {*} data Object with properties floor, room, x, y. 
   */
  const handleChildData = (data) => {
    if (!data || data.room === '' /*|| data.room.id === room.id*/) 
      return;
    setRoom(data.room);
  };

  return (
    <LayoutModalAdmin
      isOpen={isOpen}
      onClose={onClose}
      title={t('addWorkstation')}
      submit={addWorkstation}
      submitTxt={t('submit')}
    >
      <InfoModal text={helpText}/>
      <FloorImage 
        sendDataToParent={handleChildData}
        click_freely={false}
      />
      {
        room && (
          <div>
            <h2>{roomToOption(room)}</h2>
            <WorkStationDefinition
              t={t}
              equipment={equipment}
              setEquipment={setEquipment}
              remark={remark}
              setRemark={setRemark}
            />
          </div>
        )
      }
    </LayoutModalAdmin>
  );
}