import { CustomerDetailComponent } from './customer-detail.component';

function createComponent(): CustomerDetailComponent {
  return new CustomerDetailComponent({} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
}

describe('CustomerDetailComponent', () => {
  it('groups windows by room and calculates room totals', () => {
    const component = createComponent();

    const quotation: any = {
      windows: [
        { location: 'Master Bedroom', windowName: 'Window 1', treatmentType: 'Curtain', requirement: 5.5, unit: 'm', panels: 3, width: 90, height: 84 },
        { location: 'Master Bedroom', windowName: 'Window 2', treatmentType: 'Curtain', requirement: 4.2, unit: 'm', panels: 2, width: 70, height: 80 },
        { location: 'Hall', windowName: 'Window 1', treatmentType: 'Roman Blind', requirement: 6.5, unit: 'sq ft', width: 80, height: 90 }
      ]
    };

    const groups = component.getRoomGroups(quotation);

    expect(groups.length).toBe(2);
    expect(groups[0].roomName).toBe('Master Bedroom');
    expect(groups[0].windows.length).toBe(2);
    expect(groups[0].totalCurtainMeters).toBe(9.7);
    expect(groups[1].roomName).toBe('Hall');
    expect(groups[1].totalBlindsArea).toBe(6.5);
    expect(component.countRooms(quotation)).toBe(2);
    expect(component.countWindowsExcludingWallpaper(quotation)).toBe(3);
  });

  it('does not treat wallpaper as a window in window counts and calculates total wallpaper area', () => {
    const component = createComponent();

    const quotation: any = {
      windows: [
        { location: 'Living Room', windowName: 'Window 1', treatmentType: 'Curtain', requirement: 6.0, unit: 'm', panels: 3, width: 90, height: 84 },
        { location: 'Living Room', windowName: 'Feature Wall', treatmentType: 'Wallpaper', requirement: 80, unit: 'sq ft', width: 120, height: 96 },
        { location: 'Bedroom', windowName: 'Back Wall', treatmentType: 'Wallpaper', requirement: 45, unit: 'sq ft', width: 90, height: 72 }
      ]
    };

    // Wallpaper is NOT counted as a window
    expect(component.countWindowsExcludingWallpaper(quotation)).toBe(1);

    const groups = component.getRoomGroups(quotation);
    expect(groups.length).toBe(2);

    // Living Room: 1 window, 80 sq ft wallpaper
    expect(component.roomWindowCount(groups[0])).toBe(1);
    expect(groups[0].totalCurtainMeters).toBe(6.0);
    expect(groups[0].totalWallpaperArea).toBe(80);

    // Bedroom: 0 windows, 45 sq ft wallpaper
    expect(component.roomWindowCount(groups[1])).toBe(0);
    expect(groups[1].totalWallpaperArea).toBe(45);

    // Total Wallpaper Area across all rooms
    expect(component.wallpaperArea(quotation)).toBe(125);
  });

  it('treats a double curtain as one window and calculates main and sheer separately', () => {
    const component = createComponent();

    const doubleWindow: any = {
      location: 'Master Bedroom',
      windowName: 'Balcony Window',
      treatmentType: 'Curtain',
      isDoubleCurtain: true,
      width: 96,
      height: 84,
      panels: 3,
      sheerWidth: 96,
      sheerHeight: 80,
      sheerPanels: 3,
      requirement: 14.15,
      unit: 'm'
    };

    const singleWindow: any = {
      location: 'Master Bedroom',
      windowName: 'Side Window',
      treatmentType: 'Curtain',
      isDoubleCurtain: false,
      width: 60,
      height: 84,
      panels: 2,
      requirement: 4.82,
      unit: 'm'
    };

    const blindWindow: any = {
      location: 'Hall',
      windowName: 'Kitchen Window',
      treatmentType: 'Roman Blind',
      width: 48,
      height: 48,
      requirement: 16.0,
      unit: 'sq ft'
    };

    const wallpaperItem: any = {
      location: 'Hall',
      windowName: 'Hall Wall',
      treatmentType: 'Wallpaper',
      width: 120,
      height: 96,
      requirement: 80,
      unit: 'sq ft'
    };

    const quotation: any = {
      windows: [doubleWindow, singleWindow, blindWindow, wallpaperItem]
    };

    // A double curtain window counts as ONE window. Total windows = 1 double + 1 single + 1 blind = 3 windows (wallpaper excluded)
    expect(component.countWindowsExcludingWallpaper(quotation)).toBe(3);
    expect(component.countDoubleCurtainWindows(quotation)).toBe(1);
    expect(component.countSingleCurtainWindows(quotation)).toBe(1);
    expect(component.countCurtainWindows(quotation)).toBe(2);
    // Roman vs Other blind counts and totals
    expect(component.countBlindWindows(quotation)).toBe(1);
    expect(component.countRomanBlindWindows(quotation)).toBe(1);
    expect(component.countOtherBlindWindows(quotation)).toBe(0);
    expect(component.romanBlindsArea(quotation)).toBe(16.0);
    expect(component.otherBlindsArea(quotation)).toBe(0);
    expect(component.blindsArea(quotation)).toBe(16.0);

    const groups = component.getRoomGroups(quotation);
    expect(groups.length).toBe(2);
    // Master Bedroom has 1 double curtain and 1 single curtain = 2 windows
    expect(component.roomWindowCount(groups[0])).toBe(2);
    // Hall has 1 blind and 1 wallpaper = 1 window
    expect(component.roomWindowCount(groups[1])).toBe(1);
    expect(groups[1].totalRomanBlindsArea).toBe(16.0);
    expect(groups[1].totalOtherBlindsArea).toBe(0);
    expect(groups[1].totalBlindsArea).toBe(16.0);

    // Main Curtain requirement for double window: (84 + 10) * 3 / 39 = 282 / 39 = 7.23
    expect(component.getMainRequirement(doubleWindow)).toBe(7.23);

    // Sheer Curtain requirement for double window: (80 + 10) * 3 / 39 = 270 / 39 = 6.92
    expect(component.getSheerRequirement(doubleWindow)).toBe(6.92);

    // Main Curtain total across quotation = 7.23 + 4.82 = 12.05
    expect(component.mainCurtainMeters(quotation)).toBe(12.05);

    // Sheer Curtain total across quotation = 6.92
    expect(component.sheerCurtainMeters(quotation)).toBe(6.92);

    // Total curtain cloth in quotation = 14.15 + 4.82 = 18.97
    expect(component.curtainMeters(quotation)).toBe(18.97);

    // Total panels in quotation = (3 main + 3 sheer) + 2 single = 8 panels
    expect(component.totalCurtainPanels(quotation)).toBe(8);
  });

  it('correctly calculates breakdown of Roman Blinds Total, Other Blinds Total, and Grand Total', () => {
    const component = createComponent();

    const quotation: any = {
      windows: [
        { location: 'Living Room', windowName: 'Window 1', treatmentType: 'Roman Blind', width: 60, height: 60, requirement: 25.0, unit: 'sq ft' },
        { location: 'Living Room', windowName: 'Window 2', treatmentType: 'Roman Blind', width: 48, height: 48, requirement: 16.0, unit: 'sq ft' },
        { location: 'Kitchen', windowName: 'Window 3', treatmentType: 'Other Blind', width: 36, height: 48, requirement: 12.0, unit: 'sq ft' },
        { location: 'Office', windowName: 'Window 4', treatmentType: 'Roller Blind', width: 40, height: 60, requirement: 16.67, unit: 'sq ft' },
        { location: 'Master Bedroom', windowName: 'Window 5', treatmentType: 'Curtain', width: 80, height: 84, panels: 3, requirement: 7.23, unit: 'm' }
      ]
    };

    // Total Windows = 4 blinds + 1 curtain = 5 windows
    expect(component.countWindowsExcludingWallpaper(quotation)).toBe(5);

    // Blind Windows breakdown
    expect(component.countBlindWindows(quotation)).toBe(4);
    expect(component.countRomanBlindWindows(quotation)).toBe(2);
    expect(component.countOtherBlindWindows(quotation)).toBe(2); // 'Other Blind' and 'Roller Blind'

    // Area calculations
    expect(component.romanBlindsArea(quotation)).toBe(41.0); // 25 + 16
    expect(component.otherBlindsArea(quotation)).toBe(28.67); // 12 + 16.67
    expect(component.blindsArea(quotation)).toBe(69.67); // 41.0 + 28.67

    // Room-level calculations
    const groups = component.getRoomGroups(quotation);
    expect(groups.length).toBe(4);

    const livingRoom = groups.find(g => g.roomName === 'Living Room')!;
    expect(livingRoom.totalRomanBlindsArea).toBe(41.0);
    expect(livingRoom.totalOtherBlindsArea).toBe(0);
    expect(livingRoom.totalBlindsArea).toBe(41.0);

    const kitchen = groups.find(g => g.roomName === 'Kitchen')!;
    expect(kitchen.totalRomanBlindsArea).toBe(0);
    expect(kitchen.totalOtherBlindsArea).toBe(12.0);
    expect(kitchen.totalBlindsArea).toBe(12.0);
  });

  it('returns zero balance when the payment is fully cleared', () => {
    const component = createComponent();
    component.customer = {
      products: [
        { quotationStatus: 'Approved', paymentStatus: 'Full payment cleared', finalAmount: 25000, balanceAmount: 25000 },
        { quotationStatus: 'Approved', paymentStatus: 'Pending', finalAmount: 8500, balanceAmount: 6500 }
      ]
    } as any;

    expect(component.effectiveBalance(component.customer!.products[0])).toBe(0);
    expect(component.totalOutstanding()).toBe(6500);
  });

  it('correctly calculates single main curtain vs single sheer curtain only in quotation calculations', () => {
    const component = createComponent();

    const singleMainCurtain: any = {
      location: 'Living Room',
      windowName: 'Main Window',
      treatmentType: 'Curtain',
      curtainType: 'Main',
      isDoubleCurtain: false,
      width: 60,
      height: 84,
      panels: 2,
      requirement: 4.82,
      unit: 'm'
    };

    const singleSheerCurtain: any = {
      location: 'Living Room',
      windowName: 'Sheer Window',
      treatmentType: 'Curtain',
      curtainType: 'Sheer',
      isDoubleCurtain: false,
      width: 80,
      height: 94,
      panels: 3,
      requirement: 8.0,
      unit: 'm'
    };

    const quotation: any = {
      windows: [singleMainCurtain, singleSheerCurtain]
    };

    expect(component.countSingleCurtainWindows(quotation)).toBe(2);
    expect(component.countSingleMainCurtainWindows(quotation)).toBe(1);
    expect(component.countSingleSheerCurtainWindows(quotation)).toBe(1);
    expect(component.countDoubleCurtainWindows(quotation)).toBe(0);

    expect(component.getMainRequirement(singleMainCurtain)).toBe(4.82);
    expect(component.getSheerRequirement(singleMainCurtain)).toBe(0);

    expect(component.getMainRequirement(singleSheerCurtain)).toBe(0);
    expect(component.getSheerRequirement(singleSheerCurtain)).toBe(8.0);

    expect(component.mainCurtainMeters(quotation)).toBe(4.82);
    expect(component.sheerCurtainMeters(quotation)).toBe(8.0);
    expect(component.curtainMeters(quotation)).toBe(12.82);
  });
});
