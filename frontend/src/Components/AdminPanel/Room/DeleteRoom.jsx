import DeleteFf from '../../DeleteFf';
import React, {useRef} from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from "react-i18next";
import {deleteRequest} from '../../RequestFunctions/RequestFunctions';
import FloorImage from '../../FloorImage/FloorImage.jsx';
import InfoModal from '../../InfoModal.jsx';
import LayoutModalAdmin from '../../Templates/LayoutModalAdmin.jsx';

export default function DeleteRoom({ open, close }) {
  const headers = useRef(JSON.parse(sessionStorage.getItem('headers')));
  const { t } = useTranslation();
  const [openFfDialog, setOpenFfDialog] = React.useState(false);
  const [room, setRoom] = React.useState('');
  const helpText = t('helpDeleteRoom');

  async function deleteRoomFf() {
    if (!room || room === '')
      return;

    deleteRequest(
      //`${process.env.REACT_APP_BACKEND_URL}/rooms/ff/${room.id}`,
      `${process.env.REACT_APP_BACKEND_URL}/admin/rooms/ff/${room.id}`,
      headers.current,
      (_) => {
        toast.success(t('roomDeleted'));
        //deleteRoomModal();
        close();
      }
    );
  }

  /**
   * Set the room, that we want to delete.
   * @param {*} data Object with properties floor, room, x, y. 
   */
  const handleChildData = (data) => {
    if (!data || data.room === '' || data.room.id === room.id) 
      return;
      
    setRoom(data.room);

    deleteRequest(
      //`${process.env.REACT_APP_BACKEND_URL}/rooms/${data.room.id}`,
      `${process.env.REACT_APP_BACKEND_URL}/admin/rooms/${data.room.id}`,
      headers.current,
      (data) => {
        if (data !== 0) {
          setOpenFfDialog(true);
        }
        else {
          toast.success(t('roomDeleted'));
          close();//deleteRoomModal();
        }
      },
      () => {'Failed to delete room in DeleteRoom.jsx.'},
      
    );  
  };


  return (
    <LayoutModalAdmin
      onClose={close}
      isOpen={open}
      title={t('deleteRoom')}
    >
      <InfoModal text={helpText}/>
      <DeleteFf 
        open={openFfDialog}
        onClose={close}
        onDelete={deleteRoomFf}
        text={t('fFDeleteRoom')}
      />

            <FloorImage 
              present_color='red'
              click_freely={false}
              sendDataToParent={handleChildData}
            />
    </LayoutModalAdmin>
  );
}