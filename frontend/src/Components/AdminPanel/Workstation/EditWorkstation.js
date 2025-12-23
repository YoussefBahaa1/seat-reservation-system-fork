import {useState, useRef, useEffect} from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import {putRequest} from '../../RequestFunctions/RequestFunctions';
import FloorImage from '../../FloorImage/FloorImage.jsx';
import InfoModal from '../../InfoModal.jsx';
import DeskSelector from '../../DeskSelector.js';
import WorkStationDefinition from './WorkStationDefinition.js';
import LayoutModalAdmin from '../../Templates/LayoutModalAdmin.jsx';

export default function EditWorkstation({ isOpen, onClose }) {
  const headers = useRef(JSON.parse(sessionStorage.getItem('headers')));
  const { t } = useTranslation();
  // const [allDesks, setAllDesks] = useState([]);
  const [room, setRoom]= useState('');
  const [selectedDesk, setSelectedDesk] = useState('');
  const [equipment, setEquipment]= useState('');
  const [remark, setRemark]= useState('');
  const helpText = t('helpEditWorkstation');

  async function updateWorkstation() {
    if (selectedDesk?.id && equipment && remark) {
      putRequest(
        `${process.env.REACT_APP_BACKEND_URL}/admin/desks/updateDesk`,
        headers.current,
        (_) => {
          toast.success(t('deskUpdate'));
          // setEquipment('');
          // setRemark('');
          onClose();
        },
        () => {console.log('Failed to update workstation in EditWorkstation.js');},
        JSON.stringify({
          'deskId': selectedDesk.id,
          'equipment': equipment.equipmentName,
          'remark': remark
        })
      );
    }
    else {
      toast.error(t('deskUpdateFailed'));
    }
  };

  useEffect(()=>{
    setEquipment(selectedDesk.equipment);
    setRemark(selectedDesk.remark);
  },[selectedDesk])

  /**
   * Set the floor on which we want to create an new room with x- and y-coords.
   * @param {*} data Object with properties floor, room, x, y. 
   */
  const handleChildData = (data) => {
    if (!data || data.room === '' || data.room.id === room.id) {
      return;
    }
    setRoom(data.room);
    setRemark(data.room.remark);
    setEquipment(data.room.equipment);
  };

  return (
    <LayoutModalAdmin
      onClose={()=>{/*setEquipment('');
        setRemark('');*/onClose();}}
      isOpen={isOpen}
      title={t('editWorkstation')}
      submit={updateWorkstation}
      submitTxt={t('update')}
    >
      <InfoModal text={helpText}/>
      <FloorImage 
        sendDataToParent={handleChildData}
        click_freely={false}
      />
      <DeskSelector
        selectedRoom={room}
        t={t}
        onChangeSelectedDesk={setSelectedDesk}
      />
      <br></br><br></br>
      {
        selectedDesk && (
          <WorkStationDefinition
            t={t}
            equipment={equipment}
            setEquipment={setEquipment}
            remark={remark}
            setRemark={setRemark}
          />
        )
      }
    </LayoutModalAdmin>
  );
}