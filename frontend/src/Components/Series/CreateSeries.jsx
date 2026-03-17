import { useEffect, useState, useRef, useMemo } from 'react';
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
import { useTranslation } from 'react-i18next';
import { postRequest, getRequest, putRequest, deleteRequest } from '../RequestFunctions/RequestFunctions';
import CreateDatePicker from '../misc/CreateDatePicker';
import CreateTimePicker from '../misc/CreateTimePicker';
import { exportSeriesIcsFiles, showDeskBookingConfirmation } from '../misc/bookingPostRequest';
import { toast } from 'react-toastify';
import { formatDate_yyyymmdd_to_ddmmyyyy } from '../misc/formatDate';
import {DeskTable} from '../misc/DesksTable';
import LayoutPage from '../Templates/LayoutPage';
import ReportDefectModal from '../Defects/ReportDefectModal';
import { colorVars } from '../../theme';
import {
    MONITOR_COUNT_VALUES,
    technologyOptions,
    workstationTypeOptions,
} from '../misc/workstationMetadata';

const CREATE_SERIES_START_DATE_KEY = 'createSeriesStartDate';
const CREATE_SERIES_END_DATE_KEY = 'createSeriesEndDate';
const CREATE_SERIES_START_TIME_KEY = 'createSeriesStartTime';
const CREATE_SERIES_END_TIME_KEY = 'createSeriesEndTime';
const CREATE_SERIES_FILTER_STORAGE_KEY = 'createSeriesAdvancedFilters';
const CREATE_SERIES_BUILDING_STORAGE_KEY = 'createSeriesSelectedBuilding';
const MAX_PRESET_NAME_LENGTH = 40;
const MAX_PRESETS = 5;
const emptyFilters = Object.freeze({
    types: [],
    monitorCounts: [],
    deskHeightAdjustable: [],
    technologySelections: [],
    specialFeatures: [],
});
const EXCLUSIVE_FILTER_KEYS = ['deskHeightAdjustable', 'specialFeatures'];

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

const technologyFieldBySelection = {
    DockingStation: 'technologyDockingStation',
    Webcam: 'technologyWebcam',
    Headset: 'technologyHeadset',
};

const hasDeskSpecialFeatures = (desk) => String(desk?.specialFeatures || '').trim().length > 0;

const deskMatchesFilters = (desk, filters) => {
    const normalized = normalizeFilters(filters);
    const workstationType = String(desk?.workstationType || 'Standard');
    const monitorCount = Number(desk?.monitorsQuantity ?? 1);
    const isAdjustable = Boolean(desk?.deskHeightAdjustable);
    const hasSpecialFeatures = hasDeskSpecialFeatures(desk);

    if (normalized.types.length > 0 && !normalized.types.includes(workstationType)) {
        return false;
    }
    if (normalized.monitorCounts.length > 0 && !normalized.monitorCounts.includes(monitorCount)) {
        return false;
    }
    if (normalized.deskHeightAdjustable.length > 0 && !normalized.deskHeightAdjustable.includes(isAdjustable)) {
        return false;
    }
    if (normalized.specialFeatures.length > 0 && !normalized.specialFeatures.includes(hasSpecialFeatures)) {
        return false;
    }
    if (normalized.technologySelections.length > 0) {
        const hasAllSelectedTechnologies = normalized.technologySelections.every((selection) =>
            Boolean(desk?.[technologyFieldBySelection[selection]])
        );
        if (!hasAllSelectedTechnologies) {
            return false;
        }
    }
    return true;
};

const filterDesksForSearch = (desks, selectedBuilding, allBuildingsValue, filters) => {
    return (Array.isArray(desks) ? desks : []).filter((desk) => {
        const buildingMatches = String(selectedBuilding) === String(allBuildingsValue)
            || String(desk?.room?.floor?.building?.id ?? '') === String(selectedBuilding);
        const deskIsBookable = !Boolean(desk?.blocked) && !Boolean(desk?.hidden);
        return buildingMatches && deskIsBookable && deskMatchesFilters(desk, filters);
    });
};

