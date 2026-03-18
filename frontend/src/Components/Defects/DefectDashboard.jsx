import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Box, ToggleButton, ToggleButtonGroup, Typography, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { useLocation, useNavigate } from 'react-router-dom';
import { getRequest, putRequest } from '../RequestFunctions/RequestFunctions';
import LayoutPage from '../Templates/LayoutPage';
import DefectFilters from './DefectFilters';
import DefectListView from './DefectListView';
import DefectKanbanView from './DefectKanbanView';
import DefectDetailsDrawer from './DefectDetailsDrawer';
import {
  getDeskSelectionLabel,
  getLocationBuildingId,
  getLocationBuildingLabel,
  getLocationRoomId,
  getLocationRoomLabel,
} from './defectUtils';

const sortOptionsByLabel = (options) => (
  [...options].sort((a, b) => String(a.label).localeCompare(String(b.label)))
);

const buildUniqueOptions = (items, getValue, getLabel) => sortOptionsByLabel(
  Array.from(items.reduce((map, item) => {
    const value = getValue(item);
    const label = getLabel(item);

    if (value && label && !map.has(String(value))) {
      map.set(String(value), { value: String(value), label });
    }

    return map;
  }, new Map()).values())
);

const sortDesks = (items) => (
  [...items].sort((a, b) => {
    const roomA = getLocationRoomLabel(a);
    const roomB = getLocationRoomLabel(b);
    const roomComparison = String(roomA).localeCompare(String(roomB));

    if (roomComparison !== 0) {
      return roomComparison;
    }

    const deskNumberA = Number(a?.deskNumberInRoom);
    const deskNumberB = Number(b?.deskNumberInRoom);
    const hasDeskNumberA = Number.isFinite(deskNumberA);
    const hasDeskNumberB = Number.isFinite(deskNumberB);

    if (hasDeskNumberA && hasDeskNumberB && deskNumberA !== deskNumberB) {
      return deskNumberA - deskNumberB;
    }

    return getDeskSelectionLabel(a).localeCompare(getDeskSelectionLabel(b));
  })
);

