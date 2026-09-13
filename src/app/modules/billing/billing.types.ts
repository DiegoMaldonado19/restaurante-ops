export type AccountStatus = 'OPEN' | 'BILL_REQUESTED' | 'CLOSED' | 'MERGED' | 'CANCELLED';
export type PaymentMethod = 'CASH' | 'CARD';
export type InvoiceStatus = 'ISSUED' | 'VOIDED';

export interface TableAccountView {
  table_account_id: number;
  restaurant_table_id: number;
  guest_count: number;
  status: AccountStatus;
  opened_at: string;
  closed_at: string | null;
  running_total: number;
  waiter_id: number;
  waiter_name: string;
}

export interface BillPreviewView {
  account_id: number;
  subtotal: number;
  tax_percent: number;
  tax_amount: number;
  suggested_tip_percent: number;
  suggested_tip_amount: number;
  total: number;
}

export interface PaymentRequest {
  method: PaymentMethod;
  amount: number;
}

export interface IssueInvoiceRequest {
  account_split_id: number | null;
  payments: PaymentRequest[];
  customer_id: number | null;
  redeem_points: number | null;
}

export interface InvoiceView {
  invoice_id: number;
  invoice_number: number;
  table_account_id: number;
  account_split_id: number | null;
  subtotal: number;
  tax_amount: number;
  tip_amount: number;
  total: number;
  redeemed_points: number;
  accrued_points: number;
  status: InvoiceStatus;
  issued_at: string;
}

export interface RateServiceRequest {
  score: number;
  comment_text: string | null;
}

export interface ServiceRatingView {
  service_rating_id: number;
  invoice_id: number;
  waiter_id: number;
  score: number;
  comment_text: string | null;
  created_at: string;
}
