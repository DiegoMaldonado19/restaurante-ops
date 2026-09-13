import { Component, computed, inject, signal } from '@angular/core';
import { form, FormField, required, min, max, submit } from '@angular/forms/signals';
import { BillingService } from '../billing.service';
import { CustomersService } from '../../customers/customers.service';
import { formatCurrency } from '../../../core/format';
import { InvoiceView, PaymentMethod } from '../billing.types';

@Component({
  selector: 'app-billing',
  imports: [FormField],
  template: `
    <div class="min-h-full bg-[#FAF9F6] -m-6 p-6">
      <header class="mb-8">
        <h1 class="text-2xl font-semibold text-[#1F2422]">Cobro</h1>
        <p class="mt-1 text-sm text-[#1F2422]/60">Precuenta, pago y calificación del servicio</p>
      </header>

      <section class="rounded-2xl bg-white border border-[#1F2422]/10 p-6 max-w-2xl">
        @if (issuedInvoice()) {
          <!-- Factura emitida: confirmacion y calificacion opcional -->
          <div class="rounded-lg bg-[#3B7A57]/10 border border-[#3B7A57]/30 p-4">
            <p class="font-medium text-[#1F2422]">
              Factura #{{ issuedInvoice()!.invoice_number }} emitida por
              {{ formatCurrency(issuedInvoice()!.total) }}
            </p>
          </div>

          @if (!ratingSubmitted()) {
            <h2 class="mt-6 text-xs font-semibold uppercase tracking-wider text-[#1F2422]/50">
              Calificar el servicio
            </h2>
            <form class="mt-4 space-y-4" (submit)="onRate($event)">
              <label class="block">
                <span class="text-sm text-[#1F2422]/70">Puntuación (1 a 5)</span>
                <input
                  type="number"
                  class="mt-1 w-24 rounded-lg border border-[#1F2422]/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6F5E]/30"
                  [formField]="ratingForm.score"
                />
              </label>
              <label class="block">
                <span class="text-sm text-[#1F2422]/70">Comentario (opcional)</span>
                <textarea
                  class="mt-1 w-full rounded-lg border border-[#1F2422]/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6F5E]/30"
                  [formField]="ratingForm.comment_text"
                ></textarea>
              </label>

              @if (ratingError()) {
                <p class="text-sm text-[#B5482A]">{{ ratingError() }}</p>
              }

              <div class="flex gap-2">
                <button
                  type="submit"
                  class="rounded-lg bg-[#2F6F5E] px-4 py-2 text-white text-sm font-medium hover:bg-[#26594B] transition-colors disabled:opacity-40"
                  [disabled]="ratingForm().invalid()"
                >
                  Enviar calificación
                </button>
                <button
                  type="button"
                  class="rounded-lg border border-[#1F2422]/15 px-4 py-2 text-[#1F2422]/70 text-sm hover:bg-[#1F2422]/5 transition-colors"
                  (click)="skipRating()"
                >
                  Omitir
                </button>
              </div>
            </form>
          } @else {
            <p class="mt-4 text-[#1F2422]/70">Calificación registrada. Gracias.</p>
            <button
              type="button"
              class="mt-4 rounded-lg bg-[#2F6F5E] px-4 py-2 text-white text-sm font-medium hover:bg-[#26594B] transition-colors"
              (click)="reset()"
            >
              Cobrar otra cuenta
            </button>
          }
        } @else if (selectedAccountId() && preview()) {
          <!-- Precuenta y formulario de facturacion -->
          <button type="button" class="text-sm text-[#1F2422]/50 hover:text-[#1F2422]" (click)="cancelSelection()">
            ← Volver a la lista
          </button>

          <div class="mt-4 rounded-lg bg-[#1F2422]/[0.03] p-4">
            <p class="flex justify-between text-[#1F2422]"><span>Subtotal</span> <span>{{ formatCurrency(preview()!.subtotal) }}</span></p>
            <p class="flex justify-between text-[#1F2422]"><span>Impuesto ({{ preview()!.tax_percent }}%)</span> <span>{{ formatCurrency(preview()!.tax_amount) }}</span></p>
            <p class="flex justify-between text-sm text-[#1F2422]/60">
              <span>Propina sugerida ({{ preview()!.suggested_tip_percent }}%)</span>
              <span>{{ formatCurrency(preview()!.suggested_tip_amount) }}</span>
            </p>
            <p class="mt-2 flex justify-between font-semibold text-lg text-[#1F2422] border-t border-[#1F2422]/10 pt-2">
              <span>Total</span> <span>{{ formatCurrency(preview()!.total) }}</span>
            </p>
          </div>

          <h2 class="mt-6 text-xs font-semibold uppercase tracking-wider text-[#1F2422]/50">
            Cliente y puntos
          </h2>
          @if (customers.selected.value(); as customer) {
            <div class="mt-4 rounded-lg bg-[#3B7A57]/10 border border-[#3B7A57]/30 p-4">
              <div class="flex items-start justify-between">
                <p class="text-[#1F2422]">
                  <strong>{{ customer.full_name }}</strong> · {{ customer.phone }}
                  <span class="block text-sm text-[#1F2422]/60">
                    {{ customer.available_points }} puntos disponibles
                  </span>
                </p>
                <button
                  type="button"
                  class="text-sm text-[#1F2422]/60 hover:text-[#B5482A] transition-colors"
                  (click)="clearCustomer()"
                >
                  Quitar
                </button>
              </div>

              <label class="mt-3 block">
                <span class="text-sm text-[#1F2422]/70">Puntos a redimir</span>
                <input
                  type="number"
                  min="0"
                  [max]="customer.available_points"
                  class="mt-1 w-32 rounded-lg border border-[#1F2422]/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6F5E]/30"
                  [value]="redeemPoints()"
                  (input)="onRedeemPointsInput($any($event.target).value)"
                />
              </label>
            </div>
          } @else {
            <input
              type="search"
              placeholder="Telefono del cliente (opcional)"
              class="mt-4 w-full rounded-lg border border-[#1F2422]/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6F5E]/30"
              [value]="customers.search()"
              (input)="customers.search.set($any($event.target).value)"
            />
            @if (customers.results.isLoading()) {
              <p class="mt-2 text-sm text-[#1F2422]/60">Buscando...</p>
            } @else if (customers.search().trim()) {
              <ul class="mt-2 divide-y divide-[#1F2422]/10">
                @for (candidate of customers.results.value().content; track candidate.customer_id) {
                  <li>
                    <button
                      type="button"
                      class="flex w-full justify-between py-2 text-left text-sm hover:bg-[#FAF9F6] transition-colors"
                      (click)="selectCustomer(candidate.customer_id)"
                    >
                      <span class="text-[#1F2422]">{{ candidate.full_name }}</span>
                      <span class="text-[#1F2422]/60">{{ candidate.phone }}</span>
                    </button>
                  </li>
                } @empty {
                  <p class="py-2 text-sm text-[#1F2422]/60">
                    Sin coincidencias. Se puede dar de alta en Clientes.
                  </p>
                }
              </ul>
            }
          }

          <h2 class="mt-6 text-xs font-semibold uppercase tracking-wider text-[#1F2422]/50">Pago</h2>
          <form class="mt-4 space-y-4" (submit)="onIssue($event)">
            <div class="flex gap-3 items-end">
              <label class="block">
                <span class="text-sm text-[#1F2422]/70">Método</span>
                <select
                  class="mt-1 rounded-lg border border-[#1F2422]/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6F5E]/30"
                  [formField]="payForm.payment_method_1"
                >
                  <option value="CASH">Efectivo</option>
                  <option value="CARD">Tarjeta</option>
                </select>
              </label>
              <label class="block flex-1">
                <span class="text-sm text-[#1F2422]/70">Monto</span>
                <input
                  type="number"
                  step="0.01"
                  class="mt-1 w-full rounded-lg border border-[#1F2422]/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6F5E]/30"
                  [formField]="payForm.amount_1"
                />
              </label>
            </div>

            <label class="block">
              <span class="text-sm text-[#1F2422]/70">
                Propina · sugerida {{ formatCurrency(preview()!.suggested_tip_amount) }}
              </span>
              <input
                type="number"
                step="0.01"
                class="mt-1 w-full rounded-lg border border-[#1F2422]/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6F5E]/30"
                [formField]="payForm.tip_amount"
                (input)="syncAmountToCharge()"
              />
            </label>

            @if (discountAmount() > 0) {
              <p class="flex justify-between text-sm text-[#3B7A57]">
                <span>Descuento por {{ effectiveRedeemPoints() }} puntos</span>
                <span>-{{ formatCurrency(discountAmount()) }}</span>
              </p>
            }

            <p class="flex justify-between text-sm font-semibold text-[#1F2422]">
              <span>A cobrar</span> <span>{{ formatCurrency(amountToCharge()) }}</span>
            </p>

            <label class="flex items-center gap-2 text-sm text-[#1F2422]/70">
              <input type="checkbox" [formField]="payForm.split_payment" />
              Dividir el pago entre dos métodos
            </label>

            @if (payForm.split_payment().value()) {
              <div class="flex gap-3 items-end">
                <label class="block">
                  <span class="text-sm text-[#1F2422]/70">Segundo método</span>
                  <select
                    class="mt-1 rounded-lg border border-[#1F2422]/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6F5E]/30"
                    [formField]="payForm.payment_method_2"
                  >
                    <option value="CASH">Efectivo</option>
                    <option value="CARD">Tarjeta</option>
                  </select>
                </label>
                <label class="block flex-1">
                  <span class="text-sm text-[#1F2422]/70">Monto</span>
                  <input
                    type="number"
                    step="0.01"
                    class="mt-1 w-full rounded-lg border border-[#1F2422]/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6F5E]/30"
                    [formField]="payForm.amount_2"
                  />
                </label>
              </div>
            }

            @if (issueError()) {
              <p class="text-sm text-[#B5482A]">{{ issueError() }}</p>
            }

            <button
              type="submit"
              class="rounded-lg bg-[#2F6F5E] px-4 py-2 text-white text-sm font-medium hover:bg-[#26594B] transition-colors disabled:opacity-40"
              [disabled]="payForm().invalid()"
            >
              Facturar
            </button>
          </form>
        } @else {
          <!-- Lista de cuentas listas para cobro -->
          <h2 class="text-xs font-semibold uppercase tracking-wider text-[#1F2422]/50">Cuentas por cobrar</h2>

          @if (billing.readyAccounts.isLoading()) {
            <p class="mt-3 text-[#1F2422]/60">Cargando cuentas...</p>
          } @else {
            <ul class="mt-3 divide-y divide-[#1F2422]/10">
              @for (account of billing.readyAccounts.value(); track account.table_account_id) {
                <li class="flex items-center justify-between py-3">
                  <div>
                    <p class="text-[#1F2422]">Mesa {{ account.restaurant_table_id }} · {{ account.waiter_name }}</p>
                    <p class="text-sm text-[#1F2422]/60">{{ account.guest_count }} comensales</p>
                  </div>
                  <button
                    type="button"
                    class="rounded-lg bg-[#2F6F5E] px-4 py-1.5 text-white text-sm font-medium hover:bg-[#26594B] transition-colors"
                    (click)="selectAccount(account.table_account_id)"
                  >
                    Cobrar
                  </button>
                </li>
              } @empty {
                <p class="py-4 text-[#1F2422]/60">No hay cuentas listas para cobro.</p>
              }
            </ul>
          }
        }
      </section>
    </div>
  `,
})
export class BillingPage {
  protected readonly billing = inject(BillingService);
  protected readonly customers = inject(CustomersService);