const DefectDashboard = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const headers = useRef(JSON.parse(sessionStorage.getItem('headers')));
  const [defects, setDefects] = useState([]);
  const [desks, setDesks] = useState([]);
  const [sectionMode, setSectionMode] = useState('all');
  const [viewMode, setViewMode] = useState('list');
  const [myActiveAssignmentsCount, setMyActiveAssignmentsCount] = useState(null);
  const [filters, setFilters] = useState({
    urgency: null, category: null, status: null, buildingId: null, roomId: null,
    deskId: null, ageMin: null, ageMax: null,
  });
  const [selectedDefect, setSelectedDefect] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const canUseMyAssignments =
    localStorage.getItem('servicePersonnel') === 'true'
    || localStorage.getItem('admin') === 'true';

  const fetchDefects = useCallback(() => {
    if (sectionMode === 'history' && !filters.deskId) {
      setDefects([]);
      return;
    }

    const params = new URLSearchParams();
    if (sectionMode !== 'history' && filters.urgency) params.set('urgency', filters.urgency);
    if (sectionMode !== 'history' && filters.category) params.set('category', filters.category);
    if (sectionMode !== 'history' && filters.status) params.set('status', filters.status);
    if (sectionMode === 'history' && filters.deskId) params.set('deskId', filters.deskId);
    if (sectionMode === 'mine') params.set('assignedToMe', 'true');

    getRequest(
      `${process.env.REACT_APP_BACKEND_URL}/defects?${params.toString()}`,
      headers.current,
      (data) => setDefects(Array.isArray(data) ? data : []),
      () => toast.error(t('defectReportFailed'))
    );
  }, [filters.category, filters.deskId, filters.status, filters.urgency, sectionMode, t]);

  const fetchDesks = useCallback(() => {
    getRequest(
      `${process.env.REACT_APP_BACKEND_URL}/desks`,
      headers.current,
      (data) => setDesks(Array.isArray(data) ? data : []),
      () => setDesks([])
    );
  }, []);

  const fetchMyActiveAssignmentsCount = useCallback(() => {
    if (sectionMode !== 'mine') {
      setMyActiveAssignmentsCount(null);
      return;
    }

    getRequest(
      `${process.env.REACT_APP_BACKEND_URL}/defects?assignedToMe=true`,
      headers.current,
      (data) => {
        const allMine = Array.isArray(data) ? data : [];
        const activeCount = allMine.filter(
          (d) => d.status === 'NEW' || d.status === 'IN_PROGRESS'
        ).length;
        setMyActiveAssignmentsCount(activeCount);
      },
      () => setMyActiveAssignmentsCount(null)
    );
  }, [sectionMode]);

  useEffect(() => { fetchDefects(); }, [fetchDefects]);
  useEffect(() => { fetchDesks(); }, [fetchDesks]);
  useEffect(() => { fetchMyActiveAssignmentsCount(); }, [fetchMyActiveAssignmentsCount]);

  const defectsWithAgeFilter = useMemo(() => {
    if (sectionMode === 'history') {
      return defects;
    }

    if (filters.ageMin == null && filters.ageMax == null) {
      return defects;
    }

    const now = Date.now();
    return defects.filter((defect) => {
      const ageDays = (now - new Date(defect.reportedAt).getTime()) / (1000 * 60 * 60 * 24);
      if (filters.ageMin != null && ageDays < filters.ageMin) return false;
      if (filters.ageMax != null && ageDays > filters.ageMax) return false;
      return true;
    });
  }, [defects, filters.ageMax, filters.ageMin, sectionMode]);

  const defectBuildingOptions = useMemo(
    () => buildUniqueOptions(defectsWithAgeFilter, getLocationBuildingId, getLocationBuildingLabel),
    [defectsWithAgeFilter]
  );

  const defectsForSelectedBuilding = useMemo(
    () => (
      filters.buildingId
        ? defectsWithAgeFilter.filter((defect) => getLocationBuildingId(defect) === String(filters.buildingId))
        : defectsWithAgeFilter
    ),
    [defectsWithAgeFilter, filters.buildingId]
  );

  const defectRoomOptions = useMemo(
    () => buildUniqueOptions(defectsForSelectedBuilding, getLocationRoomId, getLocationRoomLabel),
    [defectsForSelectedBuilding]
  );

  const filteredDefects = useMemo(
    () => (
      sectionMode === 'history'
        ? defects
        : defectsForSelectedBuilding.filter((defect) => (
          !filters.roomId || getLocationRoomId(defect) === String(filters.roomId)
        ))
    ),
    [defects, defectsForSelectedBuilding, filters.roomId, sectionMode]
  );

  const historyBuildingOptions = useMemo(
    () => buildUniqueOptions(desks, getLocationBuildingId, getLocationBuildingLabel),
    [desks]
  );

  const historyDesksForSelectedBuilding = useMemo(
    () => (
      filters.buildingId
        ? desks.filter((desk) => getLocationBuildingId(desk) === String(filters.buildingId))
        : desks
    ),
    [desks, filters.buildingId]
  );

  const historyRoomOptions = useMemo(
    () => buildUniqueOptions(historyDesksForSelectedBuilding, getLocationRoomId, getLocationRoomLabel),
    [historyDesksForSelectedBuilding]
  );

  const historyDesksForSelectedRoom = useMemo(
    () => (
      filters.roomId
        ? historyDesksForSelectedBuilding.filter((desk) => getLocationRoomId(desk) === String(filters.roomId))
        : []
    ),
    [filters.roomId, historyDesksForSelectedBuilding]
  );

  const historyDeskOptions = useMemo(
    () => sortDesks(historyDesksForSelectedRoom).map((desk) => ({
      value: String(desk.id),
      label: getDeskSelectionLabel(desk),
    })),
    [historyDesksForSelectedRoom]
  );

  useEffect(() => {
    if (sectionMode === 'history') {
      return;
    }

    setFilters((prev) => {
      const hasSelectedBuilding = Boolean(prev.buildingId);
      const hasSelectedRoom = Boolean(prev.roomId);
      const buildingExists = !hasSelectedBuilding
        || defectBuildingOptions.some((option) => option.value === String(prev.buildingId));
      const roomExists = !hasSelectedRoom
        || defectRoomOptions.some((option) => option.value === String(prev.roomId));

      if (!buildingExists) {
        return { ...prev, buildingId: null, roomId: null, deskId: null };
      }

      if (!hasSelectedBuilding && hasSelectedRoom) {
        return { ...prev, roomId: null, deskId: null };
      }

      if (!roomExists) {
        return { ...prev, roomId: null, deskId: null };
      }

      return prev;
    });
  }, [defectBuildingOptions, defectRoomOptions, sectionMode]);

  useEffect(() => {
    if (sectionMode !== 'history') {
      return;
    }

    setFilters((prev) => {
      const hasSelectedBuilding = Boolean(prev.buildingId);
      const hasSelectedRoom = Boolean(prev.roomId);
      const hasSelectedDesk = Boolean(prev.deskId);
      const buildingExists = !hasSelectedBuilding
        || historyBuildingOptions.some((option) => option.value === String(prev.buildingId));
      const roomExists = !hasSelectedRoom
        || historyRoomOptions.some((option) => option.value === String(prev.roomId));
      const deskExists = !hasSelectedDesk
        || historyDeskOptions.some((option) => option.value === String(prev.deskId));

      if (!buildingExists) {
        return { ...prev, buildingId: null, roomId: null, deskId: null };
      }

      if (!hasSelectedBuilding && (hasSelectedRoom || hasSelectedDesk)) {
        return { ...prev, roomId: null, deskId: null };
      }

      if (!roomExists) {
        return { ...prev, roomId: null, deskId: null };
      }

      if (!hasSelectedRoom && hasSelectedDesk) {
        return { ...prev, deskId: null };
      }

      if (!deskExists) {
        return { ...prev, deskId: null };
      }

      return prev;
    });
  }, [historyBuildingOptions, historyDeskOptions, historyRoomOptions, sectionMode]);

  useEffect(() => {
    const openDefectId = location.state?.openDefectId;
    if (openDefectId == null) {
      return;
    }

    const clearOpenDefectState = () => {
      navigate('/defects', { replace: true, state: null });
    };

    const matchingDefect = defects.find((d) => String(d?.id) === String(openDefectId));
    if (matchingDefect) {
      setSelectedDefect(matchingDefect);
      setDrawerOpen(true);
      clearOpenDefectState();
      return;
    }

    getRequest(
      `${process.env.REACT_APP_BACKEND_URL}/defects/${openDefectId}`,
      headers.current,
      (defect) => {
        setSelectedDefect(defect);
        setDrawerOpen(true);
        clearOpenDefectState();
      },
      () => {
        clearOpenDefectState();
      }
    );
  }, [defects, location.state, navigate]);

  const handleSelect = (defect) => {
    setSelectedDefect(defect);
    setDrawerOpen(true);
  };

  const handleUpdate = () => {
    fetchDefects();
    fetchMyActiveAssignmentsCount();
    if (selectedDefect) {
      getRequest(
        `${process.env.REACT_APP_BACKEND_URL}/defects/${selectedDefect.id}`,
        headers.current,
        (d) => setSelectedDefect(d),
        () => setSelectedDefect(null)
      );
    }
  };

  const handleStatusChange = (defectId, newStatus) => {
    putRequest(
      `${process.env.REACT_APP_BACKEND_URL}/defects/${defectId}/status`,
      headers.current,
      () => { toast.success(t('defectStatusUpdated')); handleUpdate(); },
      () => toast.error(t('defectStatusUpdateFailed')),
      JSON.stringify({ status: newStatus })
    );
  };

  const showNoActiveAssignmentsMessage =
    sectionMode === 'mine' && myActiveAssignmentsCount === 0;
  const showHistorySelectPrompt = sectionMode === 'history' && !filters.deskId;

  return (
    <LayoutPage title={t('defectDashboard')} withPaddingX>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="h6">
          {sectionMode === 'mine'
            ? t('defectMyAssignments')
            : sectionMode === 'history'
              ? t('defectHistory')
              : t('defectAllDefects')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {canUseMyAssignments && (
            <ToggleButtonGroup
              size="small"
              value={sectionMode}
              exclusive
              onChange={(_, val) => { if (val) setSectionMode(val); }}
            >
              <ToggleButton value="all">{t('defectAllDefects')}</ToggleButton>
              <ToggleButton value="mine">{t('defectMyAssignments')}</ToggleButton>
              <ToggleButton value="history">{t('defectHistory')}</ToggleButton>
            </ToggleButtonGroup>
          )}
          <ToggleButtonGroup
            size="small"
            value={viewMode}
            exclusive
            onChange={(_, val) => { if (val) setViewMode(val); }}
          >
            <ToggleButton value="list">{t('defectListView')}</ToggleButton>
            <ToggleButton value="kanban">{t('defectKanbanView')}</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      {sectionMode !== 'history' && (
        <DefectFilters
          filters={filters}
          setFilters={setFilters}
          locationOptions={{ buildings: defectBuildingOptions, rooms: defectRoomOptions }}
        />
      )}

      {sectionMode === 'history' && (
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>{t('building')}</InputLabel>
            <Select
              value={filters.buildingId || ''}
              label={t('building')}
              onChange={(e) => {
                const value = e.target.value;
                setFilters((prev) => ({
                  ...prev,
                  buildingId: value || null,
                  roomId: null,
                  deskId: null,
                }));
              }}
            >
              <MenuItem value="">{t('all')}</MenuItem>
              {historyBuildingOptions.map((building) => (
                <MenuItem key={building.value} value={building.value}>{building.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 180 }} disabled={!filters.buildingId}>
            <InputLabel>{t('room')}</InputLabel>
            <Select
              value={filters.roomId || ''}
              label={t('room')}
              onChange={(e) => {
                const value = e.target.value;
                setFilters((prev) => ({
                  ...prev,
                  roomId: value || null,
                  deskId: null,
                }));
              }}
            >
              <MenuItem value="">{t('all')}</MenuItem>
              {historyRoomOptions.map((room) => (
                <MenuItem key={room.value} value={room.value}>{room.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 280, maxWidth: 520 }} disabled={!filters.buildingId || !filters.roomId}>
            <InputLabel>{t('desk')}</InputLabel>
            <Select
              value={filters.deskId || ''}
              label={t('desk')}
              onChange={(e) => {
                const value = e.target.value;
                setFilters((prev) => ({ ...prev, deskId: value || null }));
              }}
            >
              <MenuItem value="">{t('all')}</MenuItem>
              {historyDeskOptions.map((desk) => (
                <MenuItem key={desk.value} value={desk.value}>{desk.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}

      {showNoActiveAssignmentsMessage && (
        <Box sx={{ px: 1, pb: 1 }}>
          <Typography>{t('defectNoActiveAssignedDefects')}</Typography>
        </Box>
      )}

      {showHistorySelectPrompt && (
        <Box sx={{ px: 1, pb: 1 }}>
          <Typography>{t('defectHistorySelectPrompt')}</Typography>
        </Box>
      )}

      {(showNoActiveAssignmentsMessage && filteredDefects.length === 0) || showHistorySelectPrompt ? null : viewMode === 'list' ? (
        <DefectListView defects={filteredDefects} onSelect={handleSelect} />
      ) : (
        <DefectKanbanView defects={filteredDefects} onSelect={handleSelect} onStatusChange={handleStatusChange} />
      )}

      <DefectDetailsDrawer
        defect={selectedDefect}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onUpdate={handleUpdate}
      />
    </LayoutPage>
  );
};

export default DefectDashboard;
