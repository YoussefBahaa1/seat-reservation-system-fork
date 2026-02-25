export function buildLocationLabel(defect) {
  if (!defect || !defect.desk) return '';
  const desk = defect.desk;
  const room = defect.room || desk.room;

  const parts = [];
  if (room?.floor?.building?.name) parts.push(room.floor.building.name);
  if (room?.floor?.name) parts.push(room.floor.name);
  if (room?.remark) parts.push(room.remark);

  const deskLabel = desk.workstationIdentifier
    || (desk.deskNumberInRoom ? `#${desk.deskNumberInRoom}` : null)
    || desk.remark
    || `ID ${desk.id}`;
  parts.push(deskLabel);

  return parts.join(' / ');
}

export const CATEGORY_LABELS = {
  TECHNICAL_DEFECT: 'defectCategoryTechnical',
  MISSING_EQUIPMENT: 'defectCategoryMissing',
  INCORRECT_DESCRIPTION: 'defectCategoryIncorrect',
};

export const URGENCY_LABELS = {
  LOW: 'defectUrgencyLow',
  MEDIUM: 'defectUrgencyMedium',
  HIGH: 'defectUrgencyHigh',
  CRITICAL: 'defectUrgencyCritical',
};

export const STATUS_LABELS = {
  NEW: 'defectNew',
  IN_PROGRESS: 'defectInProgress',
  RESOLVED: 'defectResolved',
};

export const URGENCY_COLORS = {
  LOW: '#4caf50',
  MEDIUM: '#ff9800',
  HIGH: '#f44336',
  CRITICAL: '#b71c1c',
};
