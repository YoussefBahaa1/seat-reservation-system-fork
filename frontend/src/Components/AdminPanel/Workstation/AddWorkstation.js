import React, {useRef} from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from "react-i18next";
import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';
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
  const [remark, setRemark]= React.useState('');
  const [workstationType, setWorkstationType] = React.useState('Standard');
  const [monitorsQuantity, setMonitorsQuantity] = React.useState(1);
  const [deskHeightAdjustable, setDeskHeightAdjustable] = React.useState(false);
  const [technologyDockingStation, setTechnologyDockingStation] = React.useState(false);
  const [technologyWebcam, setTechnologyWebcam] = React.useState(false);
  const [technologyHeadset, setTechnologyHeadset] = React.useState(false);
  const [specialFeatures, setSpecialFeatures] = React.useState('');
  const [fixed, setFixed] = React.useState(false);

  const helpText = t('helpAddWorkstation');

  async function addWorkstation(){
    if(!room){
      toast.error(t('selectRoomError'));
      return false;
    }
    if (!String(remark || '').trim()) {
      toast.error(t('fields_not_empty'));
      return false;
    }
    const roomId = room.id;
    
    if(!roomId){
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
        'remark': remark.trim(),
        'fixed': Boolean(fixed),
        'workstationType': workstationType,
        'monitorsQuantity': monitorsQuantity,
        'deskHeightAdjustable': deskHeightAdjustable,
        'technologyDockingStation': technologyDockingStation,
        'technologyWebcam': technologyWebcam,
        'technologyHeadset': technologyHeadset,
        'specialFeatures': specialFeatures
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
              remark={remark}
              setRemark={setRemark}
              workstationType={workstationType}
              setWorkstationType={setWorkstationType}
              monitorsQuantity={monitorsQuantity}
              setMonitorsQuantity={setMonitorsQuantity}
              deskHeightAdjustable={deskHeightAdjustable}
              setDeskHeightAdjustable={setDeskHeightAdjustable}
              technologyDockingStation={technologyDockingStation}
              setTechnologyDockingStation={setTechnologyDockingStation}
              technologyWebcam={technologyWebcam}
              setTechnologyWebcam={setTechnologyWebcam}
              technologyHeadset={technologyHeadset}
              setTechnologyHeadset={setTechnologyHeadset}
              specialFeatures={specialFeatures}
              setSpecialFeatures={setSpecialFeatures}
            />
            <br/>
            <FormControl required size='small' fullWidth sx={{ mt: 2 }}>
              <InputLabel>{t('fixed')}</InputLabel>
              <Select
                value={fixed ? 'true' : 'false'}
                label={t('fixed')}
                onChange={(e) => setFixed(e.target.value === 'true')}
              >
                <MenuItem value='true'>{t('yes')}</MenuItem>
                <MenuItem value='false'>{t('no')}</MenuItem>
              </Select>
            </FormControl>
          </div>
        )
      }
    </LayoutModalAdmin>
  );
}
