import {
  calculateWindowRequirement,
  calculateMainCurtainRequirement,
  calculateSheerCurtainRequirement,
  calculateWallpaperArea,
  calculateBlindsArea,
  isRomanBlind,
  isOtherBlind,
  isBlind
} from './curtain-calculation';

describe('curtain calculation', () => {
  it('calculates a single main curtain window (default)', () => {
    const requirement = calculateWindowRequirement({
      treatmentType: 'Curtain',
      width: 96,
      height: 84,
      panels: 3,
      curtainType: 'Main'
    });

    expect(requirement).toBeCloseTo(7.23, 2);
    expect(calculateMainCurtainRequirement({
      treatmentType: 'Curtain',
      width: 96,
      height: 84,
      panels: 3,
      curtainType: 'Main'
    })).toBeCloseTo(7.23, 2);
    expect(calculateSheerCurtainRequirement({
      treatmentType: 'Curtain',
      width: 96,
      height: 84,
      panels: 3,
      curtainType: 'Main'
    })).toBe(0);
  });

  it('calculates a single sheer curtain only window', () => {
    const input = {
      treatmentType: 'Curtain',
      width: 96,
      height: 84,
      panels: 3,
      curtainType: 'Sheer'
    };

    const requirement = calculateWindowRequirement(input);
    const mainReq = calculateMainCurtainRequirement(input);
    const sheerReq = calculateSheerCurtainRequirement(input);

    expect(requirement).toBeCloseTo(7.23, 2);
    expect(mainReq).toBe(0);
    expect(sheerReq).toBeCloseTo(7.23, 2);
  });

  it('calculates main and sheer curtain requirements separately for a double curtain window', () => {
    const input = {
      treatmentType: 'Curtain',
      width: 96,
      height: 84,
      panels: 3,
      isDoubleCurtain: true,
      sheerWidth: 96,
      sheerHeight: 84,
      sheerPanels: 3
    };

    const mainReq = calculateMainCurtainRequirement(input);
    const sheerReq = calculateSheerCurtainRequirement(input);
    const totalReq = calculateWindowRequirement(input);

    expect(mainReq).toBeCloseTo(7.23, 2);
    expect(sheerReq).toBeCloseTo(7.23, 2);
    expect(totalReq).toBeCloseTo(14.46, 2);
  });

  it('calculates double curtain with different sheer dimensions and panels', () => {
    const input = {
      treatmentType: 'Curtain',
      width: 100,
      height: 90,
      panels: 5,
      isDoubleCurtain: true,
      sheerWidth: 100,
      sheerHeight: 80,
      sheerPanels: 4
    };

    // Main: (90 + 10) * 5 / 39 = 500 / 39 = 12.82
    const mainReq = calculateMainCurtainRequirement(input);
    expect(mainReq).toBeCloseTo(12.82, 2);

    // Sheer: (80 + 10) * 4 / 39 = 360 / 39 = 9.23
    const sheerReq = calculateSheerCurtainRequirement(input);
    expect(sheerReq).toBeCloseTo(9.23, 2);

    // Total = 12.82 + 9.23 = 22.05
    const totalReq = calculateWindowRequirement(input);
    expect(totalReq).toBeCloseTo(22.05, 2);
  });

  it('calculates wallpaper area in sq ft with minimum 12 sq ft', () => {
    // 120" x 96" = 11520 sq in / 144 = 80 sq ft
    expect(calculateWallpaperArea(120, 96)).toBe(80);

    // Small wall: 24" x 24" = 576 sq in / 144 = 4 sq ft -> rounded up to 12 min
    expect(calculateWallpaperArea(24, 24)).toBe(12);

    expect(calculateWindowRequirement({ treatmentType: 'Wallpaper', width: 120, height: 96, panels: null })).toBe(80);
  });

  it('calculates blinds area in sq ft with minimum 12 sq ft', () => {
    expect(calculateBlindsArea(60, 60)).toBe(25);
    expect(calculateBlindsArea(20, 20)).toBe(12);
  });

  it('classifies Roman Blinds, Other Blinds, and generic blinds accurately', () => {
    // Roman blinds
    expect(isRomanBlind('Roman Blind')).toBe(true);
    expect(isRomanBlind('roman blind')).toBe(true);
    expect(isRomanBlind('Roman')).toBe(true);
    expect(isOtherBlind('Roman Blind')).toBe(false);
    expect(isBlind('Roman Blind')).toBe(true);

    // Other blinds
    expect(isRomanBlind('Other Blind')).toBe(false);
    expect(isOtherBlind('Other Blind')).toBe(true);
    expect(isBlind('Other Blind')).toBe(true);
    expect(isOtherBlind('Roller Blind')).toBe(true);
    expect(isOtherBlind('Vertical Blind')).toBe(true);

    // Curtains & Wallpaper
    expect(isRomanBlind('Curtain')).toBe(false);
    expect(isOtherBlind('Curtain')).toBe(false);
    expect(isBlind('Curtain')).toBe(false);

    expect(isRomanBlind('Wallpaper')).toBe(false);
    expect(isOtherBlind('Wallpaper')).toBe(false);
    expect(isBlind('Wallpaper')).toBe(false);
  });
});

