/** Copia literal del esquema de /v3/api-docs. El backend de este modulo es `customer`. */

export type LoyaltyTransactionType = 'ACCRUAL' | 'REDEMPTION';

export interface CustomerView {
  customer_id: number;
  full_name: string;
  phone: string;
  created_at: string;
}

export interface CustomerDetailView {
  customer_id: number;
  full_name: string;
  phone: string;
  created_at: string;
  available_points: number;
  visit_count: number;
}

export interface LoyaltyTransactionView {
  loyalty_transaction_id: number;
  transaction_type: LoyaltyTransactionType;
  points: number;
  invoice_id: number | null;
  created_at: string;
}

export interface CreateCustomerDTO {
  full_name: string;
  phone: string;
}

/** `ops` no tiene core/paged.ts; cada modulo declara lo que consume, como billing y dining. */
export interface PageResponse<T> {
  content: T[];
}

export const LOYALTY_TYPE_LABELS: Record<LoyaltyTransactionType, string> = {
  ACCRUAL: 'Acreditacion',
  REDEMPTION: 'Redencion',
};
