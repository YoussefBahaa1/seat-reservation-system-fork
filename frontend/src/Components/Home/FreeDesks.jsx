import { useRef, useEffect, useMemo, useState } from 'react';
import moment from 'moment';
import { useTranslation } from 'react-i18next';
import {
    Box,
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    IconButton,
    InputLabel,
    Menu,
    MenuItem,
    Paper,
    Radio,
    Select,
    TextField,
    Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import CreateDatePicker from '../misc/CreateDatePicker';
import CreateTimePicker from '../misc/CreateTimePicker';
import 'react-confirm-alert/src/react-confirm-alert.css';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { toast } from 'react-toastify';
import { colorVars } from '../../theme';
import {postRequest, getRequest, putRequest, deleteRequest} from '../RequestFunctions/RequestFunctions';
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
const BUILDING_STORAGE_KEY = 'freeDesksSelectedBuilding';
const MAX_PRESET_NAME_LENGTH = 40;
const MAX_PRESETS = 5;
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

const parseStoredBuilding = () => {
    try {
        const storedBuilding = sessionStorage.getItem(BUILDING_STORAGE_KEY);
        return storedBuilding === null ? null : String(storedBuilding);
    } catch {
        return null;
    }
};

const normalizeBuildingValue = (buildingValue, buildings = [], allBuildingsValue = '0') => {
    const normalized = buildingValue == null ? allBuildingsValue : String(buildingValue).trim();
    if (!normalized || normalized === allBuildingsValue) {
        return allBuildingsValue;
    }
    if (!Array.isArray(buildings) || buildings.length === 0) {
        return normalized;
    }
    return buildings.some((building) => String(building.id) === normalized) ? normalized : allBuildingsValue;
};

const normalizePresetForComparison = (preset) => {
    const normalizedFilters = normalizeFilters(preset?.filters);
    return JSON.stringify({
        buildingId: String(preset?.buildingId ?? '0'),
        filters: {
            types: [...normalizedFilters.types].sort(),
            monitorCounts: [...normalizedFilters.monitorCounts].sort((left, right) => left - right),
            deskHeightAdjustable: [...normalizedFilters.deskHeightAdjustable].sort((left, right) => Number(left) - Number(right)),
            technologySelections: [...normalizedFilters.technologySelections].sort(),
            specialFeatures: [...normalizedFilters.specialFeatures].sort((left, right) => Number(left) - Number(right)),
        },
    });
};

const EXCLUSIVE_FILTER_KEYS = ['deskHeightAdjustable', 'specialFeatures'];

const FreeDesks = () => {
    const headers = useRef(JSON.parse(sessionStorage.getItem('headers')));
    const filterPanelRef = useRef(null);
    const filterTriggerRefs = useRef({});
    const { t, i18n } = useTranslation();
    const valueForAllBuildings = useRef('0');
    const shouldPersistSelectedBuilding = useRef(parseStoredBuilding() !== null);
    const [selectedBuilding, setSelectedBuilding] = useState(parseStoredBuilding() ?? valueForAllBuildings.current);
    const [possibleDesks, setPossibleDesks] = useState([]);
    const [bookingDate, setBookingDate] = useState(new Date());
    const [repaint, setRepaint] = useState(false);
    const [buildings, setBuildings] = useState([]);
    const [reportDefectDeskId, setReportDefectDeskId] = useState(null);
    const [isReportDefectOpen, setIsReportDefectOpen] = useState(false);
    const [filters, setFilters] = useState(parseStoredFilters);
    const [savedPresets, setSavedPresets] = useState([]);
    const [presetsMenuPosition, setPresetsMenuPosition] = useState(null);
    const [openFilterPanel, setOpenFilterPanel] = useState(null);
    const [isSavePresetOpen, setIsSavePresetOpen] = useState(false);
    const [isReplacePresetOpen, setIsReplacePresetOpen] = useState(false);
    const [presetPendingReplace, setPresetPendingReplace] = useState(null);
    const [presetReplaceReason, setPresetReplaceReason] = useState('name');
    const [presetPendingDelete, setPresetPendingDelete] = useState(null);
    const [presetName, setPresetName] = useState('');
    const [presetNameError, setPresetNameError] = useState('');

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

    const isExclusiveFilterCategory = (categoryKey) => EXCLUSIVE_FILTER_KEYS.includes(categoryKey);

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

    const filterSelectConfigs = useMemo(() => ([
        { key: 'types', label: t('ergonomics') },
        { key: 'monitorCounts', label: t('monitors') },
        { key: 'deskHeightAdjustable', label: t('deskType') },
        { key: 'technologySelections', label: t('technology') },
        { key: 'specialFeatures', label: t('specialFeatures') },
    ]), [t]);

    const resetFilters = () => setFilters({ ...emptyFilters });

    const closeFilterPanel = () => {
        setOpenFilterPanel(null);
    };

    const toggleFilterPanel = (categoryKey, event) => {
        const triggerRect = event.currentTarget.getBoundingClientRect();
        const panelWidth = Math.max(Math.round(triggerRect.width), 220);
        const panelLeft = Math.min(
            Math.round(triggerRect.left),
            Math.max(16, window.innerWidth - panelWidth - 16)
        );
        const panelTop = Math.round(triggerRect.bottom + 8);

        setOpenFilterPanel((prev) => {
            if (prev?.key === categoryKey) {
                return null;
            }
            return {
                key: categoryKey,
                top: panelTop,
                left: panelLeft,
                width: panelWidth,
            };
        });
    };

    const handleFilterOptionClick = (categoryKey, encodedValue) => {
        toggleFilterValue(categoryKey, encodedValue);
        if (isExclusiveFilterCategory(categoryKey)) {
            closeFilterPanel();
        }
    };

    const validatePresetName = (value) => {
        const trimmedValue = String(value || '').trim();
        if (!trimmedValue) {
            return t('workstationPresetNameRequired');
        }
        if (trimmedValue.length > MAX_PRESET_NAME_LENGTH) {
            return t('workstationPresetNameTooLong', { max: MAX_PRESET_NAME_LENGTH });
        }
        const existingPreset = savedPresets.find(
            (preset) => preset.name?.trim().toLocaleLowerCase() === trimmedValue.toLocaleLowerCase()
        );
        if (!existingPreset && savedPresets.length >= MAX_PRESETS) {
            return t('workstationPresetLimitReached', { max: MAX_PRESETS });
        }
        return '';
    };

    const closeSavePresetDialog = () => {
        setIsSavePresetOpen(false);
        setPresetPendingReplace(null);
        setPresetReplaceReason('name');
        setPresetName('');
        setPresetNameError('');
    };

    const openSavePresetDialog = () => {
        setPresetsMenuPosition(null);
        setPresetName('');
        setPresetNameError('');
        setPresetPendingReplace(null);
        setPresetReplaceReason('name');
        setIsSavePresetOpen(true);
    };

    const buildPresetPayload = (name) => ({
        name,
        buildingId: String(selectedBuilding ?? valueForAllBuildings.current),
        filters,
    });

    const submitCreatePreset = (name) => {
        postRequest(
            `${process.env.REACT_APP_BACKEND_URL}/users/me/workstation-search-presets`,
            headers.current,
            (createdPreset) => {
                setSavedPresets((prev) => [createdPreset, ...prev.filter((preset) => preset.id !== createdPreset.id)]);
                closeSavePresetDialog();
                toast.success(t('workstationPresetSaved'));
            },
            () => {
                toast.error(t('workstationPresetSaveFailed'));
            },
            JSON.stringify(buildPresetPayload(name))
        );
    };

    const submitReplacePreset = () => {
        if (!presetPendingReplace) {
            setIsReplacePresetOpen(false);
            return;
        }
        const trimmedName = String(presetName || '').trim();
        putRequest(
            `${process.env.REACT_APP_BACKEND_URL}/users/me/workstation-search-presets/${presetPendingReplace.id}`,
            headers.current,
            (updatedPreset) => {
                setSavedPresets((prev) => [
                    updatedPreset,
                    ...prev.filter((preset) => preset.id !== updatedPreset.id),
                ]);
                setIsReplacePresetOpen(false);
                closeSavePresetDialog();
                toast.success(
                    t(presetReplaceReason === 'content'
                        ? 'workstationPresetRenamedFromDuplicate'
                        : 'workstationPresetReplaced')
                );
            },
            () => {
                toast.error(t('workstationPresetSaveFailed'));
            },
            JSON.stringify(buildPresetPayload(trimmedName))
        );
    };

    const handleSavePreset = () => {
        const trimmedName = String(presetName || '').trim();
        const validationError = validatePresetName(trimmedName);
        if (validationError) {
            setPresetNameError(validationError);
            return;
        }
        const existingPreset = savedPresets.find(
            (preset) => preset.name?.trim().toLocaleLowerCase() === trimmedName.toLocaleLowerCase()
        );
        if (existingPreset) {
            setPresetPendingReplace(existingPreset);
            setPresetReplaceReason('name');
            setIsReplacePresetOpen(true);
            return;
        }

        const currentPresetSignature = normalizePresetForComparison({
            buildingId: selectedBuilding,
            filters,
        });
        const existingContentPreset = savedPresets.find((preset) =>
            normalizePresetForComparison(preset) === currentPresetSignature
        );
        if (existingContentPreset) {
            setPresetPendingReplace(existingContentPreset);
            setPresetReplaceReason('content');
            setIsReplacePresetOpen(true);
            return;
        }
        submitCreatePreset(trimmedName);
    };

    const applyPreset = (preset) => {
        setSelectedBuilding(
            normalizeBuildingValue(preset?.buildingId, buildings, valueForAllBuildings.current)
        );
        setFilters(normalizeFilters(preset?.filters));
        setPresetsMenuPosition(null);
    };

    const confirmDeletePreset = () => {
        if (!presetPendingDelete) {
            return;
        }
        deleteRequest(
            `${process.env.REACT_APP_BACKEND_URL}/users/me/workstation-search-presets/${presetPendingDelete.id}`,
            headers.current,
            () => {
                setSavedPresets((prev) => prev.filter((preset) => preset.id !== presetPendingDelete.id));
                setPresetPendingDelete(null);
                toast.success(t('workstationPresetDeleted'));
            },
            () => {
                toast.error(t('workstationPresetDeleteFailed'));
            }
        );
    };

    useEffect(()=>{
        getRequest(
            `${process.env.REACT_APP_BACKEND_URL}/buildings/all`,
            headers.current,
            buildings=>{
                setBuildings(buildings);
                const storedBuilding = parseStoredBuilding();
                if (storedBuilding !== null) {
                    shouldPersistSelectedBuilding.current = true;
                    setSelectedBuilding(normalizeBuildingValue(storedBuilding, buildings, valueForAllBuildings.current));
                    return;
                }
                const userId = localStorage.getItem('userId');
                if (!userId) {
                    shouldPersistSelectedBuilding.current = true;
                    setSelectedBuilding(valueForAllBuildings.current);
                    console.log('userId is null');
                    return;
                }
                getRequest(
                    `${process.env.REACT_APP_BACKEND_URL}/defaults/getDefaultFloorForUserId/${userId}`,
                    headers.current,
                    received_defaultFloor => {
                        shouldPersistSelectedBuilding.current = true;
                        if (received_defaultFloor && received_defaultFloor.building && received_defaultFloor.building.id) {
                            setSelectedBuilding(String(received_defaultFloor.building.id));
                        } else {
                            setSelectedBuilding(valueForAllBuildings.current);
                        }
                    },
                    () => {
                        shouldPersistSelectedBuilding.current = true;
                        setSelectedBuilding(valueForAllBuildings.current);
                        console.log('Error fetching default building and floor in FloorSelector.js');
                    }
                );
            },
            () => {console.log('Error fetching buildings in fetchBuildings.js');}
        );

    }, []);

    useEffect(() => {
        getRequest(
            `${process.env.REACT_APP_BACKEND_URL}/users/me/workstation-search-presets`,
            headers.current,
            (presets) => {
                setSavedPresets(Array.isArray(presets) ? presets : []);
            },
            (status) => {
                if (status !== 401) {
                    toast.error(t('workstationPresetLoadFailed'));
                }
            }
        );
    }, [t]);

    useEffect(() => {
        sessionStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters));
    }, [filters]);

    useEffect(() => {
        if (!openFilterPanel) {
            return undefined;
        }

        const handleDocumentMouseDown = (event) => {
            const panelElement = filterPanelRef.current;
            if (panelElement?.contains(event.target)) {
                return;
            }

            const clickedTrigger = Object.values(filterTriggerRefs.current)
                .filter(Boolean)
                .some((triggerElement) => triggerElement.contains(event.target));

            if (!clickedTrigger) {
                closeFilterPanel();
            }
        };

        const handleEscape = (event) => {
            if (event.key === 'Escape') {
                closeFilterPanel();
            }
        };

        document.addEventListener('mousedown', handleDocumentMouseDown);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleDocumentMouseDown);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [openFilterPanel]);

    useEffect(() => {
        if (!shouldPersistSelectedBuilding.current) {
            return;
        }
        sessionStorage.setItem(
            BUILDING_STORAGE_KEY,
            String(selectedBuilding ?? valueForAllBuildings.current)
        );
    }, [selectedBuilding]);

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

        const bookingDTO = {
            userId: localStorage.getItem('userId'),
            roomId: selectedDesk.room.id,
            deskId: selectedDesk.id,
            day: moment(bookingDate).format('YYYY-MM-DD'),
            begin: normalizeTimeToSql(startTime),
            end: normalizeTimeToSql(endTime)
        };
        bookingPostRequest('FreeDesks.jsx', bookingDTO, selectedDesk.remark, headers, t, (_)=>{setRepaint(!repaint);});
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
                            setSelectedBuilding(String(e.target.value));
                        }}
                    >
                        {[
                            <MenuItem id='createSeries_building_all' key={valueForAllBuildings.current} value={valueForAllBuildings.current}>{t('any')}</MenuItem>,
                            ...buildings.map(e => (
                                <MenuItem id={`createSeries_building_${e.id}`} key={e.id} value={String(e.id)}>
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
                        const isOpen = openFilterPanel?.key === config.key;
                        return (
                            <Box
                                key={config.key}
                                id={`freeDesks_${config.key}`}
                                sx={{ minWidth: 170, flex: '1 1 170px' }}
                            >
                                <Typography
                                    variant='caption'
                                    sx={{ display: 'block', color: 'text.secondary', marginBottom: 0.5, paddingX: 1 }}
                                >
                                    {config.label}
                                </Typography>
                                <Box
                                    role='button'
                                    tabIndex={0}
                                    ref={(node) => {
                                        filterTriggerRefs.current[config.key] = node;
                                    }}
                                    onClick={(event) => toggleFilterPanel(config.key, event)}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter' || event.key === ' ') {
                                            event.preventDefault();
                                            toggleFilterPanel(config.key, event);
                                        } else if (event.key === 'Escape' && isOpen) {
                                            closeFilterPanel();
                                        }
                                    }}
                                    sx={{
                                        minHeight: 40,
                                        border: '1px solid',
                                        borderColor: isOpen ? 'primary.main' : colorVars.border.strong,
                                        borderRadius: 1,
                                        paddingX: 1.5,
                                        paddingY: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: 1,
                                        backgroundColor: 'background.paper',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <Typography
                                        variant='body2'
                                        sx={{
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            color: selectedValues.length ? 'text.primary' : 'text.secondary',
                                        }}
                                    >
                                        {renderSelectedValues(config.key)}
                                    </Typography>
                                    <KeyboardArrowDownIcon
                                        sx={{
                                            color: 'action.active',
                                            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                            transition: 'transform 120ms ease',
                                        }}
                                    />
                                </Box>
                            </Box>
                        );
                    })}
                    <Box sx={{ alignSelf: 'flex-end', display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <Button id='freeDesks_resetFilters' variant='outlined' onClick={resetFilters}>
                            {t('resetFilters')}
                        </Button>
                        <Button
                            id='freeDesks_savedPresets'
                            variant='contained'
                            color='success'
                            endIcon={<KeyboardArrowDownIcon />}
                            onClick={(event) => {
                                const rect = event.currentTarget.getBoundingClientRect();
                                setPresetsMenuPosition({
                                    top: Math.round(rect.bottom + window.scrollY),
                                    left: Math.round(rect.left + window.scrollX),
                                });
                            }}
                        >
                            {t('savedPresets')}
                        </Button>
                    </Box>
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
            {openFilterPanel && (
                <Paper
                    ref={filterPanelRef}
                    elevation={6}
                    sx={{
                        position: 'fixed',
                        top: openFilterPanel.top,
                        left: openFilterPanel.left,
                        width: openFilterPanel.width,
                        maxHeight: 320,
                        overflowY: 'auto',
                        zIndex: 1400,
                        borderRadius: 1,
                        paddingY: 0.5,
                    }}
                >
                    {filterOptions[openFilterPanel.key].map((option) => {
                        const selectedValues = getSelectedValuesForCategory(openFilterPanel.key);
                        const isSelected = selectedValues.includes(option.encoded);
                        const ControlComponent = isExclusiveFilterCategory(openFilterPanel.key) ? Radio : Checkbox;

                        return (
                            <Box
                                key={option.encoded}
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => handleFilterOptionClick(openFilterPanel.key, option.encoded)}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    paddingX: 1.5,
                                    paddingY: 0.75,
                                    cursor: 'pointer',
                                    '&:hover': {
                                        backgroundColor: 'action.hover',
                                    },
                                }}
                            >
                                <ControlComponent checked={isSelected} size='small' sx={{ pointerEvents: 'none' }} />
                                <Typography variant='body2'>{option.label}</Typography>
                            </Box>
                        );
                    })}
                </Paper>
            )}
            <Menu
                anchorReference='anchorPosition'
                anchorPosition={presetsMenuPosition}
                open={Boolean(presetsMenuPosition)}
                onClose={() => setPresetsMenuPosition(null)}
            >
                <MenuItem id='freeDesks_saveCurrentPreset' onClick={openSavePresetDialog}>
                    {t('saveCurrent')}
                </MenuItem>
                <Divider />
                {savedPresets.length > 0 ? savedPresets.map((preset) => (
                    <MenuItem
                        key={preset.id}
                        id={`freeDesks_preset_${preset.id}`}
                        onClick={() => applyPreset(preset)}
                        sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, minWidth: 250 }}
                    >
                        <Typography
                            variant='body2'
                            sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexGrow: 1 }}
                        >
                            {preset.name}
                        </Typography>
                        <IconButton
                            edge='end'
                            size='small'
                            aria-label={t('delete')}
                            onClick={(event) => {
                                event.stopPropagation();
                                setPresetsMenuPosition(null);
                                setPresetPendingDelete(preset);
                            }}
                        >
                            <DeleteOutlineIcon fontSize='small' />
                        </IconButton>
                    </MenuItem>
                )) : (
                    <MenuItem disabled>{t('noSavedPresets')}</MenuItem>
                )}
            </Menu>
            <Dialog open={isSavePresetOpen} onClose={closeSavePresetDialog} fullWidth maxWidth='xs'>
                <DialogTitle>{t('saveCurrentPresetTitle')}</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        fullWidth
                        margin='dense'
                        label={t('presetName')}
                        value={presetName}
                        onChange={(event) => {
                            setPresetName(event.target.value);
                            if (presetNameError) {
                                setPresetNameError('');
                            }
                        }}
                        inputProps={{ maxLength: MAX_PRESET_NAME_LENGTH }}
                        error={Boolean(presetNameError)}
                        helperText={presetNameError || t('workstationPresetNameCounter', {
                            count: presetName.length,
                            max: MAX_PRESET_NAME_LENGTH,
                        })}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeSavePresetDialog}>{t('cancel')}</Button>
                    <Button id='freeDesks_confirmSavePreset' onClick={handleSavePreset}>
                        {t('savePreset')}
                    </Button>
                </DialogActions>
            </Dialog>
            <Dialog open={isReplacePresetOpen} onClose={() => setIsReplacePresetOpen(false)} fullWidth maxWidth='xs'>
                <DialogTitle>{t('workstationPresetReplaceTitle')}</DialogTitle>
                <DialogContent>
                    <Typography>
                        {t(
                            presetReplaceReason === 'content'
                                ? 'workstationPresetReplaceDuplicateContentMessage'
                                : 'workstationPresetReplaceMessage',
                            {
                                name: presetPendingReplace?.name || String(presetName || '').trim(),
                                newName: String(presetName || '').trim(),
                            }
                        )}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setIsReplacePresetOpen(false)}>{t('cancel')}</Button>
                    <Button id='freeDesks_confirmReplacePreset' onClick={submitReplacePreset}>
                        {t('replace')}
                    </Button>
                </DialogActions>
            </Dialog>
            <Dialog open={Boolean(presetPendingDelete)} onClose={() => setPresetPendingDelete(null)} fullWidth maxWidth='xs'>
                <DialogTitle>{t('workstationPresetDeleteTitle')}</DialogTitle>
                <DialogContent>
                    <Typography>
                        {t('workstationPresetDeleteMessage', { name: presetPendingDelete?.name || '' })}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPresetPendingDelete(null)}>{t('cancel')}</Button>
                    <Button id='freeDesks_confirmDeletePreset' onClick={confirmDeletePreset}>
                        {t('delete')}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default FreeDesks;
