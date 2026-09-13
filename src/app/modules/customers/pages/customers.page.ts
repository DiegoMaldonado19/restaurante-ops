import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { form, FormField, minLength, required, submit } from '@angular/forms/signals';
import { CustomersService } from '../customers.service';
import { messageFor } from '../../../core/error-messages';
import { formatDateTime } from '../../../core/format';
import { LOYALTY_TYPE_LABELS } from '../customers.types';

@Component({
  selector: 'app-customers',
  imports: [FormField],
  template: `
    <div class="min-h-full bg-[#FAF9F6] -m-6 p-6">
      <header class="mb-8 flex items-start justify-between">
        <div>
          <h1 class="text-2xl font-semibold text-[#1F2422]">Clientes</h1>
          <p class="mt-1 text-sm text-[#1F2422]/60">Fidelizacion en el mostrador</p>
        </div>
        <button
          type="button"
          class="rounded-lg bg-[#2F6F5E] px-4 py-2 text-white text-sm font-medium hover:bg-[#26594B] transition-colors"
          (click)="openCreate()"
        >
          Alta rapida
        </button>
      </header>

      <div class="grid gap-6 lg:grid-cols-2">
        <section class="rounded-2xl bg-white border border-[#1F2422]/10 p-6">
          <h2 class="text-xs font-semibold uppercase tracking-wider text-[#1F2422]/50">Buscar</h2>

          <input
            type="search"
            placeholder="Telefono o nombre"
            class="mt-4 w-full rounded-lg border border-[#1F2422]/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6F5E]/30"
            [value]="customers.search()"
            (input)="customers.search.set($any($event.target).value)"
          />

          @if (customers.results.isLoading()) {
            <p class="mt-4 text-[#1F2422]/60">Buscando...</p>
          } @else if (customers.results.error()) {
            <p class="mt-4 text-sm text-[#B5482A]">{{ resultsError() }}</p>
          } @else if (customers.search().trim()) {
            <ul class="mt-4 divide-y divide-[#1F2422]/10">
              @for (customer of customers.results.value().content; track customer.customer_id) {
                <li>
                  <button
                    type="button"
                    class="flex w-full justify-between py-3 text-left hover:bg-[#FAF9F6] transition-colors"
                    (click)="customers.selectedId.set(customer.customer_id)"
                  >
                    <span class="text-[#1F2422]">{{ customer.full_name }}</span>
                    <span class="text-sm text-[#1F2422]/60">{{ customer.phone }}</span>
                  </button>
                </li>
              } @empty {
                <p class="py-3 text-[#1F2422]/60">Sin coincidencias. Puede darlo de alta.</p>
              }
            </ul>
          } @else {
            <p class="mt-4 text-[#1F2422]/60">Teclee un telefono para empezar.</p>
          }
        </section>

        <section class="rounded-2xl bg-white border border-[#1F2422]/10 p-6">
          <h2 class="text-xs font-semibold uppercase tracking-wider text-[#1F2422]/50">Puntos</h2>

          @if (!customers.selectedId()) {
            <p class="mt-4 text-[#1F2422]/60">Elija un cliente de la lista.</p>
          } @else if (customers.selected.isLoading()) {
            <p class="mt-4 text-[#1F2422]/60">Cargando ficha...</p>
          } @else if (customers.selected.error()) {
            <p class="mt-4 text-sm text-[#B5482A]">{{ selectedError() }}</p>
          } @else if (customers.selected.value(); as customer) {
            <div class="mt-4 rounded-lg bg-[#3B7A57]/10 border border-[#3B7A57]/30 p-4">
              <p class="text-[#1F2422]">
                <strong>{{ customer.full_name }}</strong> · {{ customer.phone }}
              </p>
              <p class="mt-2 text-2xl font-semibold text-[#1F2422]">
                {{ customer.available_points }}
                <span class="text-sm font-normal text-[#1F2422]/60">puntos disponibles</span>
              </p>
              <p class="text-sm text-[#1F2422]/60">{{ customer.visit_count }} visitas</p>
            </div>

            <p class="mt-4 text-sm text-[#1F2422]/60">
              Los puntos se acreditan y se redimen al cobrar, en la pantalla de cobro.
            </p>

            @if (customers.canSeeLoyalty()) {
              <h3 class="mt-6 text-xs font-semibold uppercase tracking-wider text-[#1F2422]/50">
                Historial
              </h3>
              @if (customers.loyalty.isLoading()) {
                <p class="mt-2 text-[#1F2422]/60">Cargando...</p>
              } @else {
                <ul class="mt-2 divide-y divide-[#1F2422]/10">
                  @for (item of customers.loyalty.value().content; track item.loyalty_transaction_id) {
                    <li class="flex justify-between py-2">
                      <span class="text-sm text-[#1F2422]">
                        {{ typeLabels[item.transaction_type] }}
                        <span class="text-[#1F2422]/50">{{ asDateTime(item.created_at) }}</span>
                      </span>
                      <span
                        class="font-medium"
                        [class]="item.points < 0 ? 'text-[#B5482A]' : 'text-[#3B7A57]'"
                      >
                        {{ item.points > 0 ? '+' : '' }}{{ item.points }}
                      </span>
                    </li>
                  } @empty {
                    <p class="py-2 text-[#1F2422]/60">Todavia no tiene movimientos.</p>
                  }
                </ul>
              }
            }
          }
        </section>
      </div>
    </div>

    <dialog #createDialog class="rounded-2xl p-6 shadow-xl backdrop:bg-[#1F2422]/40">
      <h2 class="text-lg font-semibold text-[#1F2422]">Alta rapida</h2>

      <form class="mt-4 space-y-4 w-80" (submit)="onCreate($event)">
        <label class="block">
          <span class="text-sm text-[#1F2422]/70">Nombre</span>
          <input
            type="text"
            class="mt-1 w-full rounded-lg border border-[#1F2422]/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6F5E]/30"
            [formField]="createForm.full_name"
          />
        </label>
        @if (createForm.full_name().touched() && createForm.full_name().invalid()) {
          @for (error of createForm.full_name().errors(); track error) {
            <p class="text-sm text-[#B5482A]">{{ error.message }}</p>
          }
        }

        <label class="block">
          <span class="text-sm text-[#1F2422]/70">Telefono</span>
          <input
            type="tel"
            class="mt-1 w-full rounded-lg border border-[#1F2422]/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6F5E]/30"
            [formField]="createForm.phone"
          />
        </label>
        @if (createForm.phone().touched() && createForm.phone().invalid()) {
          @for (error of createForm.phone().errors(); track error) {
            <p class="text-sm text-[#B5482A]">{{ error.message }}</p>
          }
        }

        @if (createError()) {
          <p class="text-sm text-[#B5482A]">{{ createError() }}</p>
        }

        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="rounded-lg px-4 py-2 text-sm text-[#1F2422]/70 hover:bg-[#FAF9F6] transition-colors"
            (click)="closeCreate()"
          >
            Cancelar
          </button>
          <button
            type="submit"
            class="rounded-lg bg-[#2F6F5E] px-4 py-2 text-white text-sm font-medium hover:bg-[#26594B] transition-colors disabled:opacity-40"
            [disabled]="createForm().invalid() || createForm().submitting()"
          >
            Guardar
          </button>
        </div>
      </form>
    </dialog>
  `,
})
export class CustomersPage {
  protected readonly customers = inject(CustomersService);
  protected readonly typeLabels = LOYALTY_TYPE_LABELS;
  protected readonly asDateTime = formatDateTime;

