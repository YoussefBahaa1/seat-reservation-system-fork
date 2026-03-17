import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box, Button, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Typography
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { getRequest, postRequest } from '../../RequestFunctions/RequestFunctions';
import { formatDate_yyyymmdd_to_ddmmyyyy } from '../../misc/formatDate';
import BookingFilters, { getBookingFilterFields } from './BookingFilters';

const formatRoleName = (roleName) => {
  if (!roleName) return '-';
  return roleName.replace('ROLE_', '').replace(/_/g, ' ');
};

const formatTimeValue = (value) => {
  if (!value) return '-';
  return String(value).slice(0, 5);
};

const normalizeDateValue = (value) => {
  if (!value) return '';
  return String(value).slice(0, 10);
};

const toTimeMinutes = (value) => {
  const normalized = formatTimeValue(value);
  if (!normalized.includes(':')) {
    return null;
  }

  const [hours, minutes] = normalized.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  return (hours * 60) + minutes;
};

const valueMatchesFilter = (itemValue, filterValue, field) => {
  if (!filterValue) {
    return true;
  }

  if (field.type === 'select') {
    return String(itemValue || '') === String(filterValue);
  }

  if (field.type === 'date') {
    return normalizeDateValue(itemValue) === filterValue;
  }

  if (field.type === 'time') {
    const itemMinutes = toTimeMinutes(itemValue);
    const filterMinutes = toTimeMinutes(filterValue);

    if (itemMinutes === null || filterMinutes === null) {
      return false;
    }

    if (field.key === 'begin') {
      return itemMinutes >= filterMinutes;
    }

    if (field.key === 'end') {
      return itemMinutes <= filterMinutes;
    }
  }

  return String(itemValue || '').toLowerCase().includes(String(filterValue).toLowerCase());
};

const getFilterCandidateValue = (row, key) => {
  if (key === 'email') {
    return row?.requesterEmail;
  }

  if (key === 'name') {
    return [row?.name, row?.surname].filter(Boolean).join(' ');
  }

  return row?.[key];
};

