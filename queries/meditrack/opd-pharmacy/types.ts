export interface PharmacyOrderItem {
  productId: string;
  drugName: string;
  genericName?: string | null;
  dosageForm?: string | null;
  strength?: string | null;
  quantityPrescribed: number;
  availableStock: number;
  stockStatus: string;
  inventoryId?: string | null;
  batchNumber?: string | null;
  lotNumber?: string | null;
  unitPrice: number;
  gstRate: number;
  gstAmount: number;
  lineTotal: number;
  isControlledSubstance: boolean;
  controlledSchedule?: string | null;
  dispenseAction: string;
  quantityToDispense: number;
  quantityShortfall: number;
  shortfallReason?: string | null;
}

export interface PharmacyDispensingItem {
  id: string;
  dispensingId: string;
  productId: string;
  inventoryId?: string | null;
  drugName: string;
  batchNumber?: string | null;
  lotNumber?: string | null;
  quantityPrescribed: number;
  quantityDispensed: number;
  quantityShortfall: number;
  dispenseAction: string;
  shortfallReason?: string | null;
  unitPrice: number;
  gstRate: number;
  gstAmount: number;
  totalAmount: number;
  isControlledSubstance: boolean;
  controlledSchedule?: string | null;
  isVoid: boolean;
  voidReason?: string | null;
  createdAt?: string | null;
}

export interface PharmacyCreditNote {
  id: string;
  dispensingId: string;
  creditNoteNumber: string;
  reversalSubtotal: number;
  reversalGst: number;
  totalRefundAmount: number;
  reason: string;
  issuedByName?: string | null;
  createdAt?: string | null;
}

export interface PharmacyDispensing {
  id: string;
  visitId?: string | null;
  patientId?: string | null;
  patientName?: string | null;
  patientUhid?: string | null;
  prescribedBy?: string | null;
  doctorName?: string | null;
  dispensedBy?: string | null;
  dispensedByName?: string | null;
  receiptNumber: string;
  subtotal: number;
  gstRate: number;
  gstAmount: number;
  discountAmount: number;
  totalAmount: number;
  amountPaid: number;
  paymentMethod: string;
  paymentStatus: string;
  dispenseStatus: string;
  notes?: string | null;
  createdAt?: string | null;
  hasControlledSubstances: boolean;
  items: PharmacyDispensingItem[];
  creditNote?: PharmacyCreditNote | null;
}

export interface PharmacyVisitOrder {
  visitId?: string | null;
  patientId?: string | null;
  patientName?: string | null;
  patientUhid?: string | null;
  doctorId?: string | null;
  doctorName?: string | null;
  prescriptionNotes?: string | null;
  hasControlledSubstances: boolean;
  isDispensed: boolean;
  existingDispensing?: PharmacyDispensing | null;
  items: PharmacyOrderItem[];
  subtotal: number;
  gstRate: number;
  estimatedGst: number;
  estimatedTotal: number;
}

export interface CreatePharmacyDispenseItem {
  productId: string;
  inventoryId?: string | null;
  drugName?: string | null;
  batchNumber?: string | null;
  lotNumber?: string | null;
  quantityPrescribed: number;
  quantityDispensed: number;
  quantityShortfall: number;
  dispenseAction: string;
  shortfallReason?: string | null;
  unitPrice: number;
  gstRate: number;
  isControlledSubstance: boolean;
  controlledSchedule?: string | null;
}

export interface CreatePharmacyDispenseRequest {
  visitId?: string | null;
  patientId?: string | null;
  prescribedBy?: string | null;
  paymentMethod: string;
  paymentStatus?: string;
  discountAmount?: number;
  notes?: string | null;
  items: CreatePharmacyDispenseItem[];
}

export interface VoidPharmacyBillRequest {
  reason: string;
  restockInventory?: boolean;
}

export interface PharmacyReturnRequest {
  itemId: string;
  quantityReturned: number;
  reason: string;
  restockInventory?: boolean;
}
