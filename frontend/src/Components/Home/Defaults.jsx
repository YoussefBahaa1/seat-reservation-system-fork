import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getRequest } from '../RequestFunctions/RequestFunctions';
import { toast } from 'react-toastify';
import { FormControl, InputLabel, Select, MenuItem, Tooltip } from '@mui/material';
import FloorSelector from '../FloorSelector';
import LayoutModal from '../Templates/LayoutModal';
/**
 * This component allows the user to set the default settings.
 * These are the default view view (day, week, month) of the /mybookings page.
 * After setting the defaults, the specified view is pre selected in the calendar in /mybookings.
 * Also the default building and default floor can be set.
 * After setting these, the specified building and floor is always shown first when selecting an desk.
 * @param isOpen Define if the modal shall be open.
 * @param onClose A function that close this modal. 
 * @returns  A component that allows the user to set the default view for /mybookings.
 */
const Defaults = ({ isOpen, onClose }) => {
    const headers = useRef(JSON.parse(sessionStorage.getItem('headers')));
    // Defines which view is displayed per default. Either day, week or month.
    const [defaultViewId, setDefaultViewId] = useState(''); 
    const [views, setViews] = useState([]);
    const [defaultFloor, setDefaultFloor] = useState('');
    const { t, i18n } = useTranslation();
    const handleChildData = (data) => {
        setDefaultFloor(data);
    };

    // Fetch viewmodes
    useEffect(()=>{
        getRequest(
            `${process.env.REACT_APP_BACKEND_URL}/defaults/getViewModes`, 
            headers.current,
            setViews,
            () => {
                console.log('Failed to fetch viewModes in Defaults.jsx.');
            }
        );
    },[]);

    // Fetch defauflt viewmode
    useEffect(()=>{
        if (!localStorage.getItem('userId')) {
            console.log('userId is null');
            return;
        }
        getRequest(
            `${process.env.REACT_APP_BACKEND_URL}/defaults/getDefaultViewForUserId/${localStorage.getItem('userId')}`,
            headers.current,
            defaultView => setDefaultViewId(defaultView.viewModeId),
            () => {
            console.log('Error fetching default building and floor in FloorSelector.js');
            }
        );
    },[views]);
    
    // Save defaults.
    function saveDefaults() {
        if (!localStorage.getItem('userId')) {
            console.log('userId is null');
            return;
        }
        getRequest(
            `${process.env.REACT_APP_BACKEND_URL}/defaults/setDefaults/${localStorage.getItem('userId')}/${defaultViewId}/${defaultFloor.floor_id}`, 
            headers.current,
            (ret => {
                if (ret) {
                    toast.success(t('settingsUpdated'));
                } 
                else {
                    toast.error(t('settingsUpdatedFail'));
                }
                onClose()
                return;
            }),
            () => {
                console.log('Failing to put defaults in Settings.jsx.');
            }
        );
    }

    return (
        <LayoutModal
            isOpen={isOpen} 
            onClose={onClose}
            title={''}
            submit={saveDefaults}
        >
            <br/>
            <h1>{i18n.language === 'de' ? 'Standard Kalenderansicht' : 'Default viewmode'}</h1>
            <Tooltip
                placement='top'
                title={i18n.language === 'de' 
                ? 'Definieren Sie hier Ihre Standardansicht im Buchungskalender.' 
                : 'Define the default view mode for the bookingcalendar.'}
            >
                <FormControl id={`formcontrol_defaultView`} required size='small' fullWidth>
                    <InputLabel>{t('defaultView')}</InputLabel>
                    <Select
                        id={`select_defaultView`}
                        value={defaultViewId}
                        label={t('defaultView')}
                        onChange={e => setDefaultViewId(e.target.value)}
                    >
                        {views.map(view => {
                            return <MenuItem id={`view_${view.viewModeId}`} key={view.viewModeId} value={view.viewModeId}>{t(view.viewModeName)}</MenuItem>;
                        })}
                    </Select>
                </FormControl>
            </Tooltip>
            <br/><br/>
            <h1>{i18n.language === 'de' ? 'Standard Etage' : 'Default floor'}</h1>
            <Tooltip
                placement='right'
                title={i18n.language === 'de' 
                ? 'Definieren Sie hier Ihre Standardetage und Standardgebäude.' 
                : 'Define the default floor and the default building.'}
            >
                <FloorSelector
                    idString={'settings'}
                    sendDataToParent={handleChildData}
                />
            </Tooltip>
    </LayoutModal>
  )
};

export default Defaults;