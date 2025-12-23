import React, {useState, useRef, useEffect} from 'react';
import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { getRequest } from './RequestFunctions/RequestFunctions';

/**
 * GUI to select an building and an floor.
 * @param {*} idString An string that add to the id's in the html template.
 * @param {*} sendDataToParent The function that is called when data has to be transmitted to the parent component. 
 */
const FloorSelector = ({
  idString,
  sendDataToParent
}) => {
  const { t } = useTranslation();
  const headers = useRef(JSON.parse(sessionStorage.getItem('headers')));
  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);
  const [building, setBuilding] = useState('');
  const [floor, setFloor] = useState('');
  // Is set to true if the default building was loaded.
  const defaultBuildingWasLoaded = useRef(false);
  // Is set to true if the default floor was loaded.
  const defaultFloorWasLoaded = useRef(false);

  React.useEffect(()=>{
    sendDataToParent(floor);
  },[sendDataToParent, floor]);

  /**
   * Fetch all buildings. Also check if the default building was fetched.
   * If not: do so and set it as the current building. Otherwise: set the first
   * building as the current one. Also do so if the user has no default building.
   */
  useEffect(() => {
    getRequest(
        `${process.env.REACT_APP_BACKEND_URL}/buildings/all`,
        headers.current,
        received_buildings => {
          setBuildings(received_buildings);
          
          if (defaultBuildingWasLoaded.current) {
            setBuilding(received_buildings[0])
          }
          else {
            defaultBuildingWasLoaded.current = true;
            const userId = localStorage.getItem('userId');
            if (!userId) return;
            getRequest(
              `${process.env.REACT_APP_BACKEND_URL}/defaults/getDefaultFloorForUserId/${userId}`,
              headers.current,
              received_defaultFloor => {
                if (received_defaultFloor && received_defaultFloor.building && received_defaultFloor.building.id) {
                  setBuilding(received_defaultFloor.building);
                }
                else {
                  setBuilding(received_buildings[0])
                }
              },
              () => {
                console.log('Error fetching default building and floor in FloorSelector.js');
              }
            );
          }
        },
        () => {
            console.log('Error fetching buildings in fetchBuildings.js');
        }
    );
  },[]);

  /**
   * Fetch all floors for the current building. Also check if the default floor was fetched.
   * If not: do so and set it as the current floor. Otherwise: set the first
   * floor as the current one. Also do so if the user has no default floor.
   */
  useEffect(() => {
    if (!building.id)
      return;
    getRequest(
      `${process.env.REACT_APP_BACKEND_URL}/floors/getAllFloorsForBuildingId/${building.id}`,
      headers.current,
      received_floors => {
        setFloors(received_floors);
        if (defaultFloorWasLoaded.current) {
          setFloor(received_floors[0]);
        }
        else {
          defaultFloorWasLoaded.current = true;
          const userId = localStorage.getItem('userId');
          if (!userId) return;
          getRequest(
            `${process.env.REACT_APP_BACKEND_URL}/defaults/getDefaultFloorForUserId/${userId}`,
            headers.current,
            received_defaultFloor => {
              if (received_defaultFloor && received_defaultFloor.floor_id) {
                setFloor(received_defaultFloor);
              }
              else {
                setFloor(received_floors[0]);
              }
            },
            () => {
              console.log('Error fetching default floor and floor in FloorSelector.js');
            }
          );
        }
      },
      () => {
          console.log('Error fetching floors in fetchFloors.js');
      }
    );
  }, [building.id]);

  return (
    <>
    <FormControl id={`${idString}_floorSelector_setBuilding`} required size='small' fullWidth>
        <InputLabel>{t('building')}</InputLabel>
            <Select
                id={`${idString}_select-building`}
                value={
                  building !== '' ? building.id : ''
                }
                label={t('building')}
                onChange={(e) => {
                  setFloor('');
                  setBuilding(buildings.find(b => b.id === e.target.value) || '');
                }}
            >
              {buildings.map(e => {
                  return <MenuItem id={`${idString}_building_${e.id}`} key={e.id} value={e.id}>{e.name}</MenuItem>;
              })}
            </Select>
        </FormControl>
        <br/><br/>
        <FormControl id={`${idString}_floorSelector_setFloor`} required size='small' fullWidth>
            <InputLabel>{t('floor')}</InputLabel>
            <Select
                id={`${idString}_select-floor`}
                value={
                  floor !== '' ? floor.floor_id : ''
                }
                label={t('floor')}
                onChange={(e) => {
                  setFloor(floors.find(f => f.floor_id === e.target.value) || '');
                }}
            >
              {floors.map(e => {
                  return <MenuItem id={`${idString}_floor_${e.floor_id}`} key={e.floor_id} value={e.floor_id}>{e.name}</MenuItem>;
              })}
            </Select>
        </FormControl>
    </>
  );
};

export default FloorSelector;
