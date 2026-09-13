import { HttpClient, httpResource } from '@angular/common/http';
import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { ApiConfig } from '../../api-config';
import { AuthService } from '../../core/auth.service';
import {
  CreateCustomerDTO,
  CustomerDetailView,
  CustomerView,
  LoyaltyTransactionView,
  PageResponse,
} from './customers.types';

@Injectable({ providedIn: 'root' })
export class CustomersService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiConfig);
  private readonly auth = inject(AuthService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly search = signal('');
  readonly selectedId = signal<number | null>(null);

  /**
   * Sin texto no se pide nada: el mostrador busca un cliente concreto, no navega el
   * catalogo. `search` cubre nombre y telefono, y tolera el telefono a medio teclear.
   */
  readonly results = httpResource<PageResponse<CustomerView>>(
    () => {
      const term = this.search().trim();
      if (!this.isBrowser || !term) return undefined;

      return `${this.base()}?search=${encodeURIComponent(term)}`;
    },
    { defaultValue: { content: [] } },
  );

  readonly selected = httpResource<CustomerDetailView | undefined>(
    () => {
      const id = this.selectedId();
      return this.isBrowser && id ? `${this.base()}/${id}` : undefined;
    },
    { defaultValue: undefined },
  );

  /** El historial es ADMIN y CASHIER: al mesero el backend le responderia 403. */
  readonly loyalty = httpResource<PageResponse<LoyaltyTransactionView>>(
    () => {
      const id = this.selectedId();
      if (!this.isBrowser || !id || !this.auth.hasRole('CASHIER')) return undefined;

      return `${this.base()}/${id}/loyalty-transactions`;
    },
    { defaultValue: { content: [] } },
  );

  readonly canSeeLoyalty = computed(() => this.auth.hasRole('CASHIER'));

  async create(request: CreateCustomerDTO): Promise<CustomerView> {
    const customer = await firstValueFrom(this.http.post<CustomerView>(this.base(), request));

    this.search.set(customer.phone);
    this.selectedId.set(customer.customer_id);

    return customer;
  }

  clearSelection(): void {
    this.selectedId.set(null);
  }

  private base(): string {
    return `${this.api.apiBaseUrl}/api/v1/customers`;
  }
}
