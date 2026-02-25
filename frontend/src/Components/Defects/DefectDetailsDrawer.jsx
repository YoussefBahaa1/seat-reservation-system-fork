import { useState, useEffect, useCallback } from 'react';
import {
  Drawer, Box, Typography, Chip, Divider, Button, TextField,
  FormControl, InputLabel, Select, MenuItem, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, Paper
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { getRequest, postRequest, putRequest, deleteRequest } from '../RequestFunctions/RequestFunctions';
import {
  buildLocationLabel, CATEGORY_LABELS, URGENCY_LABELS,
  STATUS_LABELS, URGENCY_COLORS
} from './defectUtils';

const DefectDetailsDrawer = ({ defect, open, onClose, onUpdate }) => {
  const { t } = useTranslation();
  const headers = JSON.parse(sessionStorage.getItem('headers'));
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [editingNote, setEditingNote] = useState(null);
  const [editNoteContent, setEditNoteContent] = useState('');
  const [blockDate, setBlockDate] = useState('');
  const [updateEndDate, setUpdateEndDate] = useState('');
  const [blockPromptOpen, setBlockPromptOpen] = useState(false);
  const [futureBookingCount, setFutureBookingCount] = useState(null);
  const [pendingBlockDate, setPendingBlockDate] = useState('');
  const currentUserId = Number(localStorage.getItem('userId'));

  const canManageNote = (note) => (
    Number.isFinite(currentUserId)
    && note?.author?.id != null
    && Number(note.author.id) === currentUserId
  );

  const fetchNotes = useCallback(() => {
    if (!defect) return;
    getRequest(
      `${process.env.REACT_APP_BACKEND_URL}/defects/${defect.id}/notes`,
      headers,
      setNotes,
      () => {}
    );
  }, [defect]);

  useEffect(() => {
    if (defect && open) fetchNotes();
  }, [defect, open, fetchNotes]);

  if (!defect) return null;

  const handleStatusChange = (newStatus) => {
    putRequest(
      `${process.env.REACT_APP_BACKEND_URL}/defects/${defect.id}/status`,
      headers,
      () => { toast.success(t('defectStatusUpdated')); onUpdate(); },
      () => toast.error(t('defectStatusUpdateFailed')),
      JSON.stringify({ status: newStatus })
    );
  };

  const handleAddNote = () => {
    if (!newNote.trim()) {
      toast.warning(t('defectNoteEmpty'));
      return;
    }
    postRequest(
      `${process.env.REACT_APP_BACKEND_URL}/defects/${defect.id}/notes`,
      headers,
      () => { toast.success(t('defectNoteSaved')); setNewNote(''); fetchNotes(); },
      () => toast.error(t('defectReportFailed')),
      JSON.stringify({ content: newNote.trim() })
    );
  };

  const handleEditNote = (note) => {
    if (!canManageNote(note)) {
      toast.error(t('defectNoteAuthorOnly'));
      return;
    }
    setEditingNote(note.id);
    setEditNoteContent(note.content);
  };

  const handleSaveEditNote = () => {
    if (!editNoteContent.trim()) {
      toast.warning(t('defectNoteEmpty'));
      return;
    }
    putRequest(
      `${process.env.REACT_APP_BACKEND_URL}/defects/${defect.id}/notes/${editingNote}`,
      headers,
      () => { toast.success(t('defectNoteSaved')); setEditingNote(null); fetchNotes(); },
      (status) => {
        if (status === 403) {
          toast.error(t('defectNoteAuthorOnly'));
          return;
        }
        toast.error(t('defectReportFailed'));
      },
      JSON.stringify({ content: editNoteContent.trim() })
    );
  };

  const handleDeleteNote = (note) => {
    if (!canManageNote(note)) {
      toast.error(t('defectNoteAuthorOnly'));
      return;
    }
    if (!window.confirm(t('defectDeleteNoteConfirm'))) {
      return;
    }

    deleteRequest(
      `${process.env.REACT_APP_BACKEND_URL}/defects/${defect.id}/notes/${note.id}`,
      headers,
      () => {
        toast.success(t('defectNoteDeleted'));
        if (editingNote === note.id) {
          setEditingNote(null);
          setEditNoteContent('');
        }
        fetchNotes();
      },
      (status) => {
        if (status === 403) {
          toast.error(t('defectNoteAuthorOnly'));
          return;
        }
        toast.error(t('defectNoteDeleteFailed'));
      }
    );
  };

  const handleBlock = (cancelFutureBookings) => {
    const dateToUse = cancelFutureBookings !== undefined ? pendingBlockDate : blockDate;
    putRequest(
      `${process.env.REACT_APP_BACKEND_URL}/defects/${defect.id}/block`,
      headers,
      () => {
        toast.success(t('defectBlockSuccess'));
        setBlockDate('');
        setBlockPromptOpen(false);
        onUpdate();
      },
      (status, errorData) => {
        const conflictWithFutureBookings = status === 409 && (
          errorData?.code === 'FUTURE_BOOKINGS_EXIST'
          || typeof errorData?.futureBookingCount === 'number'
        );
        if (conflictWithFutureBookings) {
          setPendingBlockDate(dateToUse);
          setFutureBookingCount(
            typeof errorData?.futureBookingCount === 'number'
              ? errorData.futureBookingCount
              : null
          );
          setBlockPromptOpen(true);
        } else {
          toast.error(t('defectReportFailed'));
        }
      },
      JSON.stringify({
        estimatedEndDate: dateToUse,
        cancelFutureBookings: cancelFutureBookings !== undefined ? cancelFutureBookings : null
      })
    );
  };

  const handleUnblock = () => {
    putRequest(
      `${process.env.REACT_APP_BACKEND_URL}/defects/${defect.id}/unblock`,
      headers,
      () => { toast.success(t('defectUnblockSuccess')); onUpdate(); },
      () => toast.error(t('defectReportFailed'))
    );
  };

  const desk = defect.desk;
  const isBlocked = desk && desk.blocked && desk.blockedByDefectId === defect.id;

  return (
    <>
      <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: 480, p: 0 } }}>
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">{t('defectDetails')}</Typography>
            <IconButton onClick={onClose}><CloseIcon /></IconButton>
          </Box>

          <Typography variant="subtitle2" color="text.secondary">{t('defectTicket')}</Typography>
          <Typography variant="body1" fontWeight={600} sx={{ mb: 1 }}>{defect.ticketNumber}</Typography>

          <Typography variant="subtitle2" color="text.secondary">{t('defectLocation')}</Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>{buildLocationLabel(defect)}</Typography>

          <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
            <Chip label={t(STATUS_LABELS[defect.status])} size="small"
              color={defect.status === 'NEW' ? 'info' : defect.status === 'IN_PROGRESS' ? 'warning' : 'success'} />
            <Chip label={t(URGENCY_LABELS[defect.urgency])} size="small"
              sx={{ backgroundColor: URGENCY_COLORS[defect.urgency], color: '#fff' }} />
            <Chip label={t(CATEGORY_LABELS[defect.category])} size="small" variant="outlined" />
          </Box>

          <Typography variant="subtitle2" color="text.secondary">{t('defectReporter')}</Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            {defect.reporter ? `${defect.reporter.name || ''} ${defect.reporter.surname || ''} (${defect.reporter.email})`.trim() : '—'}
          </Typography>

          <Typography variant="subtitle2" color="text.secondary">{t('defectTimestamp')}</Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            {defect.reportedAt ? new Date(defect.reportedAt).toLocaleString() : '—'}
          </Typography>

          <Typography variant="subtitle2" color="text.secondary">{t('defectDescription')}</Typography>
          <Typography variant="body2" sx={{ mb: 1, whiteSpace: 'pre-wrap' }}>{defect.description}</Typography>

          <Typography variant="subtitle2" color="text.secondary">{t('defectAssignedTo')}</Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {defect.assignedTo ? `${defect.assignedTo.name || ''} ${defect.assignedTo.surname || ''}`.trim() : '—'}
          </Typography>

          {defect.status !== 'RESOLVED' && (
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              {defect.status === 'NEW' && (
                <Button variant="contained" color="warning" size="small"
                  onClick={() => handleStatusChange('IN_PROGRESS')}>
                  → {t('defectInProgress')}
                </Button>
              )}
              {defect.status === 'IN_PROGRESS' && (
                <Button variant="contained" color="success" size="small"
                  onClick={() => handleStatusChange('RESOLVED')}>
                  → {t('defectResolved')}
                </Button>
              )}
            </Box>
          )}

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
            {isBlocked ? t('defectBlocked') : t('defectBlockDesk')}
          </Typography>

          {isBlocked ? (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                {t('defectBlockedReason', { reason: t(CATEGORY_LABELS[desk.blockedReasonCategory] || desk.blockedReasonCategory) })}
              </Typography>
              {desk.blockedEstimatedEndDate && (
                <Typography variant="body2" sx={{ mb: 1 }}>
                  {t('defectBlockedUntil', { date: desk.blockedEstimatedEndDate })}
                </Typography>
              )}
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
                <TextField
                  size="small" type="date" label={t('defectUpdateEndDate')}
                  value={updateEndDate}
                  onChange={(e) => setUpdateEndDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
                <Button variant="outlined" size="small" disabled={!updateEndDate}
                  onClick={() => {
                    putRequest(
                      `${process.env.REACT_APP_BACKEND_URL}/defects/${defect.id}/block`,
                      headers,
                      () => { toast.success(t('defectBlockSuccess')); setUpdateEndDate(''); onUpdate(); },
                      () => toast.error(t('defectReportFailed')),
                      JSON.stringify({ estimatedEndDate: updateEndDate, cancelFutureBookings: false })
                    );
                  }}>
                  {t('update')}
                </Button>
              </Box>
              <Button variant="outlined" color="error" size="small" onClick={handleUnblock}>
                {t('defectUnblockDesk')}
              </Button>
            </Box>
          ) : defect.status !== 'RESOLVED' ? (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 2 }}>
              <TextField
                size="small" type="date" label={t('defectEstimatedEndDate')}
                value={blockDate}
                onChange={(e) => setBlockDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              <Button variant="contained" color="error" size="small" disabled={!blockDate}
                onClick={() => handleBlock()}>
                {t('defectBlockDesk')}
              </Button>
            </Box>
          ) : null}

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
            {t('defectInternalNotes')}
          </Typography>

          {notes.map((note) => {
            const ownNote = canManageNote(note);
            return (
              <Paper key={note.id} variant="outlined" sx={{ p: 1, mb: 1 }}>
                {editingNote === note.id ? (
                  <Box>
                    <TextField
                      fullWidth
                      multiline
                      minRows={2}
                      value={editNoteContent}
                      onChange={(e) => setEditNoteContent(e.target.value)}
                      size="small"
                    />
                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                      <Button size="small" onClick={handleSaveEditNote}>{t('submit')}</Button>
                      <Button size="small" onClick={() => setEditingNote(null)}>{t('cancel')}</Button>
                    </Box>
                  </Box>
                ) : (
                  <>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{note.content}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {note.author ? `${note.author.name || ''} ${note.author.surname || ''}`.trim() : ''}
                      {' • '}
                      {note.createdAt ? new Date(note.createdAt).toLocaleString() : ''}
                      {note.updatedAt ? ` (${t('defectNoteEdited')}: ${new Date(note.updatedAt).toLocaleString()})` : ''}
                    </Typography>
                    {ownNote && (
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button size="small" onClick={() => handleEditNote(note)}>{t('defectEditNote')}</Button>
                        <Button size="small" color="error" onClick={() => handleDeleteNote(note)}>
                          {t('defectDeleteNote')}
                        </Button>
                      </Box>
                    )}
                  </>
                )}
              </Paper>
            );
          })}

          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            <TextField fullWidth multiline minRows={2} size="small"
              label={t('defectNoteContent')} value={newNote}
              onChange={(e) => setNewNote(e.target.value)} />
          </Box>
          <Button size="small" sx={{ mt: 1 }} onClick={handleAddNote} variant="outlined">
            {t('defectAddNote')}
          </Button>
        </Box>
      </Drawer>

      <Dialog open={blockPromptOpen} onClose={() => setBlockPromptOpen(false)}>
        <DialogTitle>{t('defectBlockDesk')}</DialogTitle>
        <DialogContent>
          <Typography>{t('defectFutureBookingsPrompt', { count: futureBookingCount ?? '?' })}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setBlockPromptOpen(false); handleBlock(false); }}>
            {t('defectRetainBookings')}
          </Button>
          <Button color="error" onClick={() => { setBlockPromptOpen(false); handleBlock(true); }}>
            {t('defectCancelBookings')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default DefectDetailsDrawer;
