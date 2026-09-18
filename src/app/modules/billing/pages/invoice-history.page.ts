import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BillingService } from '../billing.service';
import { messageFor } from '../../../core/error-messages';
import { formatCurrency, formatDateTime } from '../../../core/format';

@Component({
  selector: 'app-invoice-history',
  imports: [RouterLink],
  template: `
    <div class="min-h-full bg-[#FAF9F6] -m-6 p-6">
      <header class="mb-8">
        <h1 class="text-2xl font-semibold text-[#1F2422]">Facturas</h1>
        <p class="mt-1 text-sm text-[#1F2422]/60">Historial y reimpresión de comprobantes</p>
      </header>

      <section class="rounded-2xl bg-white border border-[#1F2422]/10 p-6">
        <div class="flex flex-wrap items-end gap-4">
          <label class="block">
            <span class="text-xs font-semibold uppercase tracking-wider text-[#1F2422]/50">Desde</span>
            <input
              type="date"
              class="mt-2 block rounded-lg border border-[#1F2422]/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6F5E]/30"
              [value]="billing.historyFrom()"
              (change)="billing.historyFrom.set($any($event.target).value)"
            />
          </label>

          <label class="block">
            <span class="text-xs font-semibold uppercase tracking-wider text-[#1F2422]/50">Hasta</span>
            <input
              type="date"
              class="mt-2 block rounded-lg border border-[#1F2422]/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6F5E]/30"
              [value]="billing.historyTo()"
              (change)="billing.historyTo.set($any($event.target).value)"
            />
          </label>

          @if (billing.historyFrom() || billing.historyTo()) {
            <button
              type="button"
              class="rounded-lg border border-[#1F2422]/15 px-4 py-2 text-sm text-[#1F2422]/70 hover:bg-[#1F2422]/5 transition-colors"
              (click)="clearRange()"
            >
              Quitar filtro
            </button>
          }
        </div>

        @if (billing.invoices.isLoading()) {
          <p class="mt-6 text-[#1F2422]/60">Cargando facturas...</p>
        } @else if (billing.invoices.error()) {
          <p class="mt-6 text-sm text-[#B5482A]">{{ error() }}</p>
        } @else {
          <div class="mt-6 overflow-x-auto">
            <div class="max-h-[28rem] overflow-y-auto">
              <table class="w-full text-sm">
                <thead class="sticky top-0 bg-white">
                  <tr class="border-b border-[#1F2422]/15 text-left text-xs uppercase tracking-wider text-[#1F2422]/50">
                    <th class="pb-2 pr-4 font-semibold">No.</th>
                    <th class="pb-2 pr-4 font-semibold">Fecha</th>
                    <th class="pb-2 pr-4 font-semibold">Cuenta</th>
                    <th class="pb-2 pr-4 text-right font-semibold">Total</th>
                    <th class="pb-2 pr-4 font-semibold">Estado</th>
                    <th class="pb-2"></th>
                  </tr>
                </thead>
                <tbody>
                  @for (invoice of billing.invoices.value(); track invoice.invoice_id) {
                    <tr class="border-b border-[#1F2422]/5">
                      <td class="py-3 pr-4 text-[#1F2422]">{{ invoice.invoice_number }}</td>
                      <td class="py-3 pr-4 text-[#1F2422]/70">{{ asDateTime(invoice.issued_at) }}</td>
                      <td class="py-3 pr-4 text-[#1F2422]/70">{{ invoice.table_account_id }}</td>
                      <td class="py-3 pr-4 text-right text-[#1F2422]">{{ asCurrency(invoice.total) }}</td>
                      <td class="py-3 pr-4">
                        @if (invoice.status === 'VOIDED') {
                          <span class="text-[#B5482A]">Anulada</span>
                        } @else {
                          <span class="text-[#3B7A57]">Emitida</span>
                        }
                      </td>
                      <td class="py-3 text-right">
                        <a [routerLink]="['/facturas', invoice.invoice_id]" class="text-[#2F6F5E] hover:underline">
                          Comprobante
                        </a>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="6" class="py-6 text-[#1F2422]/60">
                        No hay facturas en ese rango.
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>

          @if (billing.invoices.value().length) {
            <div class="mt-3 flex justify-between border-t border-[#1F2422]/15 pt-3 text-sm font-semibold text-[#1F2422]">
              <span>{{ billing.invoices.value().length }} factura(s)</span>
              <span>{{ asCurrency(totalSum()) }}</span>
            </div>
          }
        }
      </section>
    </div>
  `,
})
export class InvoiceHistoryPage {
  protected readonly billing = inject(BillingService);
  protected readonly asCurrency = formatCurrency;
  protected readonly asDateTime = formatDateTime;

  protected readonly totalSum = computed(() =>
    this.billing.invoices.value().reduce((sum, invoice) => sum + invoice.total, 0),
  );

  protected error(): string {
    return messageFor(this.billing.invoices.error());
  }

  protected clearRange(): void {
    this.billing.historyFrom.set('');
    this.billing.historyTo.set('');
  }
}