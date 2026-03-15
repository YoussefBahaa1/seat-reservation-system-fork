import {useState, useRef, useEffect} from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import {putRequest} from '../../RequestFunctions/RequestFunctions';
import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';
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
  const [remark, setRemark]= useState('');
  const [workstationType, setWorkstationType] = useState('Standard');
  const [monitorsQuantity, setMonitorsQuantity] = useState(1);
  const [deskHeightAdjustable, setDeskHeightAdjustable] = useState(false);
  const [technologyDockingStation, setTechnologyDockingStation] = useState(false);
  const [technologyWebcam, setTechnologyWebcam] = useState(false);
  const [technologyHeadset, setTechnologyHeadset] = useState(false);
  const [specialFeatures, setSpecialFeatures] = useState('');
  const [fixed, setFixed] = useState(false);
  const helpText = t('helpEditWorkstation');

  async function updateWorkstation() {
    if (selectedDesk?.id) {
      if (!String(remark || '').trim()) {
        toast.error(t('fields_not_empty'));
        return;
      }
      putRequest(
        `${process.env.REACT_APP_BACKEND_URL}/admin/desks/updateDesk`,
        headers.current,
        (_) => {
          toast.success(t('deskUpdate'));
          onClose();
        },
        () => {console.log('Failed to update workstation in EditWorkstation.js');},
        JSON.stringify({
          'deskId': selectedDesk.id,
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
    else {
      toast.error(t('deskUpdateFailed'));
    }
  };

  useEffect(()=>{
    if (!selectedDesk) return;
    setRemark(selectedDesk.remark || '');
    setWorkstationType(selectedDesk.workstationType || 'Standard');
    setMonitorsQuantity(selectedDesk.monitorsQuantity ?? 1);
    setDeskHeightAdjustable(Boolean(selectedDesk.deskHeightAdjustable));
    setTechnologyDockingStation(Boolean(selectedDesk.technologyDockingStation));
    setTechnologyWebcam(Boolean(selectedDesk.technologyWebcam));
    setTechnologyHeadset(Boolean(selectedDesk.technologyHeadset));
    setSpecialFeatures(selectedDesk.specialFeatures || '');
    setFixed(Boolean(selectedDesk.fixed));
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
  };

  return (
    <LayoutModalAdmin
      onClose={onClose}
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
          <>
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
          </>
        )
      }
    </LayoutModalAdmin>
  );
}