const parseStoredFilters = () => {
    try {
        return normalizeFilters(JSON.parse(sessionStorage.getItem(CREATE_SERIES_FILTER_STORAGE_KEY) || 'null') || emptyFilters);
    } catch {
        return { ...emptyFilters };
    }
};

const parseStoredBuilding = () => {
    try {
        const storedBuilding = sessionStorage.getItem(CREATE_SERIES_BUILDING_STORAGE_KEY);
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

const parseStoredDate = (key) => {
    try {
        const raw = sessionStorage.getItem(key);
        if (!raw) return null;
        const parsed = new Date(raw);
        return Number.isNaN(parsed.valueOf()) ? null : parsed;
    } catch {
        return null;
    }
};

const parseStoredTime = (key) => {
    try {
        return sessionStorage.getItem(key) || '';
    } catch {
        return '';
    }
};

const formatLocalDate = (dateValue) => {
    if (!(dateValue instanceof Date) || Number.isNaN(dateValue.valueOf())) {
        return '';
    }
    const year = dateValue.getFullYear();
    const month = String(dateValue.getMonth() + 1).padStart(2, '0');
    const day = String(dateValue.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Interface to create series (=recurrent) bookings.
 *  
 * @returns An page that allows to create series bookings.
 */
const CreateSeries = () => {
    const headers = useRef(JSON.parse(sessionStorage.getItem('headers')));
    const { t } = useTranslation();
    const valueForAllBuildings = useRef('0');
    const shouldPersistSelectedBuilding = useRef(parseStoredBuilding() !== null);
    const filterPanelRef = useRef(null);
    const filterTriggerRefs = useRef({});
    const [selectedBuilding, setSelectedBuilding] = useState(parseStoredBuilding() ?? valueForAllBuildings.current);
    const [possibleDesks, setPossibleDesks] = useState([]);
    const [dates, setDates] = useState([]);
    const [startDate, setStartDate] = useState(() => parseStoredDate(CREATE_SERIES_START_DATE_KEY)); 
    const [endDate, setEndDate] = useState(() => parseStoredDate(CREATE_SERIES_END_DATE_KEY));
    const [startTime, setStartTime] = useState(() => parseStoredTime(CREATE_SERIES_START_TIME_KEY));
    const [endTime, setEndTime] = useState(() => parseStoredTime(CREATE_SERIES_END_TIME_KEY));
    const [frequency, setFrequency] = useState(`${process.env.REACT_APP_CREATE_SERIES_DEFAULT_FREQUENCY}`);
    const [repaint, setRepaint] = useState(false)
    const [dayOfTheWeek, setDayOfTheWeek] = useState(0);
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
    const hasCompleteTimeframe = Boolean(startDate && endDate && startTime && endTime && endTime > startTime);

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

    const filterSelectConfigs = useMemo(() => ([
        { key: 'types', label: t('ergonomics') },
        { key: 'monitorCounts', label: t('monitors') },
        { key: 'deskHeightAdjustable', label: t('deskType') },
        { key: 'technologySelections', label: t('technology') },
        { key: 'specialFeatures', label: t('specialFeatures') },
    ]), [t]);
    
    function create_headline() {
        return t('createSeriesTitle');
    }

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

    const resetFilters = () => setFilters({ ...emptyFilters });

    const closeFilterPanel = () => setOpenFilterPanel(null);

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
        if (EXCLUSIVE_FILTER_KEYS.includes(categoryKey)) {
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
        sessionStorage.setItem(CREATE_SERIES_FILTER_STORAGE_KEY, JSON.stringify(filters));
    }, [filters]);

    useEffect(() => {
        if (!shouldPersistSelectedBuilding.current) {
            return;
        }
        sessionStorage.setItem(
            CREATE_SERIES_BUILDING_STORAGE_KEY,
            String(selectedBuilding ?? valueForAllBuildings.current)
        );
    }, [selectedBuilding]);

    useEffect(() => {
        try {
            if (startDate instanceof Date && !Number.isNaN(startDate.valueOf())) {
                sessionStorage.setItem(CREATE_SERIES_START_DATE_KEY, startDate.toISOString());
            } else {
                sessionStorage.removeItem(CREATE_SERIES_START_DATE_KEY);
            }
        } catch {
            // ignore storage issues
        }
    }, [startDate]);

    useEffect(() => {
        try {
            if (endDate instanceof Date && !Number.isNaN(endDate.valueOf())) {
                sessionStorage.setItem(CREATE_SERIES_END_DATE_KEY, endDate.toISOString());
            } else {
                sessionStorage.removeItem(CREATE_SERIES_END_DATE_KEY);
            }
        } catch {
            // ignore storage issues
        }
    }, [endDate]);

    useEffect(() => {
        try {
            if (startTime) {
                sessionStorage.setItem(CREATE_SERIES_START_TIME_KEY, startTime);
            } else {
                sessionStorage.removeItem(CREATE_SERIES_START_TIME_KEY);
            }
        } catch {
            // ignore storage issues
        }
    }, [startTime]);

    useEffect(() => {
        try {
            if (endTime) {
                sessionStorage.setItem(CREATE_SERIES_END_TIME_KEY, endTime);
            } else {
                sessionStorage.removeItem(CREATE_SERIES_END_TIME_KEY);
            }
        } catch {
            // ignore storage issues
        }
    }, [endTime]);

    /**
     * Creates an message that indicates if the series creation was successful or not.
     * @param {*} ret The param that indicates if the creation was successful or not.
     * @returns  A message that indicates if the series creation was successful or not.
     */
    function create_msg(ret) {
        const formattedStartDate = formatLocalDate(startDate);
        const formattedEndDate = formatLocalDate(endDate);
        if (ret) {
            return t('createSeriesSuccess', { startDate: formattedStartDate, endDate: formattedEndDate });
        }
        else {
            return t('createSeriesError', { startDate: formattedStartDate, endDate: formattedEndDate });
        }
    }

    /**
     * Fetch dates between startDate and endDate.
     */
    useEffect(() => {
        if (!hasCompleteTimeframe) {
            setDates([]);
            return;
        }
        // The date as iso format. Cut off the time etc to achieve a date like YYYY-MM-DD.
        const startDateStr = formatLocalDate(startDate);
        const endDateStr = formatLocalDate(endDate);

        if (startDateStr > endDateStr) {
            toast.error(t('startDateBiggerThanStartDate'));
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
        }, [t, startDate, endDate, startTime, endTime, frequency, dayOfTheWeek, repaint, hasCompleteTimeframe]); 

    /**
     * Fetch all available desks for dates and times.
     */
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
        if (!hasCompleteTimeframe || dates.length === 0) {
            getRequest(
                `${process.env.REACT_APP_BACKEND_URL}/desks`,
                headers.current,
                (data) => {
                    setPossibleDesks(filterDesksForSearch(
                        data,
                        selectedBuilding,
                        valueForAllBuildings.current,
                        filters
                    ));
                },
                () => {
                    console.log('Error fetching desks in CreateSeries');
                    setPossibleDesks([]);
                }
            );
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
                console.log('Error fetching desks in CreateSeries');
            },
            JSON.stringify({
                dates,
                startTime,
                endTime,
                filters,
            })
        );
    }, [dates, endTime, startTime, selectedBuilding, hasCompleteTimeframe, filters]);

    /**
     * Create an series object on the backend side.
     * @param {*} desk The desk object for which an series shall be created.
     */
    function submitSeries(desk) {
        postRequest(
            `${process.env.REACT_APP_BACKEND_URL}/series`,
            headers.current,
            (ret) => {
                toast.success(create_msg(ret));
                // Be sure to change an depedency of React.useEffect(..) to force an repaint.
                // This is needed because we want to remove desks that are not longer available.
                setRepaint(!repaint);
            },
            (status, errorData) => {
                console.log('Failed to create a new series in CreateSeries.js.', status, errorData);
                const backendError = errorData?.error || errorData?.message;
                if (backendError) {
                    toast.error(backendError);
                } else {
                    toast.error(t('httpOther'));
                }
            },
            JSON.stringify({
                'id': 0,
                'rangeDTO': {
                    startDate: formatLocalDate(startDate),
                    endDate: formatLocalDate(endDate),
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
    }

    function addSeries(desk) {
        if (!hasCompleteTimeframe) {
            toast.warning(t('selectDateTimeFirst'));
            return;
        }

        if (!Array.isArray(dates) || dates.length === 0) {
            toast.warning(t('noDesksForCurrentSelection'));
            return;
        }

        const openSeriesConfirmation = (hasOverlap = false, conflictingDates = []) => {
            const confirmationBookingData = {
                day: dates[0],
                begin: startTime,
                end: endTime,
            };
            showDeskBookingConfirmation({
                t,
                title: t('seriesBookingConfirmationTitle', { desk: desk.remark }),
                deskRemark: desk.remark,
                deskDetails: desk,
                bookingData: confirmationBookingData,
                bookingDates: dates,
                hasOverlap,
                conflictingDates,
                showExportIcs: true,
                onExportIcs: () => exportSeriesIcsFiles({
                    bookingDates: dates,
                    bookingData: confirmationBookingData,
                    deskRemark: desk.remark,
                    t,
                }),
                onConfirm: () => submitSeries(desk),
                onCancel: () => {},
            });
        };

        postRequest(
            `${process.env.REACT_APP_BACKEND_URL}/series/overlap-check`,
            headers.current,
            (data) => {
                openSeriesConfirmation(Boolean(data?.hasOverlap), data?.conflictingDates || []);
            },
            () => {
                openSeriesConfirmation(false);
            },
            JSON.stringify({
                deskId: desk.id,
                dates,
                startTime,
                endTime,
            })
        );
    }

    function CreateContent() {
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0, minHeight: 'calc(100vh - 260px)' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, maxWidth: 860, marginBottom: 2.5 }}>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                        <Box data-testid='startDate' id='startDate' sx={{ width: 200 }}>
                            <CreateDatePicker
                                date={startDate}
                                setter={setStartDate}
                                label={t('startDate')}
                                required={false}
                                clearable
                                size='small'
                            />
                        </Box>
                        <Box data-testid='endDate' id='endDate' sx={{ width: 200 }}>
                            <CreateDatePicker
                                date={endDate}
                                setter={setEndDate}
                                label={t('endDate')}
                                required={false}
                                clearable
                                size='small'
                            />
                        </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                        <Box data-testid='startTime' id='startTime' sx={{ width: 200 }}>
                            <CreateTimePicker
                                time={startTime}
                                setter={setStartTime}
                                label={t('startTime')}
                                stepSeconds={60}
                                required={false}
                                size='small'
                            />
                        </Box>
                        <Box data-testid='endTime' id='endTime' sx={{ width: 200 }}>
                            <CreateTimePicker
                                time={endTime}
                                setter={setEndTime}
                                label={t('endTime')}
                                stepSeconds={60}
                                required={false}
                                size='small'
                            />
                        </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                        <Box data-testid='frequence_select' id='frequence_select' sx={{ width: 200 }}>                
                            <FormControl id='createSeries_setFrequency' required={true} fullWidth size='small'>
                                <InputLabel id='demo-simple-select-label'>{t('frequency')}</InputLabel>
                                <Select
                                    labelId='demo-simple-select-label'
                                    value={frequency} 
                                    label={t('frequency')}
                                    size='small'
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
                        </Box>
                        <Box data-testid='dayOfTheWeek_select' id='dayOfTheWeek_select' sx={{ width: 200 }}>
                            <FormControl id='createSeries_setDayOfTheWeek' disabled={frequency === 'daily'} required={true} fullWidth size='small'>
                                <InputLabel id='demo-simple-select-label'>{t('dayOfTheWeek')}</InputLabel>
                                <Select
                                    value={dayOfTheWeek} 
                                    label={t('dayOfTheWeek')}
                                    size='small'
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
                        </Box>
                    </Box>
                    <Box id='div_createSeries_selectBuilding' sx={{ width: 200 }}>
                        <FormControl id='createSeries_selectBuilding' required={true} fullWidth size='small'>
                                <InputLabel id='demo-simple-select-label'>{t('building')}</InputLabel>
                                <Select
                                    value={selectedBuilding} 
                                    label={t('building')}
                                    size='small'
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
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 1.25 }}>
                    {filterSelectConfigs.map((config) => {
                        const selectedValues = getSelectedValuesForCategory(config.key);
                        const isOpen = openFilterPanel?.key === config.key;
                        return (
                            <Box
                                key={config.key}
                                id={`createSeries_${config.key}`}
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
                        <Button id='createSeries_resetFilters' variant='outlined' onClick={resetFilters}>
                            {t('resetFilters')}
                        </Button>
                        <Button
                            id='createSeries_savedPresets'
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
                {hasCompleteTimeframe && dates.length > 0 ? (
                    <Box
                        id='dates_labels'
                        data-testid='dates_label'
                        sx={{ marginBottom: possibleDesks.length > 0 ? 1.25 : 0 }}
                    >
                        <Typography variant='subtitle1' sx={{ marginBottom: 0.75 }}>
                            {t('calculatedDates')}
                        </Typography>
                        <Box
                            sx={{
                                width: '100%',
                                overflowX: 'auto',
                                whiteSpace: 'nowrap',
                                border: `1px solid ${colorVars.border.muted}`,
                                padding: 1,
                            }}
                        >
                            {dates.map((date, index) => (
                                <Box
                                    key={index}
                                    component='span'
                                    sx={{
                                        display: 'inline-block',
                                        padding: 1,
                                        border: `1px solid ${colorVars.border.faint}`,
                                        marginRight: 1,
                                    }}
                                >
                                    {formatDate_yyyymmdd_to_ddmmyyyy(date)}
                                </Box>
                            ))}
                        </Box>
                    </Box>
                ) : null}
                {possibleDesks.length > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 1.25, gap: 2, flexWrap: 'wrap' }}>
                        <Typography id='createSeries_spacesFound' variant='subtitle2'>
                            {t('spacesFound', { count: possibleDesks.length })}
                        </Typography>
                    </Box>
                )}
                {
                    possibleDesks && possibleDesks.length > 0 ? <DeskTable name={'createSeries'} desks={possibleDesks} submit_function={addSeries} tableContainerSx={{ flex: 1, minHeight: 0, maxHeight: 'none' }} onReportDefect={(desk) => {
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
                    }}/> : <div>{t(hasCompleteTimeframe ? 'noDesksForRange' : 'noDesksForCurrentSelection')}</div>
                }
            </Box>
        );
    };
    
    return (
        <>
        <LayoutPage
            title={create_headline()}
            helpText={t('createSeriesHelp')}
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
                    const ControlComponent = EXCLUSIVE_FILTER_KEYS.includes(openFilterPanel.key) ? Radio : Checkbox;

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
            <MenuItem id='createSeries_saveCurrentPreset' onClick={openSavePresetDialog}>
                {t('saveCurrent')}
            </MenuItem>
            <Divider />
            {savedPresets.length > 0 ? savedPresets.map((preset) => (
                <MenuItem
                    key={preset.id}
                    id={`createSeries_preset_${preset.id}`}
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
                <Button id='createSeries_confirmSavePreset' onClick={handleSavePreset}>
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
                <Button id='createSeries_confirmReplacePreset' onClick={submitReplacePreset}>
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
                <Button id='createSeries_confirmDeletePreset' onClick={confirmDeletePreset}>
                    {t('delete')}
                </Button>
            </DialogActions>
        </Dialog>
        </>
    );
};

export default CreateSeries;
