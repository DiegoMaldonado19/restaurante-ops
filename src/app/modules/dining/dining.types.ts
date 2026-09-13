export type ReservationStatus = 'BOOKED' | 'SEATED' | 'CANCELLED' | 'NO_SHOW';
export type WaitlistStatus = 'WAITING' | 'SEATED' | 'LEFT';
export type CancellationReason = 'CUSTOMER_CANCELLED' | 'NO_SHOW' | 'OTHER';
export type TableStatus = 'FREE' | 'RESERVED' | 'OCCUPIED' | 'BILL_REQUESTED';
export type TableZone = 'SALON' | 'TERRAZA' | 'BARRA';

export interface ReservationView {
  reservation_id: number;
  customer_id: number;
  customer_name: string;
  customer_phone: string;
  restaurant_table_id: number;
  table_account_id: number | null;
  reserved_at: string;
  guest_count: number;
  status: ReservationStatus;
  cancellation_reason: CancellationReason | null;
  note: string | null;
  created_at: string;
}

export interface CreateReservationRequest {
  customer_name: string;
  customer_phone: string;
  table_id: number;
  reserved_at: string;
  guest_count: number;
  note: string | null;
}

export interface CancelReservationRequest {
  reason: CancellationReason;
  note: string | null;
}

export interface WaitlistEntryView {
  waitlist_entry_id: number;
  customer_id: number;
  customer_name: string;
  customer_phone: string;
  guest_count: number;
  status: WaitlistStatus;
  restaurant_table_id: number | null;
  table_account_id: number | null;
  arrived_at: string;
  seated_at: string | null;
}

export interface CreateWaitlistEntryRequest {
  customer_name: string;
  customer_phone: string;
  guest_count: number;
}

export interface SeatWaitlistRequest {
  table_id: number;
}

export interface SeatingResultView {
  table_account_id: number;
}

export interface FloorPlanRow {
  restaurant_table_id: number;
  table_number: number;
  capacity: number;
  zone: TableZone;
  status: TableStatus;
  open_account: {
    table_account_id: number;
    waiter_name: string;
    opened_at: string;
    running_total: number;
  } | null;
  next_reservation: {
    reservation_id: number;
    customer_name: string;
    reserved_at: string;
    guest_count: number;
  } | null;
}
