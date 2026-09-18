export const TOWERDOG_PROFILE_BORDER_URL = "/attached_assets/Profile-border-v2.png";

export type RasterBorderCalibration = {
  ringCenterX: number;
  ringCenterY: number;
  innerDiameter: number;
  overlap: number;
  sizeAdjustment: number;
};

// Calibrated from the main blue summer tube in the 1254x1254 source PNG.
// Decorations outside the tube are intentionally ignored when measuring the
// ring centre and opening.
const RASTER_BORDER_CALIBRATIONS: Record<string, RasterBorderCalibration> = {
  "player2-blue-summer-border": {
    ringCenterX: 0.5,
    ringCenterY: 0.486,
    innerDiameter: 0.83,
    overlap: 0.02,
    sizeAdjustment: 0.96,
  },
};

export const getRasterBorderCalibration = (border: { id: number; name: string }): RasterBorderCalibration | undefined => {
  if (
    border.id === 44 ||
    border.name.trim().toLowerCase() === "player2 blue summer border"
  ) {
    return RASTER_BORDER_CALIBRATIONS["player2-blue-summer-border"];
  }

  return undefined;
};


/** Apply the equipped colour to monochrome/currentColor frame art. */
export function colorizeAvatarFrame(svg: string, color: string): string {
  return svg
    .replace(/fill\s*=\s*["'](?:#000000|#000|black|rgb\(0,\s*0,\s*0\))["']/gi, `fill="${color}"`)
    .replace(/stroke\s*=\s*["'](?:#000000|#000|black|rgb\(0,\s*0,\s*0\))["']/gi, `stroke="${color}"`)
    .replace(/fill\s*:\s*(?:#000000|#000|black|rgb\(0,\s*0,\s*0\))/gi, `fill: ${color}`)
    .replace(/stroke\s*:\s*(?:#000000|#000|black|rgb\(0,\s*0,\s*0\))/gi, `stroke: ${color}`)
    .replace(/fill\s*=\s*["']currentColor["']/gi, `fill="${color}"`)
    .replace(/stroke\s*=\s*["']currentColor["']/gi, `stroke="${color}"`)
    .replace(/fill\s*:\s*currentColor/gi, `fill: ${color}`)
    .replace(/stroke\s*:\s*currentColor/gi, `stroke: ${color}`)
    .replace(/stroke-width\s*=\s*["']\d+["']/gi, `stroke-width="2"`)
    .replace(/stroke-width\s*:\s*\d+/gi, `stroke-width: 2`);
}
