import {useState, useRef, useEffect} from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { putRequest } from '../../RequestFunctions/RequestFunctions';
import { roomToOption } from '../Room/RoomAndOption';
import FloorImage from '../../FloorImage/FloorImage.jsx';
import RoomDefinition from './RoomDefinition.js';
import LayoutModalAdmin from '../../Templates/LayoutModalAdmin.jsx';

export default function EditRoom({ isOpen, onClose }) {
  const headers = useRef(JSON.parse(sessionStorage.getItem('headers')));
  const { t } = useTranslation();
  const [room, setRoom] = useState('');
  const [newRoomType, setNewRoomType] = useState('');
  const [newRoomStatus, setNewRoomStatus] = useState('');
  const [newRoomRemark, setNewRoomRemark] = useState('');

  // Set the default.
  useEffect(()=>{
    if (room.roomType) setNewRoomType(room.roomType);
    if (room.roomStatus) setNewRoomStatus(room.roomStatus);
    if (room.remark) setNewRoomRemark(room.remark);
  }, [room])

  async function updateRoom() {
    // console.log(room.id,newRoomStatus, newRoomType, newRoomRemark);
    if (!room || room === '')
      return;
    putRequest( 
      `${process.env.REACT_APP_BACKEND_URL}/admin/rooms`,
      headers.current,
      (_) => {
        toast.success(t('roomChangedSuccessfully'));
        onClose();
      },
      () => {console.log('Failed to handle room change in EditRoom.jsx');},
      JSON.stringify(
        { 
          'room_id': room.id,
          'status': newRoomStatus.roomStatusName,
          'type': newRoomType.roomTypeName,
          'remark': newRoomRemark
        }
      )
    );
  };

  /**
   * Set the floor on which we want to create an new room with x- and y-coords.
   * @param {*} data Object with properties floor, room, x, y. 
   */
  const handleChildData = (data) => {
    if (!data || data.room === '' || data.room.id === room.id) 
      return;
    setRoom(data.room);
  };

  return (
    <LayoutModalAdmin
      title={t('editRoom')}
      isOpen={isOpen}
      onClose={onClose}
      submit={updateRoom}
      submitTxt={t('submit')}
    >
      <FloorImage 
        sendDataToParent={handleChildData}
        click_freely={false}
      />
      {
        room && room !== '' && (
          <> 
            <h2>{roomToOption(room)}</h2>
            <RoomDefinition 
              t={t}
              defaultRoomType={newRoomType}
              setDefaultRoomType={setNewRoomType}
              defaultRoomStatus={newRoomStatus}
              setDefaultRoomStatus={setNewRoomStatus}
              remark={newRoomRemark}
              setRemark={setNewRoomRemark}
            />
          </>
        )
      }
    </LayoutModalAdmin>
  );
}