export const PARKING_IMAGE_SRC = '/Assets/carpark_overview.svg';

// Positions are percentages relative to the parking image.
// This layout matches `frontend/public/Assets/carpark_overview.svg`.
export const PARKING_SPACES_LAYOUT = [
  // Top row (left -> right)
  { code: 'P37', left: 26.6667, top: 24.0, width: 5.8333, height: 32.0 },
  { code: 'P36', left: 32.9167, top: 24.0, width: 5.8333, height: 32.0 },
  { code: 'P35', left: 39.1667, top: 24.0, width: 5.8333, height: 32.0 },
  { code: 'P34', left: 45.4167, top: 24.0, width: 5.8333, height: 32.0 },
  { code: 'P33', left: 51.6667, top: 24.0, width: 5.8333, height: 32.0 },
  { code: 'P32', left: 57.9167, top: 24.0, width: 5.8333, height: 32.0 },
  { code: 'P31', left: 64.1667, top: 24.0, width: 5.8333, height: 32.0 },
  { code: 'P30', left: 70.4167, top: 24.0, width: 5.8333, height: 32.0 },
  { code: 'P29', left: 76.6667, top: 24.0, width: 5.8333, height: 32.0 },

  // Right-side special
  { code: 'P23', left: 84.1667, top: 18.0, width: 14.1667, height: 12.0 },

  // Bottom row (left area)
  { code: 'P43', left: 21.6667, top: 76.0, width: 7.5, height: 18.0 },

  // Bottom row (center, left -> right)
  { code: 'P40', left: 51.6667, top: 74.0, width: 7.5, height: 20.0 },
  { code: 'P39', left: 59.5833, top: 74.0, width: 7.5, height: 20.0 },
  { code: 'P38', left: 67.5, top: 74.0, width: 7.5, height: 20.0 },
];
