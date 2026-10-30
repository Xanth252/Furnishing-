export interface LoginRequest { username: string; password: string; }
export interface LoginResponse { token: string; username: string; }

export interface Customer {
  id: number; name: string; contactNumber: string;
  alternateContactNumber: string; address: string;
  notes: string; createdAt: string; productCount: number;
}

export interface CustomerDetail extends Customer { quotations: Quotation[]; products: Product[]; }

export interface QuotationWindow {
  id?: number;
  quotationId?: number;
  location: string;
  windowName?: string;
  treatmentType: 'Curtain' | 'Roman Blind' | 'Other Blind' | string;
  width: number;
  height: number;
  panels?: number | null;
  isDoubleCurtain?: boolean;
  curtainType?: 'Main' | 'Sheer' | string;
  sheerWidth?: number | null;
  sheerHeight?: number | null;
  sheerPanels?: number | null;
  requirement: number;
  unit: 'm' | 'sq ft' | string;
  remarks?: string;
}

export interface RoomCalculationGroup {
  roomName: string;
  windows: QuotationWindow[];
  totalCurtainMeters: number;
  totalBlindsArea: number;
  totalRomanBlindsArea?: number;
  totalOtherBlindsArea?: number;
  totalWallpaperArea: number;
}

export interface QuotationItem {
  id?: number;
  quotationId?: number;
  srNo: number;
  particular: string;
  description?: string;
  quantity: number;
  unit: string;
  rate: number;
  total: number;
}

export interface SavedParticular {
  id: number;
  particular: string;
  defaultUnit: string;
  defaultRate: number;
  usageCount: number;
  lastUsedAt?: string;
}

export interface BusinessProfile {
  firmName: string;
  address: string;
  contactNumber: string;
  email: string;
  gstNumber: string;
  panNumber: string;
  logoUrl?: string;
}

export interface BankDetails {
  bankName: string;
  accountName: string;
  accountNumber: string;
  ifscCode: string;
  branch: string;
  termsAndConditions: string;
}

export interface Quotation {
  id: number;
  customerId: number;
  customerName: string;
  customerContactNumber?: string;
  customerAddress?: string;
  quotationNumber?: string;
  title: string;
  createdAt: string;
  remarks: string;
  advancePayment: number;
  advancePaymentDate: string | null;
  discountType?: 'percent' | 'flat' | string;
  discountValue?: number;
  discountAmount?: number;
  subTotal?: number;
  finalAmount?: number;
  items?: QuotationItem[];
  products: Product[];
  windows?: QuotationWindow[];
  totalFinalAmount: number;
  totalProductAdvance: number;
  totalAdvance: number;
  totalBalance: number;
  quotationStatus: string;
  paymentStatus: string;
}

export interface Product {
  id: number; customerId: number; quotationId?: number | null; customerName: string;
  productName: string; serialNumber: string; company: string;
  productType: string; quantity: number; colour: string;
  measurement: string; dateOrdered: string | null;
  expectedDeliveryDate: string | null; internalRemarks: string;
  quotationAmount: number; discountAmount: number; finalAmount: number;
  quotationStatus: string; advancePayment: number; balanceAmount: number;
  paymentStatus: string; paymentDate: string | null; paymentRemarks: string;
  workStages: WorkStage[]; completedStages: number; totalStages: number;
}

export interface WorkStage {
  id: number; productId: number; stageOrder: number;
  stageName: string; isCompleted: boolean;
  dateCompleted: string | null; remarks: string;
}

export interface Dashboard {
  totalQuotations: number; approvedQuotations: number;
  rejectedQuotations: number; pendingQuotations: number;
  totalQuotedAmount: number; totalDiscountAmount: number;
  totalFinalAmount: number; totalPaymentsCleared: number;
  totalAdvanceReceived: number; totalPendingPayments: number;
}

export interface MonthlyReport {
  month: number; year: number; monthName: string;
  totalQuotations: number; approved: number; rejected: number; pending: number;
  totalQuotedAmount: number; totalDiscount: number; totalFinalAmount: number;
  totalAdvance: number; totalBalance: number;
  totalCleared: number; totalPending: number;
  paymentsClearedCount: number; paymentsPendingCount: number;
}

export interface MonthlyReportResponse {
  months: MonthlyReport[];
  years: number[];
}
