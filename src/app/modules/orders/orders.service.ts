import { HttpClient, httpResource } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiConfig } from '../../api-config';
import { AuthService } from '../../core/auth.service';
import {
  MenuView,
  OrderItemView,
  OrderTicketView,
  PageResponse,
  SubmitOrderRequest,
  UpdateOrderItemRequest,
  UpdateOrderItemStatusRequest,
} from './orders.types';

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiConfig);
  private readonly auth = inject(AuthService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** El menu operativo: una sola llamada para armar el selector de la comanda. */
  readonly menu = httpResource<MenuView>(
    () => (this.isBrowser ? `${this.api.apiBaseUrl}/api/v1/menu` : undefined),
    { defaultValue: { dishes: [], combos: [] } },
  );

  readonly overdueOnly = signal(false);

  /**
   * "Mis platillos": GET /orders?waiterId=… (camelCase, Gap 2 §3.6). No pedir nada
   * hasta que AuthService.userId() exista: en SSR / sin sesion la URL seria invalida.
   * CONFIRMADO el 2026-09-13: el filtro waiterId si recorta; overdue=true NO
   * (devuelve el mismo total_elements). La pagina /comandas recorta en cliente
   * con prep_minutes + 5 min. Ver PENDINGS-ON-BACKEND.md #12 y #13.
   */
  private readonly myQueuePage = httpResource<PageResponse<OrderItemView>>(
    () => {
      if (!this.isBrowser) return undefined;
      const waiterId = this.auth.userId();
      if (waiterId == null) return undefined;
      const overdueParam = this.overdueOnly() ? '&overdue=true' : '';
      return `${this.api.apiBaseUrl}/api/v1/orders?waiterId=${waiterId}${overdueParam}&size=100`;
    },
    { defaultValue: { content: [] } },
  );

  readonly myQueue = {
    isLoading: this.myQueuePage.isLoading,
    value: () => this.myQueuePage.value().content,
    error: this.myQueuePage.error,
    reload: () => this.myQueuePage.reload(),
  };

  async submit(accountId: number, request: SubmitOrderRequest): Promise<OrderTicketView> {
    const ticket = await firstValueFrom(
      this.http.post<OrderTicketView>(
        `${this.api.apiBaseUrl}/api/v1/accounts/${accountId}/orders`,
        request,
      ),
    );
    this.myQueue.reload();
    return ticket;
  }

  /** El 201 de submit a veces llega con items: [] (PENDINGS #9). Este GET hidrata la ronda. */
  async findTicket(ticketId: number): Promise<OrderTicketView> {
    return firstValueFrom(
      this.http.get<OrderTicketView>(`${this.api.apiBaseUrl}/api/v1/orders/${ticketId}`),
    );
  }

  async updateItem(itemId: number, request: UpdateOrderItemRequest): Promise<OrderItemView> {
    const item = await firstValueFrom(
      this.http.put<OrderItemView>(`${this.api.apiBaseUrl}/api/v1/order-items/${itemId}`, request),
    );
    this.myQueue.reload();
    return item;
  }

  async deleteItem(itemId: number): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${this.api.apiBaseUrl}/api/v1/order-items/${itemId}`));
    this.myQueue.reload();
  }

  /** El mesero solo usa esto para READY -> DELIVERED; el resto de saltos son de cocina. */
  async markDelivered(itemId: number): Promise<OrderItemView> {
    const request: UpdateOrderItemStatusRequest = { status: 'DELIVERED' };
    const item = await firstValueFrom(
      this.http.patch<OrderItemView>(
        `${this.api.apiBaseUrl}/api/v1/order-items/${itemId}/status`,
        request,
      ),
    );
    this.myQueue.reload();
    return item;
  }
}
