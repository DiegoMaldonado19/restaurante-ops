import { Component, inject, signal } from '@angular/core';
import { form, FormField, required, min, submit } from '@angular/forms/signals';
import { DiningService } from '../dining.service';
import { TableStatus } from '../dining.types';
import { formatDateTime } from '../../../core/format';

const STATUS_LABEL: Record<TableStatus, string> = {
  FREE: 'Libre',
  RESERVED: 'Reservada',
  OCCUPIED: 'Ocupada',
  BILL_REQUESTED: 'Cuenta pedida',
};

const STATUS_BAR: Record<TableStatus, string> = {
  FREE: 'border-l-[#3B7A57]',
  RESERVED: 'border-l-[#C98A2E]',
  OCCUPIED: 'border-l-[#B5482A]',
  BILL_REQUESTED: 'border-l-[#B5482A]',
};

const STATUS_DOT: Record<TableStatus, string> = {
  FREE: 'bg-[#3B7A57]',
  RESERVED: 'bg-[#C98A2E]',
  OCCUPIED: 'bg-[#B5482A]',
  BILL_REQUESTED: 'bg-[#B5482A]',
};

@Component({
  selector: 'app-dining',
  imports: [FormField],
  template: `
    <div class="min-h-full bg-[#FAF9F6] -m-6 p-6">
      <header class="mb-8">
        <h1 class="text-2xl font-semibold text-[#1F2422]">Salón</h1>
        <p class="mt-1 text-sm text-[#1F2422]/60">Mesas, reservas y lista de espera en tiempo real</p>
      </header>

      <section class="rounded-2xl bg-white border border-[#1F2422]/10 p-6 max-w-5xl">
        <h2 class="text-xs font-semibold uppercase tracking-wider text-[#1F2422]/50">Mesas</h2>

        @if (dining.floorPlan.isLoading()) {
          <p class="mt-3 text-[#1F2422]/60">Cargando plano...</p>
        } @else {
          <div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            @for (row of dining.floorPlan.value(); track row.restaurant_table_id) {
              <div class="rounded-lg border border-[#1F2422]/10 border-l-4 bg-white p-4 text-sm shadow-sm"
                   [class]="statusBar(row.status)">
                <div class="flex items-center justify-between">
                  <p class="font-semibold text-[#1F2422]">Mesa {{ row.table_number }}</p>
                  <span class="inline-flex items-center gap-1.5 text-xs text-[#1F2422]/70">
                    <span class="h-1.5 w-1.5 rounded-full" [class]="statusDot(row.status)"></span>
                    {{ statusLabel(row.status) }}
                  </span>
                </div>
                <p class="mt-1 text-[#1F2422]/60">{{ row.capacity }} personas</p>
                @if (row.open_account) {
                  <p class="mt-2 text-xs text-[#1F2422]/60">Atiende {{ row.open_account.waiter_name }}</p>
                }
                @if (row.next_reservation) {
                  <p class="mt-2 text-xs font-medium text-[#C98A2E]">
                    Reserva: {{ row.next_reservation.customer_name }}
                  </p>
                }
              </div>
            } @empty {
              <p class="col-span-full text-[#1F2422]/60">Sin mesas registradas.</p>
            }
          </div>
        }
      </section>

      <section class="mt-6 rounded-2xl bg-white border border-[#1F2422]/10 p-6 max-w-5xl">
        <h2 class="text-xs font-semibold uppercase tracking-wider text-[#1F2422]/50">Reservas de hoy</h2>

        @if (dining.reservations.isLoading()) {
          <p class="mt-3 text-[#1F2422]/60">Cargando...</p>
        } @else {
          <ul class="mt-3 divide-y divide-[#1F2422]/10">
            @for (reservation of dining.reservations.value(); track reservation.reservation_id) {
              <li class="flex items-center justify-between py-3">
                <div>
                  <p class="text-[#1F2422]">
                    {{ reservation.customer_name }} · Mesa {{ reservation.restaurant_table_id }}
                  </p>
                  <p class="text-sm text-[#1F2422]/60">
                    {{ formatDateTime(reservation.reserved_at) }} · {{ reservation.guest_count }} personas
                  </p>
                </div>
                <div class="flex gap-2">
                  <button
                    type="button"
                    class="rounded-lg bg-[#2F6F5E] px-3 py-1.5 text-white text-sm font-medium hover:bg-[#26594B] transition-colors"
                    (click)="onSeatReservation(reservation.reservation_id)"
                  >
                    Sentar
                  </button>
                  <button
                    type="button"
                    class="rounded-lg border border-[#1F2422]/15 px-3 py-1.5 text-[#1F2422]/70 text-sm hover:bg-[#1F2422]/5 transition-colors"
                    (click)="onCancelReservation(reservation.reservation_id)"
                  >
                    Cancelar
                  </button>
                </div>
              </li>
            } @empty {
              <p class="py-4 text-[#1F2422]/60">Sin reservas pendientes.</p>
            }
          </ul>
        }
      </section>

      @if (actionError()) {
        <p class="mt-3 max-w-5xl text-sm text-[#B5482A]">{{ actionError() }}</p>
      }

      <section class="mt-6 rounded-2xl bg-white border border-[#1F2422]/10 p-6 max-w-5xl">
        <h2 class="text-xs font-semibold uppercase tracking-wider text-[#1F2422]/50">Lista de espera</h2>

        <ul class="mt-3 divide-y divide-[#1F2422]/10">
          @for (entry of dining.waitlist.value(); track entry.waitlist_entry_id) {
            <li class="flex items-center justify-between py-3">
              <div>
                <p class="text-[#1F2422]">{{ entry.customer_name }}</p>
                <p class="text-sm text-[#1F2422]/60">
                  {{ entry.guest_count }} personas · desde {{ formatDateTime(entry.arrived_at) }}
                </p>
              </div>
              <div class="flex items-center gap-2">
                              <input
                  type="number"
                  min="1"
                  placeholder="# mesa"
                  class="w-20 rounded-lg border border-[#1F2422]/15 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6F5E]/30"
                  #tableInput
                />
                <button
                  type="button"
                  class="rounded-lg bg-[#2F6F5E] px-3 py-1.5 text-white text-sm font-medium hover:bg-[#26594B] transition-colors"
                  (click)="onSeatWaitlist(entry.waitlist_entry_id, tableInput.value)"
                >
                  Sentar
                </button>
                <button
                  type="button"
                  class="rounded-lg border border-[#1F2422]/15 px-3 py-1.5 text-[#1F2422]/70 text-sm hover:bg-[#1F2422]/5 transition-colors"
                  (click)="onRemoveWaitlist(entry.waitlist_entry_id)"
                >
                  Se fue
                </button>
              </div>
            </li>
          } @empty {
            <p class="py-4 text-[#1F2422]/60">Nadie esperando.</p>
          }
        </ul>

        <h3 class="mt-5 text-sm font-medium text-[#1F2422]">Agregar a la cola</h3>
        <form class="mt-3 flex flex-wrap gap-3 items-end" (submit)="onAddWaitlist($event)">
          <label class="block">
            <span class="text-xs text-[#1F2422]/60">Nombre</span>
            <input
              class="mt-1 rounded-lg border border-[#1F2422]/15 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6F5E]/30"
              [formField]="waitlistForm.customer_name"
            />
          </label>
          <label class="block">
            <span class="text-xs text-[#1F2422]/60">Teléfono</span>
            <input
              class="mt-1 rounded-lg border border-[#1F2422]/15 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6F5E]/30"
              [formField]="waitlistForm.customer_phone"
            />
          </label>
          <label class="block">
            <span class="text-xs text-[#1F2422]/60">Personas</span>
            <input
              type="number"
              class="mt-1 w-20 rounded-lg border border-[#1F2422]/15 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6F5E]/30"
              [formField]="waitlistForm.guest_count"
            />
          </label>
          <button
            type="submit"
            class="rounded-lg bg-[#2F6F5E] px-4 py-1.5 text-white text-sm font-medium hover:bg-[#26594B] transition-colors disabled:opacity-40"
            [disabled]="waitlistForm().invalid()"
          >
            Agregar
          </button>
        </form>
        @if (waitlistError()) {
          <p class="mt-2 text-sm text-[#B5482A]">{{ waitlistError() }}</p>
        }
      </section>
    </div>
  `,
})
export class DiningPage {
  protected readonly dining = inject(DiningService);
  protected readonly formatDateTime = formatDateTime;

