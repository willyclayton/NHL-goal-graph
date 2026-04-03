// NHL half-rink geometry (in feet)
// Full rink: 200ft x 85ft. Half-rink: 100ft x 85ft.
// API coordinates: x ∈ [-100, 100], y ∈ [-42.5, 42.5]

export const RINK = {
  halfWidth: 100,
  height: 85,
  halfHeight: 42.5,

  // Lines
  goalLineX: 89,
  blueLineX: 25,

  // Faceoff circles (two in offensive zone)
  faceoffCircleRadius: 15,
  faceoffCircles: [
    { x: 69, y: 22 },
    { x: 69, y: -22 },
  ],

  // Faceoff dots
  faceoffDots: [
    { x: 69, y: 22 },
    { x: 69, y: -22 },
    { x: 20, y: 22 },
    { x: 20, y: -22 },
  ],

  // Crease
  creaseX: 89,
  creaseRadius: 6,

  // Corner radius
  cornerRadius: 28,

  // Goal net position
  goalNetX: 89,
  goalNetWidth: 3,
  goalNetHeight: 6,
} as const;

// Padding around the rink in canvas pixels
export const RINK_PADDING = 20;
