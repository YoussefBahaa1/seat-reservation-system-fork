import { useRef, useEffect, useState } from 'react';
import moment from 'moment';
import { useTranslation } from 'react-i18next';
import { FormControl,Select, MenuItem, InputLabel } from '@mui/material';
import CreateDatePicker from '../misc/CreateDatePicker';
import CreateTimePicker from '../misc/CreateTimePicker';
import 'react-confirm-alert/src/react-confirm-alert.css';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { toast } from 'react-toastify';
import {postRequest, getRequest} from '../RequestFunctions/RequestFunctions';
import {DeskTable} from '../misc/DesksTable';
import bookingPostRequest from '../misc/bookingPostRequest';
import LayoutPage from '../Templates/LayoutPage';

const FreeDesks = () => {
    const headers = useRef(JSON.parse(sessionStorage.getItem('headers')));
    const { t, i18n } = useTranslation();
    const valueForAllBuildings = useRef('0');
    const [selectedBuilding, setSelectedBuilding] = useState(valueForAllBuildings.current);
    const [possibleDesks, setPossibleDesks] = useState([]);
    const [bookingDate, setBookingDate] = useState(new Date()); 
    const defaultStartTime = bookingDate.toLocaleTimeString();
    const [repaint, setRepaint] = useState(false)
    const [buildings, setBuildings] = useState([]);
    // Default endTime is 2 hours ahead.
    const bookingEndDate = new Date(bookingDate);
    bookingEndDate.setHours(bookingEndDate.getHours() + 2);
    const defaultEndTime = bookingEndDate.toLocaleTimeString();

    const [startTime, setStartTime] = useState(defaultStartTime);
    const [endTime, setEndTime] = useState(defaultEndTime);

    /**
     * Fetch all buildings and if an default building is found 
     * set it as the selected building.
     */
    useEffect(()=>{
        getRequest(
            `${process.env.REACT_APP_BACKEND_URL}/buildings/all`,
            headers.current,
            buildings=>{
                setBuildings(buildings);
                setSelectedBuilding(valueForAllBuildings.current);
                const userId = localStorage.getItem('userId');
                if (!userId) {
                    console.log('userId is null');   
                    return;
                }
                getRequest(
                    `${process.env.REACT_APP_BACKEND_URL}/defaults/getDefaultFloorForUserId/${userId}`,
                    headers.current,
                    received_defaultFloor => {
                        if (received_defaultFloor && received_defaultFloor.building && received_defaultFloor.building.id) {
                            setSelectedBuilding(received_defaultFloor.building.id);
                        }
                    },
                    () => {
                    console.log('Error fetching default building and floor in FloorSelector.js');
                    }
                );
            },
            () => {console.log('Error fetching buildings in fetchBuildings.js');}
        );
    }, []);

    /**
     * Fetch all available desks for date and times.
     */
    useEffect(() => {
        if (startTime > endTime) {
            toast.error(t('startTimeBiggerThanStartTime'));
            setPossibleDesks([]);
            return;
        }
        const url = selectedBuilding === valueForAllBuildings.current ? 
        `${process.env.REACT_APP_BACKEND_URL}/series/desksForDatesAndTimes` : 
        `${process.env.REACT_APP_BACKEND_URL}/series/desksForBuildingAndDatesAndTimes/${selectedBuilding}`
        postRequest(
            url, 
            headers.current,
            setPossibleDesks,
            () => {
                console.log('Error fetching desks in CreateSeries');
            },
            JSON.stringify({
                dates: [bookingDate],
                startTime: startTime,
                endTime: endTime
            })
        );
    }, [bookingDate, selectedBuilding, t, endTime, startTime, repaint]);
    
    function addBooking(selectedDesk) {
        
        const bookingDTO = {
            userId: localStorage.getItem('userId'),
            roomId: selectedDesk.room.id,
            deskId: selectedDesk.id,
            day: moment(bookingDate).format('YYYY-MM-DD'),
            begin: startTime,
            end: endTime
        };
        bookingPostRequest('FreeDesks.jsx', bookingDTO, selectedDesk.remark, headers, t, (_)=>{setRepaint(!repaint);})
    };
    function CreateContent() {
        return (
            <>
                <div
                    id='freeDesks_bookingDate'
                >
                    <CreateDatePicker
                        date={bookingDate}
                        setter={setBookingDate}
                        label={t('day')}
                    />
                </div>
                <br/><br/>
                <div
                    id='freeDesks_startTime'
                >
                <CreateTimePicker

                    time={startTime}
                    setter={setStartTime}
                    label={t('startTime')}
                />
                </div>
                <br/><br/>
                <div
                    id='freeDesks_endTime'
                >
                    <CreateTimePicker

                        time={endTime}
                        setter={setEndTime}
                        label={t('endTime')}
                    />
                    </div>
                <br/><br/>
                    <FormControl id='freeDesks_selectBuilding' required={true} fullWidth>
                        <InputLabel id='demo-simple-select-label'>{t('building')}</InputLabel>
                        <Select
                            value={selectedBuilding} 
                            label={t('Building')}
                            onChange={(e)=>{
                                setSelectedBuilding(e.target.value);
                            }}
                        >
                            {
                                [
                                    <MenuItem id={`createSeries_building_all`} key={valueForAllBuildings.current} value={valueForAllBuildings.current}>{t('any')}</MenuItem>,
                                    ...buildings.map(e => (
                                    <MenuItem id={`createSeries_building_${e.id}`} key={e.id} value={e.id}>
                                        {e.name}
                                    </MenuItem>
                                    ))
                                ]
                            }
                        </Select>
                    </FormControl>
                <br/><br/>
                {
                    (possibleDesks && possibleDesks.length > 0 ? <DeskTable name={'freeDesks'} desks={possibleDesks} submit_function={addBooking} /> : <div>{t('noDesksForRange')}</div>)
                }
            </>
        );
    }

    function create_helpText() {
        return i18n.language === 'de' ? 'Wählen Sie einen Tag, die Start- und Endzeit sowie ein Gebäude aus. In der unten stehende Tabelle können Sie alle freien Arbeitsplätze einsehen und buchen.' : 'Select a day, start and end time, and a building. In the table below, you can view and book all available desks.'
    }

    return (
        <LayoutPage
            title={t('freeDesks')}
            helpText={create_helpText()}
            withPaddingX={true}
        >
            <CreateContent/>
        </LayoutPage>
    );
};

export default FreeDesks;