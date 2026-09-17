/**
 * Copia literal del esquema de /v3/api-docs, en snake_case. El backend de este modulo
 * es `ordering` (comandas) + `menu` (solo lectura). OrderItemStatus se copia aqui y
 * en tables.types.ts a proposito: cada modulo de frontend copia del esquema.
 */

export type OrderItemStatus =
  | 'RECEIVED'
  | 'IN_PREPARATION'
  | 'READY'
  | 'DELIVERED'
  | 'UNAVAILABLE'
  | 'CANCELLED';

/** MenuView usa ModifierView; OrderItemView usa DishModifierView. Los campos que
 *  esta app necesita coinciden: id, nombre y recargo. */
export interface ModifierBrief {
  dish_modifier_id: number;
  name: string;
  extra_price: number;
}

export interface OrderItemView {
  order_item_id: number;
  dish_id: number;
  dish_name: string;
  modifiers: ModifierBrief[];
  combo_id: number | null;
  quantity: number;
  unit_price: number;
  note: string | null;
  status: OrderItemStatus;
  submitted_at: string;
  ready_at: string | null;
  delivered_at: string | null;
  overdue: boolean;
}

export interface OrderTicketView {
  order_ticket_id: number;
  account_id: number;
  waiter_id: number;
  submitted_at: string;
  items: OrderItemView[];
  derived_status: OrderItemStatus;
}

/** SubmitOrderDTO.items[]: exactamente uno de dish_id o combo_id; note opcional (máx. 255). */
export interface OrderLineDTO {
  dish_id?: number;
  combo_id?: number;
  quantity: number;
  modifier_ids?: number[];
  note?: string;
}

export interface SubmitOrderRequest {
  items: OrderLineDTO[];
}

export interface UpdateOrderItemRequest {
  quantity: number;
  modifier_ids?: number[];
  note?: string;
}

export interface UpdateOrderItemStatusRequest {
  status: OrderItemStatus;
}

export interface MenuDishView {
  dish_id: number;
  name: string;
  category_name: string;
  sale_price: number;
  prep_minutes: number;
  image_url: string | null;
  modifiers: ModifierBrief[];
}

export interface MenuComboView {
  combo_id: number;
  name: string;
  description: string | null;
  combo_price: number;
  items: { dish_id: number; dish_name: string; sale_price: number; quantity: number }[];
}

export interface MenuView {
  dishes: MenuDishView[];
  combos: MenuComboView[];
}

/** Spring Data: { content: T[], page: {...} }. */
export interface PageResponse<T> {
  content: T[];
}

export const ORDER_ITEM_STATUS_LABEL: Record<OrderItemStatus, string> = {
  RECEIVED: 'Recibido',
  IN_PREPARATION: 'En preparación',
  READY: 'Listo',
  DELIVERED: 'Entregado',
  UNAVAILABLE: 'No disponible',
  CANCELLED: 'Cancelado',
};