  protected readonly redeemPoints = signal(0);
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
    tip_amount: 0,
    split_payment: false,
    payment_method_2: 'CARD' as PaymentMethod,
    amount_2: 0,
  });
  protected readonly payForm = form(this.payModel, (path) => {
    required(path.amount_1, { message: 'El monto es obligatorio' });
    min(path.amount_1, 0.01, { message: 'El monto debe ser mayor que cero' });
    min(path.tip_amount, 0, { message: 'La propina no puede ser negativa' });
  });

  /** Bruto: subtotal + impuesto (preview.total ya los suma) + la propina cobrada. */
  protected readonly grossTotal = computed(
    () => (this.preview()?.total ?? 0) + Number(this.payModel().tip_amount || 0),
  );

  /** Nunca mas puntos de los que el cliente tiene, y siempre enteros. */
  protected readonly effectiveRedeemPoints = computed(() => {
    const available = this.customers.selected.value()?.available_points ?? 0;

    return Math.max(0, Math.min(Math.floor(this.redeemPoints()), available));
  });

  /**
   * Replica el calculo de BillingService.issueInvoice: puntos x currency_per_point,
   * redondeado a dos decimales y topado al bruto. Si difiere, @PaymentsMatchTotal
   * rechaza la factura, asi que los dos lados tienen que coincidir al centavo.
   */
  protected readonly discountAmount = computed(() => {
    const perPoint = this.billing.settings.value()?.currency_per_point ?? 0;
    const points = this.effectiveRedeemPoints();

    if (!points || !perPoint) return 0;

    return Math.min(Math.round(points * perPoint * 100) / 100, this.grossTotal());
  });

  /** El backend exige que los pagos sumen exactamente el total con propina. */
  protected readonly amountToCharge = computed(() => this.grossTotal() - this.discountAmount());

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
      tip_amount: 0,
      split_payment: false,
      payment_method_2: 'CARD',
      amount_2: 0,
    });
  }

  /** Con un solo metodo de pago, el monto sigue al total con propina sin retecleo. */
  protected syncAmountToCharge() {
    if (this.payModel().split_payment) return;

    this.payModel.update((model) => ({ ...model, amount_1: this.amountToCharge() }));
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
            customer_id: this.customers.selected.value()?.customer_id ?? null,
            redeem_points: this.effectiveRedeemPoints() || null,
            tip_amount: Number(model.tip_amount) || null,
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

  protected selectCustomer(customerId: number) {
    this.customers.selectedId.set(customerId);
    this.redeemPoints.set(0);
  }

  protected clearCustomer() {
    this.customers.clearSelection();
    this.customers.search.set('');
    this.redeemPoints.set(0);
    this.syncAmountToCharge();
  }

  /** Al mover los puntos cambia el total, y el monto de un solo pago tiene que seguirlo. */
  protected onRedeemPointsInput(value: string) {
    this.redeemPoints.set(Number(value) || 0);
    this.syncAmountToCharge();
  }

  protected reset() {
    this.selectedAccountId.set(null);
    this.preview.set(null);
    this.issuedInvoice.set(null);
    this.ratingSubmitted.set(false);
    this.clearCustomer();
  }
}
