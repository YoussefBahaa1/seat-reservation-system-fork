import { useRef, useEffect, useMemo, useState } from 'react';
import moment from 'moment';
import { useTranslation } from 'react-i18next';
import {
    Box,
    Button,
    Checkbox,
    FormControl,
    InputLabel,
    ListItemText,
    MenuItem,
    Select,
    Typography,
} from '@mui/material';
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
import {
    MONITOR_COUNT_VALUES,
    technologyOptions,
    workstationTypeOptions,
} from '../misc/workstationMetadata';

const FILTER_STORAGE_KEY = 'freeDesksAdvancedFilters';
const emptyFilters = Object.freeze({
    types: [],
    monitorCounts: [],
    deskHeightAdjustable: [],
    technologySelections: [],
    specialFeatures: [],
});

const normalizeFilters = (filters) => ({
    types: Array.isArray(filters?.types) ? [...new Set(filters.types.filter(Boolean))] : [],
    monitorCounts: Array.isArray(filters?.monitorCounts)
        ? [...new Set(filters.monitorCounts.map(Number).filter((value) => Number.isInteger(value) && value >= 0 && value <= 3))]
        : [],
    deskHeightAdjustable: Array.isArray(filters?.deskHeightAdjustable)
        ? [...new Set(filters.deskHeightAdjustable.filter((value) => typeof value === 'boolean'))]
        : [],
    technologySelections: Array.isArray(filters?.technologySelections)
        ? [...new Set(filters.technologySelections.filter(Boolean))]
        : [],
    specialFeatures: Array.isArray(filters?.specialFeatures)
        ? [...new Set(filters.specialFeatures.filter((value) => typeof value === 'boolean'))]
        : [],
});

const parseStoredFilters = () => {
    try {
        return normalizeFilters(JSON.parse(sessionStorage.getItem(FILTER_STORAGE_KEY) || 'null') || emptyFilters);
    } catch {
        return { ...emptyFilters };
    }
};

