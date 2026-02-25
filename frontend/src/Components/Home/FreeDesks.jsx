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
import ReportDefectModal from '../Defects/ReportDefectModal';

const FreeDesks = () => {
    const headers = useRef(JSON.parse(sessionStorage.getItem('headers')));
    const { t, i18n } = useTranslation();
    const valueForAllBuildings = useRef('0');
    const [selectedBuilding, setSelectedBuilding] = useState(valueForAllBuildings.current);
    const [possibleDesks, setPossibleDesks] = useState([]);
    const [bookingDate, setBookingDate] = useState(new Date()); 
    const roundUpToNextHalfHour = (d) => {
        const copy = new Date(d);
        copy.setSeconds(0, 0);
        const mins = copy.getMinutes();
        if (mins === 0 || mins === 30) return copy;
        if (mins < 30) {
            copy.setMinutes(30);
        } else {
            copy.setHours(copy.getHours() + 1);
            copy.setMinutes(0);
        }
        return copy;
    };
    const formatTime24 = (d) =>
        d.toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit' });
    const defaultStartDate = roundUpToNextHalfHour(bookingDate);
    const defaultStartTime = formatTime24(defaultStartDate);
    const [repaint, setRepaint] = useState(false)
    const [buildings, setBuildings] = useState([]);
    // Default endTime is 2 hours ahead.
    const bookingEndDate = new Date(defaultStartDate);
    bookingEndDate.setHours(bookingEndDate.getHours() + 2);
    const defaultEndTime = formatTime24(bookingEndDate);

    const [startTime, setStartTime] = useState(defaultStartTime);
    const [endTime, setEndTime] = useState(defaultEndTime);
    const [reportDefectDeskId, setReportDefectDeskId] = useState(null);
    const [isReportDefectOpen, setIsReportDefectOpen] = useState(false);

    const normalizeTimeToSql = (timeValue) => {
        if (!timeValue) return '';
        const [hours = '00', minutes = '00'] = String(timeValue).split(':');
        return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00`;
    };

    const isHalfHourAligned = (timeValue) => {
        const parts = String(timeValue || '').split(':');
        if (parts.length < 2) return false;
        const minute = Number(parts[1]);
        return Number.isFinite(minute) && minute % 30 === 0;
    };

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
        if (!isHalfHourAligned(startTime) || !isHalfHourAligned(endTime)) {
            toast.warning(t('bookingTimeAlignmentError'));
            return;
        }
        
        const bookingDTO = {
            userId: localStorage.getItem('userId'),
            roomId: selectedDesk.room.id,
            deskId: selectedDesk.id,
            day: moment(bookingDate).format('YYYY-MM-DD'),
            begin: normalizeTimeToSql(startTime),
            end: normalizeTimeToSql(endTime)
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
                    stepSeconds={1800}
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
                        stepSeconds={1800}
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
                    (possibleDesks && possibleDesks.length > 0 ? <DeskTable name={'freeDesks'} desks={possibleDesks} submit_function={addBooking} onReportDefect={(desk) => {
                        getRequest(
                            `${process.env.REACT_APP_BACKEND_URL}/defects/active?deskId=${desk.id}`,
                            headers.current,
                            () => toast.warning(t('defectAlreadyOpen')),
                            (status) => {
                                if (status === 404) {
                                    setReportDefectDeskId(desk.id);
                                    setIsReportDefectOpen(true);
                                } else {
                                    toast.error(t('defectReportFailed'));
                                }
                            }
                        );
                    }} /> : <div>{t('noDesksForRange')}</div>)
                }
            </>
        );
    }

    function create_helpText() {
        return i18n.language === 'de' ? 'Wählen Sie einen Tag, die Start- und Endzeit sowie ein Gebäude aus. In der unten stehende Tabelle können Sie alle freien Arbeitsplätze einsehen und buchen.' : 'Select a day, start and end time, and a building. In the table below, you can view and book all available desks.'
    }

    return (
        <>
        <LayoutPage
            title={t('freeDesks')}
            helpText={create_helpText()}
            withPaddingX={true}
        >
            <CreateContent/>
        </LayoutPage>
        <ReportDefectModal
            isOpen={isReportDefectOpen}
            onClose={() => setIsReportDefectOpen(false)}
            deskId={reportDefectDeskId}
        />
        </>
    );
};

export default FreeDesks;
