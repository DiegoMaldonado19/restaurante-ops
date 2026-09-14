/**
 * Copia del esquema de /v3/api-docs, en snake_case. kitchen ve el mismo
 * OrderItemView que orders, recortado a lo que la cola necesita.
 */

export type OrderItemStatus =
  | 'RECEIVED'
  | 'IN_PREPARATION'
  | 'READY'
  | 'DELIVERED'
  | 'UNAVAILABLE'
  | 'CANCELLED';

export interface KitchenModifierView {
  dish_modifier_id: number;
  name: string;
}

export interface KitchenItemView {
  order_item_id: number;
  dish_id: number;
  dish_name: string;
  modifiers: KitchenModifierView[];
  quantity: number;
  note: string | null;
  status: OrderItemStatus;
  submitted_at: string;
  overdue: boolean;
}

export interface UpdateOrderItemStatusRequest {
  status: OrderItemStatus;
}

export interface MenuDishBrief {
  dish_id: number;
  name: string;
  prep_minutes: number;
}

export interface MenuView {
  dishes: MenuDishBrief[];
}

export interface PageResponse<T> {
  content: T[];
}
