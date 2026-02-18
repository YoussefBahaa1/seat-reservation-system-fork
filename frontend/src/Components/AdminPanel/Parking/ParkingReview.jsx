import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { getRequest, postRequest } from '../../RequestFunctions/RequestFunctions';
import LayoutModalAdmin from '../../Templates/LayoutModalAdmin';

const formatDateTime = (day, begin) => {
  if (!day || !begin) return '-';
  const beginStr = String(begin).slice(0, 5);
  return `${day} ${beginStr}`;
};

const ParkingReview = ({ isOpen, onClose, onChanged }) => {
  const { t } = useTranslation();
  const headers = useRef(JSON.parse(sessionStorage.getItem('headers')));
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadPending = useCallback(() => {
    if (!isOpen) return;
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
  }, [isOpen, t]);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  const review = (id, action) => {
    postRequest(
      `${process.env.REACT_APP_BACKEND_URL}/parking/review/${id}/${action}`,
      headers.current,
      () => {
        toast.success(action === 'approve' ? t('parkingReviewApproved') : t('parkingReviewRejected'));
        loadPending();
        if (onChanged) onChanged();
      },
      (errorCode) => {
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

  return (
    <LayoutModalAdmin
      isOpen={isOpen}
      onClose={onClose}
      title={t('parkingReview')}
      widthInPx={980}
    >
      <Box sx={{ minHeight: 200 }}>
        {isLoading && (
          <Typography variant="body2" sx={{ mb: 1 }}>
            {t('loading')}...
          </Typography>
        )}
        {!isLoading && rows.length < 1 && (
          <Typography variant="body2">{t('parkingReviewNone')}</Typography>
        )}
        {rows.length > 0 && (
          <TableContainer component={Paper} sx={{ maxHeight: 420 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>{t('carparkSpot')}</TableCell>
                  <TableCell>{t('start')}</TableCell>
                  <TableCell>{t('end')}</TableCell>
                  <TableCell>{t('parkingReviewRequester')}</TableCell>
                  <TableCell>{t('action')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.id}</TableCell>
                    <TableCell>{row.spotLabel}</TableCell>
                    <TableCell>{formatDateTime(row.day, row.begin)}</TableCell>
                    <TableCell>{formatDateTime(row.day, row.end)}</TableCell>
                    <TableCell>{row.requesterEmail || row.requesterUserId}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          variant="contained"
                          size="small"
                          color="success"
                          onClick={() => review(row.id, 'approve')}
                        >
                          {t('parkingReviewApprove')}
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          color="error"
                          onClick={() => review(row.id, 'reject')}
                        >
                          {t('parkingReviewReject')}
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </LayoutModalAdmin>
  );
};

export default ParkingReview;
