import { Component, inject, signal } from '@angular/core';
import { form, FormField, required, min, max, submit } from '@angular/forms/signals';
import { BillingService } from '../billing.service';
import { formatCurrency } from '../../../core/format';
import { InvoiceView, PaymentMethod } from '../billing.types';

@Component({
  selector: 'app-billing',
  imports: [FormField],
  template: `
    <section class="rounded-xl bg-white p-8 shadow max-w-2xl">
      <h1 class="text-2xl font-semibold text-slate-900">Cobro</h1>

      @if (issuedInvoice()) {
        <!-- Factura emitida: confirmacion y calificacion opcional -->
        <div class="mt-6 rounded bg-green-50 p-4 border border-green-200">
          <p class="text-green-800 font-medium">
            Factura #{{ issuedInvoice()!.invoice_number }} emitida por
            {{ formatCurrency(issuedInvoice()!.total) }}
          </p>
        </div>

        @if (!ratingSubmitted()) {
          <h2 class="mt-6 text-lg font-medium text-slate-900">Calificar el servicio</h2>
          <form class="mt-4 space-y-4" (submit)="onRate($event)">
            <label class="block">
              <span class="text-slate-700">Puntuacion (1 a 5)</span>
              <input
                type="number"
                class="mt-1 w-24 rounded border border-slate-300 px-3 py-2"
                [formField]="ratingForm.score"
              />
            </label>
            <label class="block">
              <span class="text-slate-700">Comentario (opcional)</span>
              <textarea
                class="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                [formField]="ratingForm.comment_text"
              ></textarea>
            </label>

            @if (ratingError()) {
              <p class="text-red-600 text-sm">{{ ratingError() }}</p>
            }

            <div class="flex gap-2">
              <button
                type="submit"
                class="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
                [disabled]="ratingForm().invalid()"
              >
                Enviar calificacion
              </button>
              <button
                type="button"
                class="rounded border border-slate-300 px-4 py-2 text-slate-700"
                (click)="skipRating()"
              >
                Omitir
              </button>
            </div>
          </form>
        } @else {
          <p class="mt-4 text-slate-600">Calificacion registrada. Gracias.</p>
          <button
            type="button"
            class="mt-4 rounded bg-slate-900 px-4 py-2 text-white"
            (click)="reset()"
          >
            Cobrar otra cuenta
          </button>
        }
      } @else if (selectedAccountId() && preview()) {
        <!-- Precuenta y formulario de facturacion -->
        <button type="button" class="mt-4 text-sm text-slate-500 underline" (click)="cancelSelection()">
          ← Volver a la lista
        </button>

        <div class="mt-4 rounded bg-slate-50 p-4">
          <p class="flex justify-between"><span>Subtotal</span> <span>{{ formatCurrency(preview()!.subtotal) }}</span></p>
          <p class="flex justify-between"><span>Impuesto ({{ preview()!.tax_percent }}%)</span> <span>{{ formatCurrency(preview()!.tax_amount) }}</span></p>
          <p class="flex justify-between text-sm text-slate-500">
            <span>Propina sugerida ({{ preview()!.suggested_tip_percent }}%)</span>
            <span>{{ formatCurrency(preview()!.suggested_tip_amount) }}</span>
          </p>
          <p class="mt-2 flex justify-between font-semibold text-lg border-t pt-2">
            <span>Total</span> <span>{{ formatCurrency(preview()!.total) }}</span>
          </p>
        </div>

        <h2 class="mt-6 text-lg font-medium text-slate-900">Pago</h2>
        <form class="mt-4 space-y-4" (submit)="onIssue($event)">
          <div class="flex gap-3 items-end">
            <label class="block">
              <span class="text-slate-700">Metodo</span>
              <select
                class="mt-1 rounded border border-slate-300 px-3 py-2"
                [formField]="payForm.payment_method_1"
              >
                <option value="CASH">Efectivo</option>
                <option value="CARD">Tarjeta</option>
              </select>
            </label>
            <label class="block flex-1">
              <span class="text-slate-700">Monto</span>
              <input
                type="number"
                step="0.01"
                class="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                [formField]="payForm.amount_1"
              />
            </label>
          </div>

          <label class="flex items-center gap-2">
            <input type="checkbox" [formField]="payForm.split_payment" />
            <span class="text-slate-700">Dividir el pago entre dos metodos</span>
          </label>

          @if (payForm.split_payment().value()) {
            <div class="flex gap-3 items-end">
              <label class="block">
                <span class="text-slate-700">Segundo metodo</span>
                <select
                  class="mt-1 rounded border border-slate-300 px-3 py-2"
                  [formField]="payForm.payment_method_2"
                >
                  <option value="CASH">Efectivo</option>
                  <option value="CARD">Tarjeta</option>
                </select>
              </label>
              <label class="block flex-1">
                <span class="text-slate-700">Monto</span>
                <input
                  type="number"
                  step="0.01"
                  class="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                  [formField]="payForm.amount_2"
                />
              </label>
            </div>
          }

          @if (issueError()) {
            <p class="text-red-600 text-sm">{{ issueError() }}</p>
          }

          <button
            type="submit"
            class="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
            [disabled]="payForm().invalid()"
          >
            Facturar
          </button>
        </form>
      } @else {
        <!-- Lista de cuentas listas para cobro -->
        @if (billing.readyAccounts.isLoading()) {
          <p class="mt-4 text-slate-500">Cargando cuentas...</p>
        } @else {
          <ul class="mt-4 divide-y divide-slate-200">
            @for (account of billing.readyAccounts.value(); track account.table_account_id) {
              <li class="flex items-center justify-between py-3">
                <div>
                  <p class="text-slate-900">Mesa {{ account.restaurant_table_id }} · {{ account.waiter_name }}</p>
                  <p class="text-sm text-slate-500">{{ account.guest_count }} comensales</p>
                </div>
                <button
                  type="button"
                  class="rounded bg-slate-900 px-4 py-2 text-white text-sm"
                  (click)="selectAccount(account.table_account_id)"
                >
                  Cobrar
                </button>
              </li>
            } @empty {
              <p class="py-4 text-slate-500">No hay cuentas listas para cobro.</p>
            }
          </ul>
        }
      }
    </section>
  `,
})
export class BillingPage {
  protected readonly billing = inject(BillingService);
  protected readonly formatCurrency = formatCurrency;