  protected readonly actionError = signal<string | null>(null);
  protected readonly waitlistError = signal<string | null>(null);

  protected readonly waitlistModel = signal({ customer_name: '', customer_phone: '', guest_count: 1 });
  protected readonly waitlistForm = form(this.waitlistModel, (path) => {
    required(path.customer_name, { message: 'El nombre es obligatorio' });
    required(path.customer_phone, { message: 'El telefono es obligatorio' });
    min(path.guest_count, 1, { message: 'Minimo 1 persona' });
  });

  protected statusLabel(status: TableStatus): string {
    return STATUS_LABEL[status];
  }

  protected statusBar(status: TableStatus): string {
    return STATUS_BAR[status];
  }

  protected statusDot(status: TableStatus): string {
    return STATUS_DOT[status];
  }

  protected async onSeatReservation(reservationId: number) {
    this.actionError.set(null);
    try {
      await this.dining.seatReservation(reservationId);
    } catch (error: any) {
      this.actionError.set(error?.error?.message ?? 'No se pudo sentar la reserva.');
    }
  }

  protected async onCancelReservation(reservationId: number) {
    this.actionError.set(null);
    try {
      await this.dining.cancelReservation(reservationId, {
        reason: 'CUSTOMER_CANCELLED',
        note: null,
      });
    } catch (error: any) {
      this.actionError.set(error?.error?.message ?? 'No se pudo cancelar la reserva.');
    }
  }

  protected async onSeatWaitlist(entryId: number, tableIdRaw: string) {
    this.actionError.set(null);
    const tableId = Number(tableIdRaw);
    if (!tableId) {
      this.actionError.set('Indique el numero de mesa.');
      return;
    }
    try {
      await this.dining.seatWaitlistEntry(entryId, { table_id: tableId });
    } catch (error: any) {
      this.actionError.set(error?.error?.message ?? 'No se pudo sentar de la lista de espera.');
    }
  }

  protected async onRemoveWaitlist(entryId: number) {
    this.actionError.set(null);
    try {
      await this.dining.removeWaitlistEntry(entryId);
    } catch (error: any) {
      this.actionError.set(error?.error?.message ?? 'No se pudo retirar de la lista.');
    }
  }

  protected onAddWaitlist(event: Event) {
    event.preventDefault();
    this.waitlistError.set(null);

    submit(this.waitlistForm, {
      action: async () => {
        try {
          await this.dining.createWaitlistEntry(this.waitlistModel());
          this.waitlistModel.set({ customer_name: '', customer_phone: '', guest_count: 1 });
        } catch (error: any) {
          this.waitlistError.set(error?.error?.message ?? 'No se pudo agregar a la cola.');
        }
      },
    });
  }
}
