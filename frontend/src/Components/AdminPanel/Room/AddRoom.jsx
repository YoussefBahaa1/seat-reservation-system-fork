import FloorImage from '../../FloorImage/FloorImage.jsx'
import InfoModal from '../../InfoModal.jsx';
import { useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import {postRequest} from '../../RequestFunctions/RequestFunctions';
import RoomDefinition from '../Room/RoomDefinition.js';
import LayoutModalAdmin from '../../Templates/LayoutModalAdmin.jsx';

export default function AddRoom({ isOpen, onClose }) {
  const headers = useRef(JSON.parse(sessionStorage.getItem('headers')));
  const { t } = useTranslation();
  const [floor, setFloor] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [x, setX] = useState(0.0);
  const [y, setY] = useState(0.0);
  const [remark, setRemark] = useState('');
  const helpText = t('helpAddRoom');

  async function addRoom() {
    if (!x || !y) {
      toast.error(t('x_y_not_empty'));
      return false;
    }
    if (!floor || !type || !status) {
      toast.error(t('fields_not_empty'));
      return false;
    }
    postRequest(
      `${process.env.REACT_APP_BACKEND_URL}/admin/rooms/create`,
      headers.current,
      (_) => {
        toast.success(t('roomCreated'));
        setX(.0);
        setY(.0);
        setRemark('');
        onClose();
      },
      () => {console.log('Failed to create room in AddRoom.jsx.')},
      JSON.stringify({
        'type': type.roomTypeName,
        'floor_id': floor.floor_id,      
        'x': x,
        'y': y,
        'status': status.roomStatusName,
        'remark': remark,

      })
    );
  }

  /**
   * Set the floor on which we want to create an new room with x- and y-coords.
   * @param {*} data Object with properties floor, room, x, y. 
   */
  const handleChildData = (data) => {
    if (data.floor) {
      setFloor(data.floor);
    }
    if (data.x && data.y) {
      setX(data.x);
      setY(data.y);
    }
  };

    return (
      <LayoutModalAdmin
        isOpen={isOpen}
        onClose={onClose}
        title={t('addRoom')}
        submit={addRoom}
        submitTxt={t('submit')}
      >
        <InfoModal text={helpText}/>
        <FloorImage
          sendDataToParent={handleChildData}
        />
        <RoomDefinition 
          t={t}
          defaultRoomType={type}
          setDefaultRoomType={setType}
          defaultRoomStatus={status}
          setDefaultRoomStatus={setStatus}
          remark={remark}
          setRemark={setRemark}
        />
      </LayoutModalAdmin>
    );
}