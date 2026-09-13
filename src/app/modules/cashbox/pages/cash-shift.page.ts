import { Component, inject, signal } from '@angular/core';
import { form, FormField, required, min, submit } from '@angular/forms/signals';
import { CashboxService } from '../cashbox.service';
import { formatCurrency, formatDateTime } from '../../../core/format';

@Component({
  selector: 'app-cash-shift',
  imports: [FormField],
  template: `
    <div class="min-h-full bg-[#FAF9F6] -m-6 p-6">
      <header class="mb-8">
        <h1 class="text-2xl font-semibold text-[#1F2422]">Caja</h1>
        <p class="mt-1 text-sm text-[#1F2422]/60">Apertura, movimientos y cierre con cuadre</p>
      </header>

      <section class="rounded-2xl bg-white border border-[#1F2422]/10 p-6 max-w-lg">
        @if (cashbox.openShifts.isLoading()) {
          <p class="text-[#1F2422]/60">Cargando turno...</p>
        } @else if (!cashbox.currentShift()) {
          <!-- Sin turno abierto: formulario de apertura -->
          <h2 class="text-xs font-semibold uppercase tracking-wider text-[#1F2422]/50">Abrir turno</h2>
          <form class="mt-4 space-y-4" (submit)="onOpen($event)">
            <label class="block">
              <span class="text-sm text-[#1F2422]/70">Monto inicial de efectivo</span>
              <input
                type="number"
                step="0.01"
                class="mt-1 w-full rounded-lg border border-[#1F2422]/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6F5E]/30"
                [formField]="openForm.opening_balance"
              />
            </label>
            @if (openForm.opening_balance().touched() && openForm.opening_balance().invalid()) {
              @for (error of openForm.opening_balance().errors(); track error) {
                <p class="text-sm text-[#B5482A]">{{ error.message }}</p>
              }
            }

            @if (openError()) {
              <p class="text-sm text-[#B5482A]">{{ openError() }}</p>
            }

            <button
              type="submit"
              class="rounded-lg bg-[#2F6F5E] px-4 py-2 text-white text-sm font-medium hover:bg-[#26594B] transition-colors disabled:opacity-40"
              [disabled]="openForm().invalid()"
            >
              Abrir turno
            </button>
          </form>
        } @else {
          <!-- Turno abierto: resumen, movimientos y cierre -->
          <div class="rounded-lg bg-[#3B7A57]/10 border border-[#3B7A57]/30 p-4">
            <p class="text-[#1F2422]">
              Turno abierto con <strong>{{ formatCurrency(cashbox.currentShift()!.opening_balance) }}</strong>
            </p>
            <p class="text-sm text-[#1F2422]/60">
              Desde {{ formatDateTime(cashbox.currentShift()!.opened_at) }}
            </p>
          </div>

          <h2 class="mt-6 text-xs font-semibold uppercase tracking-wider text-[#1F2422]/50">Movimientos</h2>
          @if (cashbox.movements.isLoading()) {
            <p class="mt-2 text-[#1F2422]/60">Cargando...</p>
          } @else {
            <ul class="mt-2 divide-y divide-[#1F2422]/10">
              @for (movement of cashbox.movements.value(); track movement.cash_movement_id) {
                <li class="flex justify-between py-2">
                  <span class="text-[#1F2422]">{{ movement.movement_type }}</span>
                  <span class="font-medium text-[#1F2422]">{{ formatCurrency(movement.amount) }}</span>
                </li>
              } @empty {
                <p class="py-2 text-[#1F2422]/60">Sin movimientos todavía.</p>
              }
            </ul>
          }

          <h2 class="mt-6 text-xs font-semibold uppercase tracking-wider text-[#1F2422]/50">Cerrar turno</h2>
          <form class="mt-4 space-y-4" (submit)="onClose($event)">
            <label class="block">
              <span class="text-sm text-[#1F2422]/70">Efectivo contado</span>
              <input
                type="number"
                step="0.01"
                class="mt-1 w-full rounded-lg border border-[#1F2422]/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6F5E]/30"
                [formField]="closeForm.counted_cash"
              />
            </label>
            @if (closeForm.counted_cash().touched() && closeForm.counted_cash().invalid()) {
              @for (error of closeForm.counted_cash().errors(); track error) {
                <p class="text-sm text-[#B5482A]">{{ error.message }}</p>
              }
            }

            @if (closeError()) {
              <p class="text-sm text-[#B5482A]">{{ closeError() }}</p>
            }

            <button
              type="submit"
              class="rounded-lg bg-[#2F6F5E] px-4 py-2 text-white text-sm font-medium hover:bg-[#26594B] transition-colors disabled:opacity-40"
              [disabled]="closeForm().invalid()"
            >
              Cerrar con cuadre
            </button>
          </form>
        }
      </section>
    </div>
  `,
})
export class CashShiftPage {
  protected readonly cashbox = inject(CashboxService);
  protected readonly formatCurrency = formatCurrency;
  protected readonly formatDateTime = formatDateTime;

  protected readonly openError = signal<string | null>(null);
  protected readonly closeError = signal<string | null>(null);

  protected readonly openModel = signal({ opening_balance: 0 });
  protected readonly openForm = form(this.openModel, (path) => {
    required(path.opening_balance, { message: 'El monto inicial es obligatorio' });
    min(path.opening_balance, 0, { message: 'El monto no puede ser negativo' });
  });

  protected readonly closeModel = signal({ counted_cash: 0 });
  protected readonly closeForm = form(this.closeModel, (path) => {
    required(path.counted_cash, { message: 'El efectivo contado es obligatorio' });
    min(path.counted_cash, 0, { message: 'El monto no puede ser negativo' });
  });

  protected onOpen(event: Event) {
    event.preventDefault();
    this.openError.set(null);

    submit(this.openForm, {
      action: async () => {
        try {
          await this.cashbox.openShift(this.openModel());
        } catch (error: any) {
          this.openError.set(error?.error?.message ?? 'No se pudo abrir el turno.');
        }
      },
    });
  }

  protected onClose(event: Event) {
    event.preventDefault();
    this.closeError.set(null);

    const shiftId = this.cashbox.currentShift()?.cash_shift_id;
    if (!shiftId) return;

    submit(this.closeForm, {
      action: async () => {
        try {
          await this.cashbox.closeShift(shiftId, this.closeModel());
        } catch (error: any) {
          this.closeError.set(error?.error?.message ?? 'No se pudo cerrar el turno.');
        }
      },
    });
  }
}
