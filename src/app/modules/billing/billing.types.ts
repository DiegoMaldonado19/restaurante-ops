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

/** Solo se consume currency_per_point: es lo que convierte puntos en descuento. */
export interface RestaurantSettingView {
  setting_id: number;
  tax_percent: number;
  tip_suggested_percent: number;
  points_per_currency_unit: number;
  currency_per_point: number;
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
  /** Propina realmente cobrada. Entra en el total y va al turno como CASH_TIP/CARD_TIP. */
  tip_amount: number | null;
}

/** Una linea del comprobante. Solo viene en GET /invoices/{id}. */
export interface InvoiceLineView {
  dish_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  note: string | null;
}

export interface InvoiceView {
  invoice_id: number;
  invoice_number: number;
  table_account_id: number;
  account_split_id: number | null;
  restaurant_table_id: number;
  /** Solo resuelto en GET /invoices/{id}; el historial lo omite. */
  restaurant_table_number: number | null;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  tip_amount: number;
  total: number;
  redeemed_points: number;
  accrued_points: number;
  status: InvoiceStatus;
  void_reason: string | null;
  issued_at: string;
  /** Vacio en el historial: el detalle solo lo resuelve GET /invoices/{id}. */
  items: InvoiceLineView[];
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
