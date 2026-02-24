import { useState, useEffect, useCallback, useRef } from 'react';
import { Box, ToggleButton, ToggleButtonGroup, Typography, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { getRequest, putRequest } from '../RequestFunctions/RequestFunctions';
import LayoutPage from '../Templates/LayoutPage';
import DefectFilters from './DefectFilters';
import DefectListView from './DefectListView';
import DefectKanbanView from './DefectKanbanView';
import DefectDetailsDrawer from './DefectDetailsDrawer';

const DefectDashboard = () => {
  const { t } = useTranslation();
  const headers = useRef(JSON.parse(sessionStorage.getItem('headers')));
  const [defects, setDefects] = useState([]);
  const [desks, setDesks] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [sectionMode, setSectionMode] = useState('all');
  const [viewMode, setViewMode] = useState('list');
  const [myActiveAssignmentsCount, setMyActiveAssignmentsCount] = useState(null);
  const [filters, setFilters] = useState({
    urgency: null, category: null, status: null, roomId: null,
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
    if (sectionMode !== 'history' && filters.roomId) params.set('roomId', filters.roomId);
    if (sectionMode === 'history' && filters.deskId) params.set('deskId', filters.deskId);
    if (sectionMode === 'mine') params.set('assignedToMe', 'true');

    getRequest(
      `${process.env.REACT_APP_BACKEND_URL}/defects?${params.toString()}`,
      headers.current,
      (data) => {
        let filtered = data;
        if (sectionMode !== 'history' && (filters.ageMin != null || filters.ageMax != null)) {
          const now = Date.now();
          filtered = filtered.filter(d => {
            const ageDays = (now - new Date(d.reportedAt).getTime()) / (1000 * 60 * 60 * 24);
            if (filters.ageMin != null && ageDays < filters.ageMin) return false;
            if (filters.ageMax != null && ageDays > filters.ageMax) return false;
            return true;
          });
        }
        setDefects(filtered);
      },
      () => toast.error(t('defectReportFailed'))
    );
  }, [filters, sectionMode, t]);

  const fetchDesks = useCallback(() => {
    getRequest(
      `${process.env.REACT_APP_BACKEND_URL}/desks`,
      headers.current,
      (data) => setDesks(Array.isArray(data) ? data : []),
      () => setDesks([])
    );
  }, []);

  const fetchRooms = useCallback(() => {
    getRequest(
      `${process.env.REACT_APP_BACKEND_URL}/rooms`,
      headers.current,
      setRooms,
      () => {}
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
  useEffect(() => { fetchRooms(); }, [fetchRooms]);
  useEffect(() => { fetchMyActiveAssignmentsCount(); }, [fetchMyActiveAssignmentsCount]);

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
        <DefectFilters filters={filters} setFilters={setFilters} rooms={rooms} />
      )}

      {sectionMode === 'history' && (
        <Box sx={{ mb: 2 }}>
          <FormControl size="small" sx={{ minWidth: 280, maxWidth: 520 }}>
            <InputLabel>{t('defectSelectWorkstation')}</InputLabel>
            <Select
              value={filters.deskId || ''}
              label={t('defectSelectWorkstation')}
              onChange={(e) => {
                const value = e.target.value;
                setFilters((prev) => ({ ...prev, deskId: value || null }));
              }}
            >
              <MenuItem value="">{t('defectSelectWorkstation')}</MenuItem>
              {[...desks]
                .sort((a, b) => {
                  const roomA = (a?.room?.remark || '').toLowerCase();
                  const roomB = (b?.room?.remark || '').toLowerCase();
                  if (roomA < roomB) return -1;
                  if (roomA > roomB) return 1;
                  return (a?.deskNumberInRoom || 0) - (b?.deskNumberInRoom || 0);
                })
                .map((desk) => {
                  const roomLabel = desk?.room?.remark || `Room ${desk?.room?.id || '—'}`;
                  const workstationLabel = desk?.workstationIdentifier
                    || desk?.remark
                    || `Desk ${desk?.id || '—'}`;
                  return (
                    <MenuItem key={desk.id} value={desk.id}>
                      {`${roomLabel} — ${workstationLabel}`}
                    </MenuItem>
                  );
                })}
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

      {(showNoActiveAssignmentsMessage && defects.length === 0) || showHistorySelectPrompt ? null : viewMode === 'list' ? (
        <DefectListView defects={defects} onSelect={handleSelect} />
      ) : (
        <DefectKanbanView defects={defects} onSelect={handleSelect} onStatusChange={handleStatusChange} />
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
