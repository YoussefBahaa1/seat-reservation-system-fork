import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { buildLocationLabel, CATEGORY_LABELS, URGENCY_LABELS, STATUS_LABELS, URGENCY_COLORS } from './defectUtils';

const DefectListView = ({ defects, onSelect }) => {
  const { t } = useTranslation();

  if (!defects.length) {
    return <div style={{ padding: 16 }}>{t('defectNoDefects')}</div>;
  }

  return (
    <TableContainer component={Paper} sx={{ maxHeight: 600, overflowY: 'auto' }}>
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            <TableCell>{t('defectTicket')}</TableCell>
            <TableCell>{t('defectLocation')}</TableCell>
            <TableCell>{t('status')}</TableCell>
            <TableCell>{t('defectUrgency')}</TableCell>
            <TableCell>{t('defectCategory')}</TableCell>
            <TableCell>{t('defectReportedAt')}</TableCell>
            <TableCell>{t('defectAssignedTo')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {defects.map((d) => (
            <TableRow
              key={d.id}
              hover
              sx={{ cursor: 'pointer' }}
              onClick={() => onSelect(d)}
            >
              <TableCell>{d.ticketNumber}</TableCell>
              <TableCell>{buildLocationLabel(d)}</TableCell>
              <TableCell>
                <Chip
                  label={t(STATUS_LABELS[d.status] || d.status)}
                  size="small"
                  color={d.status === 'NEW' ? 'info' : d.status === 'IN_PROGRESS' ? 'warning' : 'success'}
                />
              </TableCell>
              <TableCell>
                <Chip
                  label={t(URGENCY_LABELS[d.urgency] || d.urgency)}
                  size="small"
                  sx={{ backgroundColor: URGENCY_COLORS[d.urgency], color: '#fff' }}
                />
              </TableCell>
              <TableCell>{t(CATEGORY_LABELS[d.category] || d.category)}</TableCell>
              <TableCell>{d.reportedAt ? new Date(d.reportedAt).toLocaleString() : ''}</TableCell>
              <TableCell>
                {d.assignedTo
                  ? `${d.assignedTo.name || ''} ${d.assignedTo.surname || ''}`.trim()
                  : '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default DefectListView;
