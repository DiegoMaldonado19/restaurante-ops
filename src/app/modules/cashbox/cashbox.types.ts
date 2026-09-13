export type CashShiftStatus = 'OPEN' | 'CLOSED';

export type MovementType =
  | 'OPENING_BALANCE'
  | 'CASH_SALE'
  | 'CASH_TIP'
  | 'CARD_SALE'
  | 'CARD_TIP'
  | 'LOYALTY_REDEMPTION';


export interface CashShiftView {
  cash_shift_id: number;
  cashier_id: number;
  opening_balance: number;
  expected_cash: number | null;
  counted_cash: number | null;
  difference: number | null;
  status: CashShiftStatus;
  opened_at: string;
  closed_at: string | null;
}


export interface CashMovementView {
  cash_movement_id: number;
  cash_shift_id: number;
  movement_type: MovementType;
  amount: number;
  invoice_id: number | null;
  created_at: string;
}


export interface OpenCashShiftRequest {
  opening_balance: number;
}


export interface CloseCashShiftRequest {
  counted_cash: number;
}