  protected readonly createError = signal<string | null>(null);

  private readonly createDialog = viewChild.required<ElementRef<HTMLDialogElement>>('createDialog');

  protected readonly createModel = signal({ full_name: '', phone: '' });
  protected readonly createForm = form(this.createModel, (path) => {
    required(path.full_name, { message: 'El nombre es obligatorio' });
    required(path.phone, { message: 'El telefono es obligatorio' });
    minLength(path.phone, 8, { message: 'El telefono lleva al menos 8 digitos' });
  });

  protected resultsError(): string {
    return messageFor(this.customers.results.error());
  }

  protected selectedError(): string {
    return messageFor(this.customers.selected.error());
  }

  protected openCreate(): void {
    this.createError.set(null);
    this.createModel.set({ full_name: '', phone: this.customers.search().trim() });
    this.createDialog().nativeElement.showModal();
  }

  protected closeCreate(): void {
    this.createDialog().nativeElement.close();
  }

  /** El 409 de telefono repetido llega aunque el formulario sea valido: lo decide la base. */
  protected onCreate(event: Event): void {
    event.preventDefault();
    this.createError.set(null);

    submit(this.createForm, {
      action: async () => {
        try {
          await this.customers.create(this.createModel());
          this.closeCreate();
        } catch (error) {
          this.createError.set(messageFor(error));
        }

        return undefined;
      },
    });
  }
}
