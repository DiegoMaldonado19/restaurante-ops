import { Component, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BillingService } from '../billing.service';
import { InvoiceView } from '../billing.types';
import { messageFor } from '../../../core/error-messages';
import { formatCurrency, formatDateTime } from '../../../core/format';

/**
 * El documento imprimible que el enunciado exige desde la aplicacion de operacion.
 * La impresion es la del navegador: print.css esconde todo lo que lleva .no-print y
 * deja solo .print-sheet, asi que no hay libreria de PDF ni una segunda plantilla
 * que mantener.
 */
@Component({
  selector: 'app-receipt',
  imports: [RouterLink],
  template: `
    <div class="min-h-full bg-[#FAF9F6] -m-6 p-6">
      <div class="no-print mb-6 flex items-center justify-between">
        <a routerLink="/facturas" class="text-sm text-[#2F6F5E] hover:underline">&larr; Historial</a>

        <button
          type="button"
          class="rounded-lg bg-[#2F6F5E] px-4 py-2 text-white text-sm font-medium hover:bg-[#26594B] transition-colors disabled:opacity-40"
          [disabled]="!invoice()"
          (click)="print()"
        >
          Imprimir
        </button>
      </div>

      @if (loading()) {
        <p class="text-[#1F2422]/60">Cargando comprobante...</p>
      } @else if (failure()) {
        <p class="text-sm text-[#B5482A]">{{ failure() }}</p>
      } @else if (invoice(); as inv) {
        <article class="print-sheet mx-auto max-w-md rounded-2xl bg-white border border-[#1F2422]/10 p-8">
          <header class="text-center">
            <h1 class="text-lg font-semibold text-[#1F2422]">Comprobante de consumo</h1>
            <p class="mt-1 text-2xl font-semibold text-[#1F2422]">No. {{ inv.invoice_number }}</p>
            @if (inv.status === 'VOIDED') {
              <p class="mt-2 font-semibold text-[#B5482A]">ANULADA</p>
              @if (inv.void_reason) {
                <p class="text-sm text-[#1F2422]/60">{{ inv.void_reason }}</p>
              }
            }
          </header>

          <dl class="mt-6 space-y-1 text-sm text-[#1F2422]/70">
            <div class="flex justify-between">
              <dt>Fecha</dt>
              <dd>{{ asDateTime(inv.issued_at) }}</dd>
            </div>
            <div class="flex justify-between">
              <dt>Mesa</dt>
              <dd>{{ inv.restaurant_table_number ?? inv.restaurant_table_id }}</dd>
            </div>
            <div class="flex justify-between">
              <dt>Cuenta</dt>
              <dd>{{ inv.table_account_id }}</dd>
            </div>
          </dl>

          <table class="mt-6 w-full text-sm">
            <thead>
              <tr class="border-b border-[#1F2422]/15 text-left text-xs uppercase tracking-wider text-[#1F2422]/50">
                <th class="pb-2 font-semibold">Cant.</th>
                <th class="pb-2 font-semibold">Platillo</th>
                <th class="pb-2 text-right font-semibold">Importe</th>
              </tr>
            </thead>
            <tbody>
              @for (line of inv.items; track $index) {
                <tr class="border-b border-[#1F2422]/5">
                  <td class="py-2 align-top text-[#1F2422]/70">{{ line.quantity }}</td>
                  <td class="py-2">
                    <span class="text-[#1F2422]">{{ line.dish_name }}</span>
                    <span class="block text-xs text-[#1F2422]/50">{{ asCurrency(line.unit_price) }} c/u</span>
                    @if (line.note) {
                      <span class="block text-xs text-[#1F2422]/50">{{ line.note }}</span>
                    }
                  </td>
                  <td class="py-2 text-right align-top text-[#1F2422]">{{ asCurrency(line.line_total) }}</td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="3" class="py-3 text-[#1F2422]/60">Sin detalle de consumo.</td>
                </tr>
              }
            </tbody>
          </table>

          <dl class="mt-6 space-y-2 border-t border-[#1F2422]/15 pt-4 text-sm">
            <div class="flex justify-between">
              <dt class="text-[#1F2422]/70">Subtotal</dt>
              <dd class="text-[#1F2422]">{{ asCurrency(inv.subtotal) }}</dd>
            </div>

            @if (inv.discount_amount > 0) {
              <div class="flex justify-between">
                <dt class="text-[#1F2422]/70">Descuento por {{ inv.redeemed_points }} puntos</dt>
                <dd class="text-[#3B7A57]">- {{ asCurrency(inv.discount_amount) }}</dd>
              </div>
            }

            <div class="flex justify-between">
              <dt class="text-[#1F2422]/70">Impuesto</dt>
              <dd class="text-[#1F2422]">{{ asCurrency(inv.tax_amount) }}</dd>
            </div>

            @if (inv.tip_amount > 0) {
              <div class="flex justify-between">
                <dt class="text-[#1F2422]/70">Propina</dt>
                <dd class="text-[#1F2422]">{{ asCurrency(inv.tip_amount) }}</dd>
              </div>
            }

            <div class="flex justify-between border-t border-[#1F2422]/15 pt-2 text-base font-semibold">
              <dt class="text-[#1F2422]">Total</dt>
              <dd class="text-[#1F2422]">{{ asCurrency(inv.total) }}</dd>
            </div>
          </dl>

          @if (inv.accrued_points > 0) {
            <p class="mt-4 text-center text-xs text-[#1F2422]/60">
              Acumuló {{ inv.accrued_points }} puntos con esta compra.
            </p>
          }

          <p class="mt-6 text-center text-xs text-[#1F2422]/50">Gracias por su visita.</p>
        </article>
      }
    </div>
  `,
})
export class ReceiptPage {
  /** Llega de la ruta /facturas/:id por withComponentInputBinding. */
  readonly id = input.required<string>();

  private readonly billing = inject(BillingService);

  protected readonly asCurrency = formatCurrency;
  protected readonly asDateTime = formatDateTime;

  protected readonly invoice = signal<InvoiceView | null>(null);
  protected readonly loading = signal(true);
  protected readonly failure = signal<string | null>(null);

  constructor() {
    void this.load();
  }

  protected print(): void {
    window.print();
  }

  private async load(): Promise<void> {
    try {
      this.invoice.set(await this.billing.findInvoice(Number(this.id())));
    } catch (error) {
      // INVOICE_NOT_FOUND llega como 404.
      this.failure.set(messageFor(error));
    } finally {
      this.loading.set(false);
    }
  }
}
