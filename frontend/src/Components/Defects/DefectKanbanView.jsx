import { Box, Paper, Typography, Chip, Button } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { buildLocationLabel, URGENCY_LABELS, CATEGORY_LABELS, URGENCY_COLORS } from './defectUtils';

const COLUMNS = [
  { status: 'NEW', labelKey: 'defectNew', color: '#1976d2' },
  { status: 'IN_PROGRESS', labelKey: 'defectInProgress', color: '#ed6c02' },
  { status: 'RESOLVED', labelKey: 'defectResolved', color: '#2e7d32' },
];

const DefectKanbanView = ({ defects, onSelect, onStatusChange }) => {
  const { t } = useTranslation();

  return (
    <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 2 }}>
      {COLUMNS.map((col) => {
        const items = defects.filter(d => d.status === col.status);
        return (
          <Box key={col.status} sx={{ minWidth: 300, flex: 1 }}>
            <Paper
              sx={{
                p: 1.5,
                mb: 1,
                backgroundColor: col.color,
                color: '#fff',
                textAlign: 'center',
              }}
            >
              <Typography variant="subtitle1" fontWeight={600}>
                {t(col.labelKey)} ({items.length})
              </Typography>
            </Paper>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {items.map((d) => (
                <Paper
                  key={d.id}
                  elevation={2}
                  sx={{
                    p: 1.5,
                    cursor: 'pointer',
                    '&:hover': { boxShadow: 4 },
                    borderLeft: `4px solid ${URGENCY_COLORS[d.urgency] || '#999'}`,
                  }}
                  onClick={() => onSelect(d)}
                >
                  <Typography variant="body2" fontWeight={600}>{d.ticketNumber}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                    {buildLocationLabel(d)}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 0.5 }}>
                    <Chip
                      label={t(URGENCY_LABELS[d.urgency] || d.urgency)}
                      size="small"
                      sx={{ backgroundColor: URGENCY_COLORS[d.urgency], color: '#fff', height: 20, fontSize: '0.7rem' }}
                    />
                    <Chip
                      label={t(CATEGORY_LABELS[d.category] || d.category)}
                      size="small"
                      variant="outlined"
                      sx={{ height: 20, fontSize: '0.7rem' }}
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {d.reportedAt ? new Date(d.reportedAt).toLocaleDateString() : ''}
                    {d.assignedTo ? ` • ${d.assignedTo.name || ''} ${d.assignedTo.surname || ''}`.trim() : ''}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, mt: 1 }}>
                    {col.status === 'NEW' && (
                      <Button
                        size="small" variant="outlined" color="warning"
                        onClick={(e) => { e.stopPropagation(); onStatusChange(d.id, 'IN_PROGRESS'); }}
                      >
                        → {t('defectInProgress')}
                      </Button>
                    )}
                    {col.status === 'IN_PROGRESS' && (
                      <Button
                        size="small" variant="outlined" color="success"
                        onClick={(e) => { e.stopPropagation(); onStatusChange(d.id, 'RESOLVED'); }}
                      >
                        → {t('defectResolved')}
                      </Button>
                    )}
                  </Box>
                </Paper>
              ))}
              {items.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                  {t('defectNoDefects')}
                </Typography>
              )}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};

export default DefectKanbanView;
