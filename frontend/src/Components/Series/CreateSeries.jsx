import { useEffect, useState, useRef } from 'react';
import { FormControl,Select, MenuItem, InputLabel } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { postRequest, getRequest } from '../RequestFunctions/RequestFunctions';
import CreateDatePicker from '../misc/CreateDatePicker';
import CreateTimePicker from '../misc/CreateTimePicker';
import { toast } from 'react-toastify';
import { formatDate_yyyymmdd_to_ddmmyyyy } from '../misc/formatDate';
import {DeskTable} from '../misc/DesksTable';
import LayoutPage from '../Templates/LayoutPage';

/**
 * Interface to create series (=recurrent) bookings.
 *  
 * @returns An page that allows to create series bookings.
 */
const CreateSeries = () => {
    const headers = useRef(JSON.parse(sessionStorage.getItem('headers')));
    const { t, i18n } = useTranslation();
    const valueForAllBuildings = useRef('0');
    const [selectedBuilding, setSelectedBuilding] = useState(valueForAllBuildings.current);
    const [possibleDesks, setPossibleDesks] = useState([]);
    const [dates, setDates] = useState([]);
    const [startDate, setStartDate] = useState(new Date()); 
    const [endDate, setEndDate] = useState(new Date());
    const [startTime, setStartTime] = useState(`${process.env.REACT_APP_CREATE_SERIES_DEFAULT_STARTTIME}`);
    const [endTime, setEndTime] = useState(`${process.env.REACT_APP_CREATE_SERIES_DEFAULT_ENDTIME}`);
    const [frequency, setFrequency] = useState(`${process.env.REACT_APP_CREATE_SERIES_DEFAULT_FREQUENCY}`);
    const [repaint, setRepaint] = useState(false)
    const [dayOfTheWeek, setDayOfTheWeek] = useState(0);
    const [buildings, setBuildings] = useState([]);
    
    function create_headline() {
        return i18n.language === 'de' ? 'Erstellen von Serienterminen' : 'Creation of Series Bookings';
    }

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
     * Creates an message that indicates if the series creation was successful or not.
     * @param {*} ret The param that indicates if the creation was successful or not.
     * @returns  A message that indicates if the series creation was successful or not.
     */
    function create_msg(ret) {
        if (ret) {
            return i18n.language === 'de' ? `Serienterminen von ${startDate} bis ${endDate} erfolgreich erstellt.` : `Creation of series bookings from ${startDate} to ${endDate} was successful.`;
        }
        else {
            return i18n.language === 'de' ? `Serienterminen von ${startDate} bis ${endDate} konnte nicht erstellt werden.` : `Creation of series bookings from ${startDate} to ${endDate} was not successful.`;
        }
    }

    /**
     * Fetch dates between startDate and endDate.
     */
    useEffect(() => {
        // The date as iso format. Cut off the time etc to achieve a date like YYYY-MM-DD.
        const startDateStr = new Date(startDate).toISOString().split('T')[0];
        const endDateStr = new Date(endDate).toISOString().split('T')[0];

        if (startDateStr > endDateStr) {
            toast.error(t('startDateBiggerThanStartDate'));
            setDates([]);
            return;
        }
        if (startTime > endTime) {
            toast.error(t('startTimeBiggerThanStartTime'));
            setDates([]);
            return;
        }
        
        const diffInMs = new Date(endDateStr) - new Date(startDateStr);
        const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
        
        /**
         * We want to avoid that users can create series bookings for much longer than 1 year.
         */
        if (370 < diffInDays) {
            toast.error(t('seriesDurationTooLong'));
            setDates([]);
            return;
        }

        postRequest(
            `${process.env.REACT_APP_BACKEND_URL}/series/dates`, 
            headers.current,
            setDates,
            () => {
            console.log('Error fetching dates in CreateSeries.jsx');
            },
            JSON.stringify({
                startDate: startDateStr,
                endDate: endDateStr,
                startTime: startTime,
                endTime: endTime,
                frequency: frequency, 
                dayOfTheWeek: dayOfTheWeek
            })
        );
        }, [t, startDate, endDate, startTime, endTime, frequency, dayOfTheWeek, repaint]); 

    /**
     * Fetch all available desks for dates and times.
     */
    useEffect(() => {
        if (dates.length > 0) {
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
                    dates: dates,
                    startTime: startTime,
                    endTime: endTime
                }));
        } else {
            setPossibleDesks([]);
        }
    }, [dates, endTime, startTime, selectedBuilding, t]);

    /**
     * Create an series object on the backend side.
     * @param {*} desk The desk object for which an series shall be created.
     */
    function addSeries(desk) {
        postRequest(
            `${process.env.REACT_APP_BACKEND_URL}/series`,
            headers.current,
            (ret) => {
                toast.success(create_msg(ret));
                // Be sure to change an depedency of React.useEffect(..) to force an repaint.
                // This is needed because we want to remove desks that are not longer available.
                setRepaint(!repaint);
            },
            () => {console.log('Failed to create a new series in CreateSeries.js.');},
            JSON.stringify({
                'id': 0,
                'rangeDTO': {
                    startDate: startDate,
                    endDate: endDate,
                    startTime: startTime,
                    endTime: endTime,
                    frequency: frequency, 
                    dayOfTheWeek: dayOfTheWeek
                },
                'dates': dates,
                'room': desk.room,
                'desk': desk,
                'email':localStorage.getItem('email')
            })
        );
    };

    function CreateContent() {
        return (
            <>
                <div
                    data-testid='startDate'
                    id='startDate'
                >
                    <CreateDatePicker
                        
                        date={startDate}
                        setter={setStartDate}
                        label={t('startDate')}
                    />
                </div>
                <br/><br/>
                <div
                    data-testid='endDate'
                    id='endDate'
                >
                <CreateDatePicker
                    date={endDate}
                    setter={setEndDate}
                    label={t('endDate')}
                />
                </div>
                <br/><br/>
                <div
                    data-testid='startTime'
                    id='startTime'
                >
                <CreateTimePicker

                    time={startTime}
                    setter={setStartTime}
                    label={t('startTime')}
                />
                </div>
                <br/><br/>
                <div
                    data-testid='endTime'
                    id='endTime'
                >
                <CreateTimePicker
                    time={endTime}
                    setter={setEndTime}
                    label={t('endTime')}
                />
                </div>
                <br/><br/>
                <div
                    data-testid='frequence_select'
                    id='frequence_select'
                >                
                    <FormControl id='createSeries_setFrequency' required={true} fullWidth>
                        <InputLabel id='demo-simple-select-label'>{t('frequency')}</InputLabel>
                        <Select
                            labelId='demo-simple-select-label'
                            value={frequency} 
                            label={t('frequency')}
                            onChange={(e)=>{
                                setFrequency(e.target.value);
                            }}
                        >
                            <MenuItem value='daily'>{t('daily')}</MenuItem>
                            <MenuItem value='weekly'>{t('weekly')}</MenuItem>
                            <MenuItem value='twoweeks'>{t('twoweeks')}</MenuItem>
                            <MenuItem value='threeweeks'>{t('threeweeks')}</MenuItem>
                            <MenuItem value='monthly'>{t('monthly')}</MenuItem>
                        </Select>
                    </FormControl>
                </div>
                <br/><br/>
                <div id='div_createSeries_selectBuilding'>
                <FormControl id='createSeries_selectBuilding' required={true} fullWidth>
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
                </div>
                <br/><br/>
                <div
                    data-testid='dayOfTheWeek_select'
                    id='dayOfTheWeek_select'
                >
                <FormControl id='createSeries_setDayOfTheWeek' disabled={frequency === 'daily'} required={true} fullWidth>
                    <InputLabel id='demo-simple-select-label'>{t('dayOfTheWeek')}</InputLabel>
                    <Select
                        value={dayOfTheWeek} 
                        label={t('dayOfTheWeek')}
                        onChange={(e)=>{
                            setDayOfTheWeek(e.target.value);
                        }}
                    >
                        <MenuItem value='0'>{t('monday')}</MenuItem>
                        <MenuItem value='1'>{t('tuesday')}</MenuItem>
                        <MenuItem value='2'>{t('wednesday')}</MenuItem>
                        <MenuItem value='3'>{t('thursday')}</MenuItem>
                        <MenuItem value='4'>{t('friday')}</MenuItem>
                    </Select>
                </FormControl>
                </div>
                <br/><br/>
                <div id='dates_labels'>
                    <FormControl id='createSeries_calculateDates' disabled={true} fullWidth>
                        {dates.length > 0 ? (
                            <div
                                data-testid='dates_label'
                                id='dates_label'
                            >
                                <h3>{t('calculatedDates')}</h3>
                                <div style={{ width: '100%', overflowX: 'auto', whiteSpace: 'nowrap', border: '1px solid #ccc', padding: '10px' }}>
                                    {dates.map((date, index) => ( (
                                    <span key={index} style={{ display: "inline-block", padding: "10px", border: "1px solid #ddd", marginRight: "10px" }}>
                                        {formatDate_yyyymmdd_to_ddmmyyyy(date)}
                                    </span>
                                )))}
                                </div>
                            </div>
                        ) : 
                        <h3>{t('timerangeIsNotValid')}</h3>
                    }
                    </FormControl>
                </div>
                <br/><br/>
                {
                    dates && dates.length > 0 && (possibleDesks && possibleDesks.length > 0 ? <DeskTable name={'createSeries'} desks={possibleDesks} submit_function={addSeries}/> : <div>{t('noDesksForRange')}</div>)
                }
            </>
        );
    };
    
    return (
        <LayoutPage
            title={create_headline()}
            helpText={i18n.language === 'de' ? 'Wählen Sie zunächst das Start- und Endedatum, wie auch den Start- und Endzeitpunkt aus.<br/>Legen Sie im Anschluss eine Frequenz und das gewünschte Gebäude fest. Gegegebenfalls können Sie noch einen Wochentag setzen.<br/>In der unteren Tabelle können Sie nun ein mögliches Zimmer für Ihre Serienbuchungen auswählen.' : 'First, select the start and end date, as well as the start and end time.</br>Then, choose a frequency and the desired building. If necessary, you can also set a weekday.</br>In the table below, you can now select a possible room for your recurring bookings'}
            withPaddingX={true}
        >
            <CreateContent/>
        </LayoutPage>
    );
};

export default CreateSeries;
