import { semanticColors } from '../../theme';

const getRoomEntity = (item) => {
  if (!item) return null;
  if (item.floor) return item;
  if (item.room?.floor) return item.room;
  if (item.desk?.room?.floor) return item.desk.room;
  return null;
};

export function getLocationBuildingId(item) {
  const buildingId = getRoomEntity(item)?.floor?.building?.id;
  return buildingId == null ? '' : String(buildingId);
}

export function getLocationBuildingLabel(item) {
  const room = getRoomEntity(item);
  const building = room?.floor?.building;
  return building?.name || (building?.id != null ? `Building ${building.id}` : '');
}

export function getLocationRoomId(item) {
  const roomId = getRoomEntity(item)?.id;
  return roomId == null ? '' : String(roomId);
}

export function getLocationRoomLabel(item) {
  const room = getRoomEntity(item);
  return room?.remark || (room?.id != null ? `Room ${room.id}` : '');
}

export function getDeskSelectionLabel(desk) {
  if (!desk) return '';
  if (desk.remark) return desk.remark;
  if (desk.deskNumberInRoom != null) return `#${desk.deskNumberInRoom}`;
  return desk.id != null ? `Desk ${desk.id}` : '';
}

export function buildLocationLabel(defect) {
  if (!defect || !defect.desk) return '';
  const desk = defect.desk;
  const room = defect.room || desk.room;

  const parts = [];
  if (room?.floor?.building?.name) parts.push(room.floor.building.name);
  if (room?.floor?.name) parts.push(room.floor.name);
  if (room?.remark) parts.push(room.remark);

  const deskLabel = (desk.deskNumberInRoom ? `#${desk.deskNumberInRoom}` : null)
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
  LOW: semanticColors.defects.urgency.LOW,
  MEDIUM: semanticColors.defects.urgency.MEDIUM,
  HIGH: semanticColors.defects.urgency.HIGH,
  CRITICAL: semanticColors.defects.urgency.CRITICAL,
};
