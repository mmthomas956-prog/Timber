/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Species = string;
export type QualityGrade = 'Grade A (Premium)' | 'Grade B (Commercial)' | 'Grade C (Defective)';
export type CalculationMethod = 'Hoppus' | 'Actual';

export interface AuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  action: string;
  entityType?: 'Log' | 'SawnTimber' | 'Frame' | 'Sale';
  entityId?: string;
  details: string;
}

export interface CustomerRegistry {
  id: string;
  companyName: string;
  contactPerson: string;
  phoneNumber: string;
  email: string;
  taxRegistration: string;
  billingAddress: string;
}

export interface SupplierRegistry {
  id: string;
  supplierName: string;
  contactPerson: string;
  phoneNumber: string;
  alternativePhone: string;
  paymentTermsDays: number;
  bankDetails: string;
}

export interface YieldStandard {
  id: string;
  species: string;
  girthBandMin: number;
  girthBandMax: number;
  expectedYieldPct: number;
}

export interface PriceListBand {
  id: string;
  species: string;
  girthBandMin: number;
  girthBandMax: number;
  standardPricePerCFT: number;
}

export interface FrameTypeConfig {
  name: string;
  minTargetQty: number;
}

export interface Log {
  id: string; // e.g., TEK-A1-0001
  date: string;
  species: Species;
  quality: QualityGrade;
  lengthFeet: number;
  girthInches: number; // For Hoppus
  hoppusBuyingRate: number; // $/CFT
  volumetricDeductionsCFT: number; // CFT
  batchExtraCosts: number; // $
  calcMethod: CalculationMethod;
  hoppusVolumeCFT: number;
  actualVolumeCFT: number; // Volume before allowances
  baseLogCost: number;
  apportionedExtraCost: number;
  totalLogLandedValue: number;
  actualLandedAverageRate: number;
  standardBaselinePriceRef?: number; // Pulled from Price List
  purchaseAllowanceCFT: number; // Deductions for bark, taper, defects
  usableVolumeCFT: number; // actualVolumeCFT - purchaseAllowanceCFT
  cost: number; // Purchase price
  status: 'In Yard' | 'Converted';
  supplier: string;
  lotCode: string; // e.g., A1, B2
  primaryApplication: string;
  images?: string[];
  conversionImages?: string[];
  isDeleted?: boolean;
}

export interface SawnTimber {
  id: string;
  parentLogId: string;
  date: string;
  species: Species;
  size: string; // e.g., "3x4"
  piecesInitial: number;
  piecesAvailable: number;
  volumeCFTPerPiece: number;
  costPerPiece: number;
  conversionStandardYieldPct?: number; 
  conversionActualYieldPct?: number;
  images?: string[];
  isDeleted?: boolean;
}

export interface Frame {
  id: string;
  date: string;
  type: string;
  species: Species;
  consumedSawnTimberId?: string; // If produced from sawn timber directly
  parentLogId?: string; // If produced during initial log conversion
  piecesUsed: number;
  totalCost: number; // Includes inherited material cost + labor
  status: 'In Stock' | 'Sold';
  images?: string[];
  isDeleted?: boolean;
}

export interface SaleRecord {
  id: string;
  date: string;
  itemType: 'Sawn Timber' | 'Frame';
  itemRefId: string;
  quantitySold: number;
  revenue: number;
  costBasis: number;
  salesAgent: string;
  isDeleted?: boolean;
}

export interface SizeIntelligence {
  sizeName: string;
  dimensionsMm: string;
  marketUseCase: string;
  durabilityClass: string;
  workingDifficulty: string;
  treatmentSpecs: string;
  minTargetQty?: number;
}

export interface AppState {
  logs: Log[];
  sawnTimber: SawnTimber[];
  frames: Frame[];
  sales: SaleRecord[];
  totalWastageCFT: number;
  auditLogs: AuditEntry[];
  sizeIntelligence: SizeIntelligence[];
  speciesList: string[];
  frameTypes: string[];
  frameTypesConfig: FrameTypeConfig[];
  customers: CustomerRegistry[];
  suppliers: SupplierRegistry[];
  yieldStandards: YieldStandard[];
  priceListBands: PriceListBand[];
}

