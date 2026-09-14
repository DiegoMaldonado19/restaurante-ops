import { HttpClient, httpResource } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiConfig } from '../../api-config';
import {
  KitchenItemView,
  MenuView,
  OrderItemStatus,
  PageResponse,
  UpdateOrderItemStatusRequest,
} from './kitchen.types';

@Injectable({ providedIn: 'root' })
export class KitchenService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiConfig);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /**
   * GET /orders acepta un solo `status` (enum, no lista). Dos recursos en
   * paralelo: por atender y en preparacion. El backend ordena por
   * submitted_at ASC -- la mas antigua primero.
   */
  private readonly receivedPage = httpResource<PageResponse<KitchenItemView>>(
    () =>
      this.isBrowser
        ? `${this.api.apiBaseUrl}/api/v1/orders?status=RECEIVED&size=100`
        : undefined,
    { defaultValue: { content: [] } },
  );

  private readonly preparingPage = httpResource<PageResponse<KitchenItemView>>(
    () =>
      this.isBrowser
        ? `${this.api.apiBaseUrl}/api/v1/orders?status=IN_PREPARATION&size=100`
        : undefined,
    { defaultValue: { content: [] } },
  );

  /** Solo lectura: nombres y prep_minutes (PENDINGS #7 y #13). */
  readonly menu = httpResource<MenuView>(
    () => (this.isBrowser ? `${this.api.apiBaseUrl}/api/v1/menu` : undefined),
    { defaultValue: { dishes: [] } },
  );

  readonly received = {
    isLoading: this.receivedPage.isLoading,
    value: () => this.receivedPage.value().content,
    error: this.receivedPage.error,
    reload: () => this.receivedPage.reload(),
  };

  readonly preparing = {
    isLoading: this.preparingPage.isLoading,
    value: () => this.preparingPage.value().content,
    error: this.preparingPage.error,
    reload: () => this.preparingPage.reload(),
  };

  reloadQueue(): void {
    this.received.reload();
    this.preparing.reload();
  }

  async advance(itemId: number, next: OrderItemStatus): Promise<void> {
    const request: UpdateOrderItemStatusRequest = { status: next };
    await firstValueFrom(
      this.http.patch<void>(`${this.api.apiBaseUrl}/api/v1/order-items/${itemId}/status`, request),
    );
    this.reloadQueue();
  }

  async markUnavailable(itemId: number): Promise<void> {
    await firstValueFrom(
      this.http.post<void>(`${this.api.apiBaseUrl}/api/v1/order-items/${itemId}/unavailabilities`, {}),
    );
    this.reloadQueue();
  }
}
