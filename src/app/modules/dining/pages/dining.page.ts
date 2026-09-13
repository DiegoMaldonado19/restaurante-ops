import { Component, inject, signal } from '@angular/core';
import { form, FormField, required, min, submit } from '@angular/forms/signals';
import { DiningService } from '../dining.service';

@Component({
  selector: 'app-dining',
  imports: [FormField],
  template: `
    <section class="rounded-xl bg-white p-8 shadow max-w-4xl">
      <h1 class="text-2xl font-semibold text-slate-900">Salón</h1>

      <!-- Plano de mesas -->
      <h2 class="mt-6 text-lg font-medium text-slate-900">Mesas</h2>
      @if (dining.floorPlan.isLoading()) {
        <p class="mt-2 text-slate-500">Cargando plano...</p>
      } @else {
        <div class="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
          @for (row of dining.floorPlan.value(); track row.restaurant_table_id) {
            <div
              class="rounded-lg border p-3 text-sm"
              [class.bg-green-50]="row.status === 'FREE'"
              [class.bg-amber-50]="row.status === 'RESERVED'"
              [class.bg-red-50]="row.status === 'OCCUPIED' || row.status === 'BILL_REQUESTED'"
            >
              <p class="font-semibold text-slate-900">Mesa {{ row.table_number }}</p>
              <p class="text-slate-500">{{ row.status }} · {{ row.capacity }} pers.</p>
              @if (row.open_account) {
                <p class="mt-1 text-xs text-slate-600">{{ row.open_account.waiter_name }}</p>
              }
              @if (row.next_reservation) {
                <p class="mt-1 text-xs text-amber-700">
                  Reserva: {{ row.next_reservation.customer_name }}
                </p>
              }
            </div>
          } @empty {
            <p class="col-span-full text-slate-500">Sin mesas registradas.</p>
          }
        </div>
      }

      <!-- Reservas proximas -->
      <h2 class="mt-8 text-lg font-medium text-slate-900">Reservas de hoy</h2>
      @if (dining.reservations.isLoading()) {
        <p class="mt-2 text-slate-500">Cargando...</p>
      } @else {
        <ul class="mt-2 divide-y divide-slate-200">
          @for (reservation of dining.reservations.value(); track reservation.reservation_id) {
            <li class="flex items-center justify-between py-3">
              <div>
                <p class="text-slate-900">
                  {{ reservation.customer_name }} · Mesa {{ reservation.restaurant_table_id }}
                </p>
                <p class="text-sm text-slate-500">
                  {{ reservation.reserved_at }} · {{ reservation.guest_count }} personas
                </p>
              </div>
              <div class="flex gap-2">
                <button
                  type="button"
                  class="rounded bg-slate-900 px-3 py-1.5 text-white text-sm"
                  (click)="onSeatReservation(reservation.reservation_id)"
                >
                  Sentar
                </button>
                <button
                  type="button"
                  class="rounded border border-slate-300 px-3 py-1.5 text-slate-700 text-sm"
                  (click)="onCancelReservation(reservation.reservation_id)"
                >
                  Cancelar
                </button>
              </div>
            </li>
          } @empty {
            <p class="py-3 text-slate-500">Sin reservas pendientes.</p>
          }
        </ul>
      }

      @if (actionError()) {
        <p class="mt-2 text-red-600 text-sm">{{ actionError() }}</p>
      }

      <!-- Lista de espera -->
      <h2 class="mt-8 text-lg font-medium text-slate-900">Lista de espera</h2>
      <ul class="mt-2 divide-y divide-slate-200">
        @for (entry of dining.waitlist.value(); track entry.waitlist_entry_id) {
          <li class="flex items-center justify-between py-3">
            <div>
              <p class="text-slate-900">{{ entry.customer_name }}</p>
              <p class="text-sm text-slate-500">{{ entry.guest_count }} personas · desde {{ entry.arrived_at }}</p>
            </div>
            <div class="flex items-center gap-2">
              <input
                type="number"
                placeholder="# mesa"
                class="w-20 rounded border border-slate-300 px-2 py-1 text-sm"
                #tableInput
              />
              <button
                type="button"
                class="rounded bg-slate-900 px-3 py-1.5 text-white text-sm"
                (click)="onSeatWaitlist(entry.waitlist_entry_id, tableInput.value)"
              >
                Sentar
              </button>
              <button
                type="button"
                class="rounded border border-slate-300 px-3 py-1.5 text-slate-700 text-sm"
                (click)="onRemoveWaitlist(entry.waitlist_entry_id)"
              >
                Se fue
              </button>
            </div>
          </li>
        } @empty {
          <p class="py-3 text-slate-500">Nadie esperando.</p>
        }
      </ul>

      <h3 class="mt-4 text-sm font-medium text-slate-700">Agregar a la cola</h3>
      <form class="mt-2 flex flex-wrap gap-2 items-end" (submit)="onAddWaitlist($event)">
        <label class="block">
          <span class="text-xs text-slate-600">Nombre</span>
          <input class="mt-1 rounded border border-slate-300 px-2 py-1 text-sm" [formField]="waitlistForm.customer_name" />
        </label>
        <label class="block">
          <span class="text-xs text-slate-600">Telefono</span>
          <input class="mt-1 rounded border border-slate-300 px-2 py-1 text-sm" [formField]="waitlistForm.customer_phone" />
        </label>
        <label class="block">
          <span class="text-xs text-slate-600">Personas</span>
          <input type="number" class="mt-1 w-20 rounded border border-slate-300 px-2 py-1 text-sm" [formField]="waitlistForm.guest_count" />
        </label>
        <button
          type="submit"
          class="rounded bg-slate-900 px-3 py-1.5 text-white text-sm disabled:opacity-50"
          [disabled]="waitlistForm().invalid()"
        >
          Agregar
        </button>
      </form>
      @if (waitlistError()) {
        <p class="mt-2 text-red-600 text-sm">{{ waitlistError() }}</p>
      }
    </section>
  `,
})
export class DiningPage {
  protected readonly dining = inject(DiningService);

  protected readonly actionError = signal<string | null>(null);
  protected readonly waitlistError = signal<string | null>(null);

  protected readonly waitlistModel = signal({ customer_name: '', customer_phone: '', guest_count: 1 });
  protected readonly waitlistForm = form(this.waitlistModel, (path) => {
    required(path.customer_name, { message: 'El nombre es obligatorio' });
    required(path.customer_phone, { message: 'El telefono es obligatorio' });
    min(path.guest_count, 1, { message: 'Minimo 1 persona' });
  });

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
