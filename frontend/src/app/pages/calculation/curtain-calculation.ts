export interface CurtainCalculationInput {
  treatmentType: 'Curtain' | 'Roman Blind' | 'Other Blind' | 'Wallpaper' | string;
  width: number | null;
  height: number | null;
  panels?: number | null;
  isDoubleCurtain?: boolean;
  curtainType?: 'Main' | 'Sheer' | string;
  sheerWidth?: number | null;
  sheerHeight?: number | null;
  sheerPanels?: number | null;
}

export function calculateMainCurtainRequirement(input: CurtainCalculationInput): number {
  if (!input.isDoubleCurtain && input.curtainType === 'Sheer') {
    return 0;
  }

  const height = Number(input.height ?? 0);
  const panels = Number(input.panels ?? 0);

  if (height <= 0 || panels <= 0) {
    return 0;
  }

  const mainPanels = Math.max(1, panels);
  return roundToTwo(((height + 10) * mainPanels) / 39);
}

export function calculateSheerCurtainRequirement(input: CurtainCalculationInput): number {
  if (!input.isDoubleCurtain) {
    if (input.curtainType === 'Sheer') {
      const height = Number(input.height ?? 0);
      const panels = Number(input.panels ?? 0);
      if (height <= 0 || panels <= 0) return 0;
      return roundToTwo(((height + 10) * Math.max(1, panels)) / 39);
    }
    return 0;
  }

  const width = Number(input.width ?? 0);
  const height = Number(input.height ?? 0);
  const panels = Number(input.panels ?? 0);

  const sheerHeight = Number(input.sheerHeight ?? height);
  let sheerPanels = Number(input.sheerPanels ?? panels);

  if (sheerPanels <= 0) {
    const sheerWidth = Number(input.sheerWidth ?? width);
    sheerPanels = sheerWidth > 0 ? Math.ceil(sheerWidth / 20) : Math.max(1, panels);
  }

  if (sheerHeight <= 0 || sheerPanels <= 0) {
    return 0;
  }

  return roundToTwo(((sheerHeight + 10) * sheerPanels) / 39);
}

export function calculateWallpaperArea(width: number | null, height: number | null): number {
  const w = Number(width ?? 0);
  const h = Number(height ?? 0);
  if (w <= 0 || h <= 0) return 0;
  const areaSqFt = (w * h) / 144;
  return roundToTwo(Math.max(12, areaSqFt));
}

export function calculateBlindsArea(width: number | null, height: number | null): number {
  const w = Number(width ?? 0);
  const h = Number(height ?? 0);
  if (w <= 0 || h <= 0) return 0;
  const areaSqFt = (w * h) / 144;
  return roundToTwo(Math.max(12, areaSqFt));
}

export function calculateWindowRequirement(input: CurtainCalculationInput): number {
  if (input.treatmentType === 'Curtain') {
    if (!input.isDoubleCurtain) {
      if (input.curtainType === 'Sheer') {
        return calculateSheerCurtainRequirement(input);
      }
      return calculateMainCurtainRequirement(input);
    }
    const main = calculateMainCurtainRequirement(input);
    const sheer = calculateSheerCurtainRequirement(input);
    return roundToTwo(main + sheer);
  }

  if (input.treatmentType === 'Wallpaper') {
    return calculateWallpaperArea(input.width, input.height);
  }

  return calculateBlindsArea(input.width, input.height);
}

export function isRomanBlind(treatmentType?: string | null): boolean {
  if (!treatmentType) return false;
  const t = treatmentType.trim().toLowerCase();
  return t === 'roman blind' || t === 'roman' || t.startsWith('roman');
}

export function isOtherBlind(treatmentType?: string | null): boolean {
  if (!treatmentType) return false;
  const t = treatmentType.trim().toLowerCase();
  if (t === 'curtain' || t === 'wallpaper') return false;
  return !isRomanBlind(treatmentType);
}

export function isBlind(treatmentType?: string | null): boolean {
  if (!treatmentType) return false;
  const t = treatmentType.trim().toLowerCase();
  return t !== 'curtain' && t !== 'wallpaper';
}

export function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

