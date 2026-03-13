export const WORKSTATION_TYPE_VALUES = ['Standard', 'Silent', 'Ergonomic', 'Premium'];
export const MONITOR_COUNT_VALUES = [0, 1, 2, 3];
export const TECHNOLOGY_FILTER_VALUES = ['dockingStation', 'webcam', 'headset'];

export const workstationTypeOptions = (t) => (
  WORKSTATION_TYPE_VALUES.map((value) => ({
    value,
    label: t(`workstationType${value}`),
  }))
);

export const monitorCountOptions = () => (
  MONITOR_COUNT_VALUES.map((value) => ({
    value,
    label: String(value),
  }))
);

export const booleanChoiceOptions = (t, trueLabelKey = 'yes', falseLabelKey = 'no') => ([
  { value: 'true', label: t(trueLabelKey) },
  { value: 'false', label: t(falseLabelKey) },
]);

export const technologyOptions = (t) => ([
  { value: 'dockingStation', label: t('technologyDockingStation') },
  { value: 'webcam', label: t('technologyWebcam') },
  { value: 'headset', label: t('technologyHeadset') },
]);
