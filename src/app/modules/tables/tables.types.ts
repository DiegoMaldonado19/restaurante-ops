/**
 * Copia literal del esquema de /v3/api-docs, en snake_case. El backend de este modulo
 * es `ordering` (cuentas) con una lectura puntual de `restaurant` (mesas). TableStatus y
 * TableZone se repiten aqui y en dining.types.ts a proposito: cada modulo de frontend
 * copia del esquema, no importa de otro modulo (ver Analisis-Solucion-Ordering-Front.md §5.4).
 */

export type TableZone = 'SALON' | 'TERRACE' | 'BAR';
export type TableStatus = 'FREE' | 'RESERVED' | 'OCCUPIED' | 'BILL_REQUESTED';
export type AccountStatus = 'OPEN' | 'BILL_REQUESTED' | 'CLOSED' | 'MERGED' | 'CANCELLED';
export type SplitMode = 'BY_PERSON' | 'BY_ITEM';
export type OrderItemStatus =
  | 'RECEIVED'
  | 'IN_PREPARATION'
  | 'READY'
  | 'DELIVERED'
  | 'UNAVAILABLE'
  | 'CANCELLED';

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

export interface OpenAccountRequest {
  table_id: number;
  guest_count: number;
}

export interface TransferAccountRequest {
  target_table_id: number;
}

export interface MergeAccountRequest {
  source_account_id: number;
}

/**
 * El esquema pide un account_split_id por linea. El analisis asumia que era un
 * numero de grupo temporal (1, 2, 3...). CONFIRMADO contra el backend real el
 * 2026-09-13 (Fase 3): NO es asi. `POST /accounts/{id}/splits` en modo BY_ITEM
 * trata este campo como un id de sub-cuenta YA persistido; enviar 1 o 2 responde
 * 404 ACCOUNT_NOT_FOUND ("No existe la sub-cuenta 1."). La UI sigue enviando el
 * grupo elegido por el mesero -- es el contrato que el backend deberia aceptar --
 * y muestra el error con messageFor(). BY_PERSON con items: [] SI funciona.
 */
export interface SplitLine {
  order_item_id: number;
  account_split_id: number;
}

export interface SplitAccountRequest {
  mode: SplitMode;
  person_count?: number;
  items: SplitLine[];
}

export interface UpdateAccountStatusRequest {
  status: AccountStatus;
}

export interface UpdateTableStatusRequest {
  status: TableStatus;
}

export interface SplitsInfo {
  count: number;
  total_amount: number;
}

/** Version reducida de OrderItemView: lo que esta pantalla necesita mostrar, no todo. */
export interface OrderItemViewLite {
  order_item_id: number;
  dish_name: string;
  quantity: number;
  unit_price: number;
  status: OrderItemStatus;
  overdue: boolean;
}

export interface OrderTicketViewLite {
  order_ticket_id: number;
  submitted_at: string;
  items: OrderItemViewLite[];
  derived_status: OrderItemStatus;
}

export interface AccountSplitView {
  account_split_id: number;
  label: string | null;
  mode: SplitMode;
  share_amount: number | null;
  created_at: string;
  items: OrderItemViewLite[];
}

export interface TableAccountView {
  table_account_id: number;
  restaurant_table_id: number;
  guest_count: number;
  status: AccountStatus;
  opened_at: string;
  closed_at: string | null;
  splits: SplitsInfo | null;
  tickets: OrderTicketViewLite[];
  running_total: number;
  waiter_id: number;
  waiter_name: string;
}

/** Paleta y etiquetas, duplicadas a proposito desde dining/dining.types.ts (misma mesa, mismo color). */
export const ZONE_LABELS: Record<TableZone, string> = {
  SALON: 'Salón',
  TERRACE: 'Terraza',
  BAR: 'Barra',
};

export const STATUS_LABEL: Record<TableStatus, string> = {
  FREE: 'Libre',
  RESERVED: 'Reservada',
  OCCUPIED: 'Ocupada',
  BILL_REQUESTED: 'Cuenta pedida',
};

export const ACCOUNT_STATUS_LABEL: Record<AccountStatus, string> = {
  OPEN: 'Abierta',
  BILL_REQUESTED: 'Cuenta pedida',
  CLOSED: 'Cerrada',
  MERGED: 'Fusionada',
  CANCELLED: 'Anulada',
};

export const ORDER_ITEM_STATUS_LABEL: Record<OrderItemStatus, string> = {
  RECEIVED: 'Recibido',
  IN_PREPARATION: 'En preparación',
  READY: 'Listo',
  DELIVERED: 'Entregado',
  UNAVAILABLE: 'No disponible',
  CANCELLED: 'Cancelado',
};

export const STATUS_BAR: Record<TableStatus, string> = {
  FREE: 'border-l-[#3B7A57]',
  RESERVED: 'border-l-[#C98A2E]',
  OCCUPIED: 'border-l-[#B5482A]',
  BILL_REQUESTED: 'border-l-[#B5482A]',
};

export const STATUS_DOT: Record<TableStatus, string> = {
  FREE: 'bg-[#3B7A57]',
  RESERVED: 'bg-[#C98A2E]',
  OCCUPIED: 'bg-[#B5482A]',
  BILL_REQUESTED: 'bg-[#B5482A]',
};

/** Solo de ayuda visual: que boton mostrar. transitionTo() del backend es el juez real. */
export const VALID_TRANSITIONS: Record<TableStatus, TableStatus[]> = {
  FREE: ['RESERVED', 'OCCUPIED'],
  RESERVED: ['FREE', 'OCCUPIED'],
  OCCUPIED: ['FREE', 'BILL_REQUESTED'],
  BILL_REQUESTED: ['FREE', 'OCCUPIED'],
};
