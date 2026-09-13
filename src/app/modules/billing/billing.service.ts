import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ApiConfig } from '../../api-config';
import {
  TableAccountView,
  BillPreviewView,
  IssueInvoiceRequest,
  InvoiceView,
  RateServiceRequest,
  RestaurantSettingView,
  ServiceRatingView,
} from './billing.types';

/** Spring Data envuelve las listas paginadas asi: { content: T[], page: {...} }. */
interface PageResponse<T> {
  content: T[];
}

@Injectable({ providedIn: 'root' })
export class BillingService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiConfig);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /**
   * Cuentas listas para cobro. Mismo patron de guardia SSR que cashbox.
   * El endpoint regresa una Page de Spring, por eso se extrae .content.
   */
  private readonly readyAccountsPage = httpResource<PageResponse<TableAccountView>>(
    () =>
      this.isBrowser
        ? `${this.api.apiBaseUrl}/api/v1/accounts?status=BILL_REQUESTED`
        : undefined,
    { defaultValue: { content: [] } },
  );

  readonly readyAccounts = {
    isLoading: this.readyAccountsPage.isLoading,
    value: computed(() => this.readyAccountsPage.value().content),
    reload: () => this.readyAccountsPage.reload(),
  };

  /**
   * El valor del punto, para calcular el descuento por redencion igual que lo hace
   * BillingService. Sin esto los pagos no cuadrarian con el total y el backend
   * rechazaria la factura: currency_per_point vive en restaurant_setting, no aqui.
   */
  readonly settings = httpResource<RestaurantSettingView | undefined>(
    () => (this.isBrowser ? `${this.api.apiBaseUrl}/api/v1/settings` : undefined),
    { defaultValue: undefined },
  );

  async billPreview(accountId: number): Promise<BillPreviewView> {
    return firstValueFrom(
      this.http.get<BillPreviewView>(`${this.api.apiBaseUrl}/api/v1/accounts/${accountId}/bill-preview`),
    );
  }

  async issueInvoice(accountId: number, request: IssueInvoiceRequest): Promise<InvoiceView> {
    const invoice = await firstValueFrom(
      this.http.post<InvoiceView>(
        `${this.api.apiBaseUrl}/api/v1/accounts/${accountId}/invoices`,
        request,
      ),
    );

    this.readyAccounts.reload();

    return invoice;
  }

  // --- Historial de facturas -------------------------------------------------
  // El rango lo fija la pantalla; vacio significa "todo", que es lo que el backend
  // entiende cuando el parametro no viaja.
  readonly historyFrom = signal('');
  readonly historyTo = signal('');

  private readonly invoicePage = httpResource<PageResponse<InvoiceView>>(
    () => {
      if (!this.isBrowser) return undefined;

      const params = new URLSearchParams({ sort: 'issuedAt,desc', size: '50' });

      // El backend espera LocalDateTime: el input date da solo el dia, y el rango
      // tiene que cubrirlo entero o las facturas de la tarde quedan fuera.
      if (this.historyFrom()) params.set('from', `${this.historyFrom()}T00:00:00`);
      if (this.historyTo()) params.set('to', `${this.historyTo()}T23:59:59`);

      return `${this.invoicesUrl()}?${params.toString()}`;
    },
    { defaultValue: { content: [] } },
  );

  readonly invoices = {
    isLoading: this.invoicePage.isLoading,
    error: this.invoicePage.error,
    value: computed(() => this.invoicePage.value().content),
  };

  /** El comprobante completo, con sus platillos. Lo pide la vista de impresion. */
  findInvoice(invoiceId: number): Promise<InvoiceView> {
    return firstValueFrom(this.http.get<InvoiceView>(`${this.invoicesUrl()}/${invoiceId}`));
  }

  async rateService(invoiceId: number, request: RateServiceRequest): Promise<ServiceRatingView> {
    return firstValueFrom(
      this.http.post<ServiceRatingView>(
        `${this.invoicesUrl()}/${invoiceId}/service-ratings`,
        request,
      ),
    );
  }

  private invoicesUrl(): string {
    return `${this.api.apiBaseUrl}/api/v1/invoices`;
  }
}