const FreeDesks = () => {
    const headers = useRef(JSON.parse(sessionStorage.getItem('headers')));
    const { t, i18n } = useTranslation();
    const valueForAllBuildings = useRef('0');
    const [selectedBuilding, setSelectedBuilding] = useState(valueForAllBuildings.current);
    const [possibleDesks, setPossibleDesks] = useState([]);
    const [bookingDate, setBookingDate] = useState(new Date());
    const [repaint, setRepaint] = useState(false);
    const [buildings, setBuildings] = useState([]);
    const [reportDefectDeskId, setReportDefectDeskId] = useState(null);
    const [isReportDefectOpen, setIsReportDefectOpen] = useState(false);
    const [filters, setFilters] = useState(parseStoredFilters);

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
    const bookingEndDate = new Date(defaultStartDate);
    bookingEndDate.setHours(bookingEndDate.getHours() + 2);
    const defaultEndTime = formatTime24(bookingEndDate);
    const [startTime, setStartTime] = useState(defaultStartTime);
    const [endTime, setEndTime] = useState(defaultEndTime);

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

    const filterOptions = useMemo(() => ({
        types: workstationTypeOptions(t).map((option) => ({
            ...option,
            encoded: `type:${option.value}`,
        })),
        monitorCounts: MONITOR_COUNT_VALUES.map((value) => ({
            value,
            label: String(value),
            encoded: `monitor:${value}`,
        })),
        deskHeightAdjustable: [
            { value: true, label: t('adjustable'), encoded: 'adjustable:true' },
            { value: false, label: t('notAdjustable'), encoded: 'adjustable:false' },
        ],
        technologySelections: technologyOptions(t).map((option) => ({
            ...option,
            encoded: `technology:${option.value}`,
        })),
        specialFeatures: [
            { value: true, label: t('yes'), encoded: 'special:true' },
            { value: false, label: t('no'), encoded: 'special:false' },
        ],
    }), [t]);

    const getSelectedValuesForCategory = (categoryKey) => {
        switch (categoryKey) {
        case 'types':
            return filters.types.map((value) => `type:${value}`);
        case 'monitorCounts':
            return filters.monitorCounts.map((value) => `monitor:${value}`);
        case 'deskHeightAdjustable':
            return filters.deskHeightAdjustable.map((value) => `adjustable:${value}`);
        case 'technologySelections':
            return filters.technologySelections.map((value) => `technology:${value}`);
        case 'specialFeatures':
            return filters.specialFeatures.map((value) => `special:${value}`);
        default:
            return [];
        }
    };

    const renderSelectedValues = (categoryKey) => {
        const selectedValues = getSelectedValuesForCategory(categoryKey);
        if (!selectedValues.length) {
            return t('noFiltersApplied');
        }
        const optionMap = new Map(filterOptions[categoryKey].map((option) => [option.encoded, option.label]));
        return selectedValues.map((value) => optionMap.get(value) || value).join(', ');
    };

    const toggleFilterValue = (categoryKey, encodedValue) => {
        setFilters((prev) => {
            const next = normalizeFilters(prev);
            if (categoryKey === 'types' && encodedValue.startsWith('type:')) {
                const value = encodedValue.replace('type:', '');
                next.types = next.types.includes(value)
                    ? next.types.filter((entry) => entry !== value)
                    : [...next.types, value];
            } else if (categoryKey === 'monitorCounts' && encodedValue.startsWith('monitor:')) {
                const value = Number(encodedValue.replace('monitor:', ''));
                next.monitorCounts = next.monitorCounts.includes(value)
                    ? next.monitorCounts.filter((entry) => entry !== value)
                    : [...next.monitorCounts, value];
            } else if (categoryKey === 'deskHeightAdjustable' && encodedValue.startsWith('adjustable:')) {
                const value = encodedValue.replace('adjustable:', '') === 'true';
                next.deskHeightAdjustable = next.deskHeightAdjustable.includes(value) ? [] : [value];
            } else if (categoryKey === 'technologySelections' && encodedValue.startsWith('technology:')) {
                const value = encodedValue.replace('technology:', '');
                next.technologySelections = next.technologySelections.includes(value)
                    ? next.technologySelections.filter((entry) => entry !== value)
                    : [...next.technologySelections, value];
            } else if (categoryKey === 'specialFeatures' && encodedValue.startsWith('special:')) {
                const value = encodedValue.replace('special:', '') === 'true';
                next.specialFeatures = next.specialFeatures.includes(value) ? [] : [value];
            }
            return next;
        });
    };

    const keepFilterMenuOpen = (event) => {
        event.preventDefault();
    };

    const filterSelectConfigs = useMemo(() => ([
        { key: 'types', label: t('ergonomics') },
        { key: 'monitorCounts', label: t('monitors') },
        { key: 'deskHeightAdjustable', label: t('deskType') },
        { key: 'technologySelections', label: t('technology') },
        { key: 'specialFeatures', label: t('specialFeatures') },
    ]), [t]);

    const resetFilters = () => setFilters({ ...emptyFilters });

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

    useEffect(() => {
        sessionStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters));
    }, [filters]);

    useEffect(() => {
        if (startTime > endTime) {
            toast.error(t('startTimeBiggerThanStartTime'));
            setPossibleDesks([]);
            return;
        }
        const url = selectedBuilding === valueForAllBuildings.current
            ? `${process.env.REACT_APP_BACKEND_URL}/series/search/desks`
            : `${process.env.REACT_APP_BACKEND_URL}/series/search/desks/${selectedBuilding}`;
        postRequest(
            url,
            headers.current,
            setPossibleDesks,
            () => {
                console.log('Error fetching desks in FreeDesks');
            },
            JSON.stringify({
                dates: [bookingDate],
                startTime: startTime,
                endTime: endTime,
                filters,
            })
        );
    }, [bookingDate, selectedBuilding, t, endTime, startTime, repaint, filters]);

    function addBooking(selectedDesk) {
        if (!isHalfHourAligned(startTime) || !isHalfHourAligned(endTime)) {
            toast.warning(t('bookingTimeAlignmentError'));
            return;
        }

        const lockRequestDTO = {
            deskId: selectedDesk.id,
            day: moment(bookingDate).format('YYYY-MM-DD'),
        };

        const releaseLock = () => {
            postRequest(
                `${process.env.REACT_APP_BACKEND_URL}/booking-locks/release`,
                headers.current,
                () => {},
                () => {},
                JSON.stringify(lockRequestDTO)
            );
        };

        const bookingDTO = {
            userId: localStorage.getItem('userId'),
            roomId: selectedDesk.room.id,
            deskId: selectedDesk.id,
            day: moment(bookingDate).format('YYYY-MM-DD'),
            begin: normalizeTimeToSql(startTime),
            end: normalizeTimeToSql(endTime)
        };
        postRequest(
            `${process.env.REACT_APP_BACKEND_URL}/booking-locks/acquire`,
            headers.current,
            () => {
                bookingPostRequest(
                    'FreeDesks.jsx',
                    bookingDTO,
                    selectedDesk.remark,
                    headers,
                    t,
                    (_)=>{setRepaint(!repaint);},
                    {
                        onCancel: releaseLock,
                        onError: releaseLock,
                    }
                );
            },
            (status, data) => {
                if (status === 409 || (typeof data?.error === 'string' && data.error.toLowerCase().includes('currently being booked'))) {
                    toast.warning(t('currentlyBeingBooked'));
                    return;
                }
                toast.error((typeof data?.error === 'string' && data.error) || t('httpOther'));
            },
            JSON.stringify(lockRequestDTO)
        );
    }

    function CreateContent() {
        return (
            <>
                <div id='freeDesks_bookingDate'>
                    <CreateDatePicker
                        date={bookingDate}
                        setter={setBookingDate}
                        label={t('day')}
                    />
                </div>
                <br/><br/>
                <div id='freeDesks_startTime'>
                    <CreateTimePicker
                        time={startTime}
                        setter={setStartTime}
                        label={t('startTime')}
                        stepSeconds={1800}
                    />
                </div>
                <br/><br/>
                <div id='freeDesks_endTime'>
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
                        label={t('building')}
                        onChange={(e)=>{
                            setSelectedBuilding(e.target.value);
                        }}
                    >
                        {[
                            <MenuItem id='createSeries_building_all' key={valueForAllBuildings.current} value={valueForAllBuildings.current}>{t('any')}</MenuItem>,
                            ...buildings.map(e => (
                                <MenuItem id={`createSeries_building_${e.id}`} key={e.id} value={e.id}>
                                    {e.name}
                                </MenuItem>
                            ))
                        ]}
                    </Select>
                </FormControl>
                <br/><br/>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 2 }}>
                    {filterSelectConfigs.map((config) => {
                        const selectedValues = getSelectedValuesForCategory(config.key);
                        return (
                            <FormControl
                                key={config.key}
                                id={`freeDesks_${config.key}`}
                                sx={{ minWidth: 170, flex: '1 1 170px' }}
                                size='small'
                            >
                                <InputLabel>{config.label}</InputLabel>
                                <Select
                                    multiple
                                    value={selectedValues}
                                    label={config.label}
                                    onChange={() => {}}
                                    renderValue={() => renderSelectedValues(config.key)}
                                    MenuProps={{
                                        PaperProps: {
                                            sx: {
                                                maxHeight: 320,
                                            },
                                        },
                                    }}
                                >
                                    {filterOptions[config.key].map((option) => (
                                        <MenuItem
                                            key={option.encoded}
                                            value={option.encoded}
                                            onMouseDown={keepFilterMenuOpen}
                                            onClick={() => toggleFilterValue(config.key, option.encoded)}
                                        >
                                            <Checkbox checked={selectedValues.includes(option.encoded)} />
                                            <ListItemText primary={option.label} />
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        );
                    })}
                    <Button id='freeDesks_resetFilters' variant='outlined' onClick={resetFilters}>
                        {t('resetFilters')}
                    </Button>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 2, gap: 2, flexWrap: 'wrap' }}>
                    <Typography id='freeDesks_spacesFound' variant='subtitle2'>
                        {t('spacesFound', { count: possibleDesks.length })}
                    </Typography>
                </Box>
                {(possibleDesks && possibleDesks.length > 0
                    ? <DeskTable name='freeDesks' desks={possibleDesks} submit_function={addBooking} onReportDefect={(desk) => {
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
                    }} />
                    : <div>{t('noDesksForRange')}</div>)}
            </>
        );
    }

    function create_helpText() {
        return i18n.language === 'de'
            ? 'Wahlen Sie einen Tag, die Start- und Endzeit sowie ein Gebaude aus. Uber die erweiterten Filter konnen Sie freie Arbeitsplatze weiter eingrenzen. Die Filter werden mit UND verknupft.'
            : 'Select a day, start and end time, and a building. Use the advanced filters to narrow the available workstations. Filters combine with AND logic.';
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