const ParkingRequestsView = ({ onChanged }) => {
  const { t } = useTranslation();
  const headers = useRef(JSON.parse(sessionStorage.getItem('headers')));
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState({});
  const [actionInFlightIds, setActionInFlightIds] = useState(new Set());
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const requestFilterFields = useMemo(() => getBookingFilterFields('parkings'), []);

  const loadPending = useCallback(() => {
    setIsLoading(true);
    getRequest(
      `${process.env.REACT_APP_BACKEND_URL}/parking/review/pending`,
      headers.current,
      (data) => {
        setRows(Array.isArray(data) ? data : []);
        setIsLoading(false);
      },
      () => {
        setIsLoading(false);
        toast.error(t('httpOther'));
      }
    );
  }, [t]);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  const review = (id, action) => {
    setActionInFlightIds((prev) => new Set(prev).add(id));
    postRequest(
      `${process.env.REACT_APP_BACKEND_URL}/parking/review/${id}/${action}`,
      headers.current,
      () => {
        toast.success(action === 'approve' ? t('parkingReviewApproved') : t('parkingReviewRejected'));
        setActionInFlightIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        loadPending();
        if (onChanged) onChanged();
      },
      (errorCode) => {
        setActionInFlightIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        if (errorCode === 409) {
          toast.warning(t('overlap'));
          loadPending();
          if (onChanged) onChanged();
          return;
        }
        toast.error(t('httpOther'));
      }
    );
  };

  const handleBulkApprove = () => {
    const ids = filteredRows.map((row) => row.id);
    if (ids.length === 0) return;
    setBulkSubmitting(true);
    postRequest(
      `${process.env.REACT_APP_BACKEND_URL}/parking/review/bulk-approve`,
      headers.current,
      (result) => {
        setBulkSubmitting(false);
        if (result.approved > 0) {
          toast.success(t('bulkApproveSuccess', { count: result.approved }));
        }
        if (result.failed > 0) {
          toast.warning(t('bulkApproveFailed', { count: result.failed }));
        }
        loadPending();
        if (onChanged) onChanged();
      },
      () => {
        setBulkSubmitting(false);
        toast.error(t('httpOther'));
      },
      JSON.stringify({ ids })
    );
  };

  const filteredRows = useMemo(
    () => rows.filter((row) => (
      requestFilterFields.every((field) => (
        valueMatchesFilter(getFilterCandidateValue(row, field.key), filters[field.key], field)
      ))
    )),
    [filters, requestFilterFields, rows]
  );

  const filterOptions = useMemo(() => ({
    roles: rows
      .map((row) => row?.roleName)
      .filter(Boolean)
      .sort((a, b) => String(a).localeCompare(String(b))),
    spotLabels: rows
      .map((row) => row?.spotLabel)
      .filter(Boolean)
      .sort((a, b) => String(a).localeCompare(String(b))),
  }), [rows]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <BookingFilters
          viewMode="parkings"
          filters={filters}
          setFilters={setFilters}
          onReset={() => setFilters({})}
          selectOptions={filterOptions}
        />
      </Paper>

      {isLoading && (
        <Typography variant="body2" sx={{ mb: 1 }}>
          {t('loading')}...
        </Typography>
      )}
      {!isLoading && rows.length < 1 && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="body2">{t('parkingReviewNone')}</Typography>
        </Paper>
      )}
      {!isLoading && rows.length > 0 && filteredRows.length < 1 && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="body2">{t('noBookingsFound')}</Typography>
        </Paper>
      )}
      {filteredRows.length > 0 && (
        <>
          <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              color="success"
              size="small"
              disabled={filteredRows.length === 0 || bulkSubmitting || actionInFlightIds.size > 0}
              onClick={handleBulkApprove}
            >
              {bulkSubmitting ? `${t('loading')}...` : `${t('bulkApprove')} (${filteredRows.length})`}
            </Button>
            <Typography variant="body2" color="text.secondary">
              {t('resultsShown', { count: filteredRows.length })}
            </Typography>
          </Box>
          <TableContainer component={Paper} variant="outlined" sx={{ width: '100%', maxHeight: 'calc(100vh - 360px)', overflowY: 'auto' }}>
            <Table stickyHeader size="small" sx={{ minWidth: 1060 }}>
              <TableHead>
                <TableRow>
                  <TableCell>{t('date')}</TableCell>
                  <TableCell>{t('startTime')}</TableCell>
                  <TableCell>{t('endTime')}</TableCell>
                  <TableCell>{t('email')}</TableCell>
                  <TableCell>{t('filterName')}</TableCell>
                  <TableCell>{t('filterRole')}</TableCell>
                  <TableCell>{t('filterDepartment')}</TableCell>
                  <TableCell>{t('spotNumber')}</TableCell>
                  <TableCell>{t('action')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRows.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell>{formatDate_yyyymmdd_to_ddmmyyyy(row.day)}</TableCell>
                    <TableCell>{formatTimeValue(row.begin)}</TableCell>
                    <TableCell>{formatTimeValue(row.end)}</TableCell>
                    <TableCell>{row.requesterEmail || row.requesterUserId}</TableCell>
                    <TableCell>{[row.name, row.surname].filter(Boolean).join(' ') || '-'}</TableCell>
                    <TableCell>{formatRoleName(row.roleName)}</TableCell>
                    <TableCell>{row.department || '-'}</TableCell>
                    <TableCell>{row.spotLabel}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {(() => {
                          const rowBusy = bulkSubmitting || actionInFlightIds.has(row.id);
                          return (
                            <>
                        <Button
                          variant="contained"
                          size="small"
                          color="success"
                          disabled={rowBusy || actionInFlightIds.size > 0}
                          onClick={() => review(row.id, 'approve')}
                        >
                          {actionInFlightIds.has(row.id) ? `${t('loading')}...` : t('parkingReviewApprove')}
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          color="error"
                          disabled={rowBusy || actionInFlightIds.size > 0}
                          onClick={() => review(row.id, 'reject')}
                        >
                          {actionInFlightIds.has(row.id) ? `${t('loading')}...` : t('parkingReviewReject')}
                        </Button>
                            </>
                          );
                        })()}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Box>
  );
};

export default ParkingRequestsView;