  protected readonly selectedAccountId = signal<number | null>(null);
  protected readonly preview = signal<Awaited<ReturnType<BillingService['billPreview']>> | null>(null);
  protected readonly issuedInvoice = signal<InvoiceView | null>(null);
  protected readonly ratingSubmitted = signal(false);

  protected readonly issueError = signal<string | null>(null);
  protected readonly ratingError = signal<string | null>(null);

  protected readonly payModel = signal({
    payment_method_1: 'CASH' as PaymentMethod,
    amount_1: 0,
    split_payment: false,
    payment_method_2: 'CARD' as PaymentMethod,
    amount_2: 0,
  });
  protected readonly payForm = form(this.payModel, (path) => {
    required(path.amount_1, { message: 'El monto es obligatorio' });
    min(path.amount_1, 0.01, { message: 'El monto debe ser mayor que cero' });
  });

  protected readonly ratingModel = signal({ score: 5, comment_text: '' });
  protected readonly ratingForm = form(this.ratingModel, (path) => {
    required(path.score, { message: 'La puntuacion es obligatoria' });
    min(path.score, 1, { message: 'Minimo 1' });
    max(path.score, 5, { message: 'Maximo 5' });
  });

  protected async selectAccount(accountId: number) {
    this.selectedAccountId.set(accountId);
    this.preview.set(await this.billing.billPreview(accountId));
    this.payModel.set({
      payment_method_1: 'CASH',
      amount_1: this.preview()!.total,
      split_payment: false,
      payment_method_2: 'CARD',
      amount_2: 0,
    });
  }

  protected cancelSelection() {
    this.selectedAccountId.set(null);
    this.preview.set(null);
  }

  protected onIssue(event: Event) {
    event.preventDefault();
    this.issueError.set(null);

    submit(this.payForm, {
      action: async () => {
        const accountId = this.selectedAccountId();
        if (!accountId) return;

        const model = this.payModel();
        const payments = [{ method: model.payment_method_1, amount: model.amount_1 }];
        if (model.split_payment) {
          payments.push({ method: model.payment_method_2, amount: model.amount_2 });
        }

        try {
          const invoice = await this.billing.issueInvoice(accountId, {
            account_split_id: null,
            payments,
            customer_id: null,
            redeem_points: null,
          });
          this.issuedInvoice.set(invoice);
        } catch (error: any) {
          this.issueError.set(error?.error?.message ?? 'No se pudo emitir la factura.');
        }
      },
    });
  }

  protected onRate(event: Event) {
    event.preventDefault();
    this.ratingError.set(null);

    const invoiceId = this.issuedInvoice()?.invoice_id;
    if (!invoiceId) return;

    submit(this.ratingForm, {
      action: async () => {
        try {
          await this.billing.rateService(invoiceId, this.ratingModel());
          this.ratingSubmitted.set(true);
        } catch (error: any) {
          this.ratingError.set(error?.error?.message ?? 'No se pudo registrar la calificacion.');
        }
      },
    });
  }

  protected skipRating() {
    this.reset();
  }

  protected reset() {
    this.selectedAccountId.set(null);
    this.preview.set(null);
    this.issuedInvoice.set(null);
    this.ratingSubmitted.set(false);
  }
}
