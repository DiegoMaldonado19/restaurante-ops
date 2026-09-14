import { Component, effect, ElementRef, inject, signal, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { form, FormField, max, min, required, submit } from '@angular/forms/signals';
import { TablesService } from '../tables.service';
import { messageFor, actionLabelFor } from '../../../core/error-messages';
import { formatCurrency, formatDateTime } from '../../../core/format';
import {
  FloorPlanRow,
  STATUS_BAR,
  STATUS_DOT,
  STATUS_LABEL,
  TableStatus,
  VALID_TRANSITIONS,
} from '../tables.types';

type OpenAccountSummary = NonNullable<FloorPlanRow['open_account']>;

@Component({
  selector: 'app-table-map',
  imports: [FormField, RouterLink],
  template: `
    <div class="min-h-full bg-[#FAF9F6] -m-6 p-6">
      <header class="mb-8">
        <h1 class="text-2xl font-semibold text-[#1F2422]">Mesas</h1>
        <p class="mt-1 text-sm text-[#1F2422]/60">
          {{ freeCount() }} libres · {{ occupiedCount() }} ocupadas
        </p>
      </header>

      <section class="rounded-2xl bg-white border border-[#1F2422]/10 p-6 max-w-5xl">
        @if (tables.floorPlan.isLoading()) {
          <p class="text-[#1F2422]/60">Cargando plano...</p>
        } @else if (tables.floorPlan.error()) {
          <p class="text-sm text-[#B5482A]">{{ floorPlanError() }}</p>
        } @else {
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            @for (row of tables.floorPlan.value(); track row.restaurant_table_id) {
              <div
                class="rounded-lg border border-[#1F2422]/10 border-l-4 bg-white p-4 text-sm shadow-sm"
                [class]="STATUS_BAR[row.status]"
              >
                <div class="flex items-center justify-between">
                  <p class="font-semibold text-[#1F2422]">Mesa {{ row.table_number }}</p>
                  <span class="inline-flex items-center gap-1.5 text-xs text-[#1F2422]/70">
                    <span class="h-1.5 w-1.5 rounded-full" [class]="STATUS_DOT[row.status]"></span>
                    {{ STATUS_LABEL[row.status] }}
                  </span>
                </div>
                <p class="mt-1 text-[#1F2422]/60">{{ row.capacity }} personas</p>

                @if (openAccountOf(row); as openAccount) {
                  <!-- Cuenta abierta: la tarjeta entera lleva al detalle. -->
                  <a
                    [routerLink]="['/mesas', openAccount.table_account_id]"
                    class="mt-3 block rounded-lg bg-[#1F2422]/[0.03] p-2 text-xs hover:bg-[#1F2422]/[0.06] transition-colors"
                  >
                    <p class="text-[#1F2422]">Atiende {{ openAccount.waiter_name }}</p>
                    <p class="mt-1 flex justify-between text-[#1F2422]/60">
                      <span>desde {{ formatDateTime(openAccount.opened_at) }}</span>
                      <span class="font-medium text-[#1F2422]">
                        {{ formatCurrency(openAccount.running_total) }}
                      </span>
                    </p>
                  </a>
                } @else if (row.status === 'FREE') {
                  <button
                    type="button"
                    class="mt-3 w-full rounded-lg bg-[#2F6F5E] px-3 py-1.5 text-white text-xs font-medium hover:bg-[#26594B] transition-colors"
                    (click)="openAccountDialog(row.restaurant_table_id)"
                  >
                    Abrir cuenta
                  </button>
                } @else if (row.status === 'RESERVED') {
                  @if (row.next_reservation) {
                    <p class="mt-2 text-xs font-medium text-[#C98A2E]">
                      Reserva: {{ row.next_reservation.customer_name }}
                    </p>
                  }
                  <a
                    routerLink="/salon"
                    class="mt-3 block w-full rounded-lg border border-[#1F2422]/15 px-3 py-1.5 text-center text-xs text-[#1F2422]/70 hover:bg-[#1F2422]/5 transition-colors"
                  >
                    Ver en Salón
                  </a>
                } @else if (isResolvingAccount(row.restaurant_table_id)) {
                  <p class="mt-2 text-xs text-[#1F2422]/50">Buscando la cuenta…</p>
                } @else {
                  <!-- OCCUPIED/BILL_REQUESTED sin cuenta abierta: la mesa quedo mal de verdad. -->
                  <p class="mt-2 text-xs text-[#B5482A]">Sin cuenta asociada</p>
                  <button
                    type="button"
                    class="mt-3 w-full rounded-lg border border-[#1F2422]/15 px-3 py-1.5 text-xs text-[#1F2422]/70 hover:bg-[#1F2422]/5 transition-colors"
                    (click)="openStatusDialog(row.restaurant_table_id, row.status)"
                  >
                    Corregir estado…
                  </button>
                }
              </div>
            } @empty {
              <p class="col-span-full text-[#1F2422]/60">Sin mesas registradas.</p>
            }
          </div>
        }
      </section>
    </div>

    <dialog #openDialog class="rounded-2xl p-6 shadow-xl backdrop:bg-[#1F2422]/40">
      <h2 class="text-lg font-semibold text-[#1F2422]">Abrir cuenta</h2>

      <form class="mt-4 space-y-4 w-72" (submit)="onOpenAccount($event)">
        <label class="block">
          <span class="text-sm text-[#1F2422]/70">Comensales</span>
          <input
            type="number"
            class="mt-1 w-full rounded-lg border border-[#1F2422]/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6F5E]/30"
            [formField]="openForm.guest_count"
          />
        </label>
        @if (openForm.guest_count().touched() && openForm.guest_count().invalid()) {
          @for (error of openForm.guest_count().errors(); track error) {
            <p class="text-sm text-[#B5482A]">{{ error.message }}</p>
          }
        }

        @if (openError()) {
          <p class="text-sm text-[#B5482A]">{{ openError() }}</p>
          @if (openErrorAction()) {
            <p class="text-sm text-[#1F2422]/60">Sugerencia: {{ openErrorAction() }}</p>
          }
        }

        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="rounded-lg px-4 py-2 text-sm text-[#1F2422]/70 hover:bg-[#FAF9F6] transition-colors"
            (click)="closeOpenDialog()"
          >
            Cancelar
          </button>
          <button
            type="submit"
            class="rounded-lg bg-[#2F6F5E] px-4 py-2 text-white text-sm font-medium hover:bg-[#26594B] transition-colors disabled:opacity-40"
            [disabled]="openForm().invalid() || openForm().submitting()"
          >
            Abrir cuenta
          </button>
        </div>
      </form>
    </dialog>

    <dialog #statusDialog class="rounded-2xl p-6 shadow-xl backdrop:bg-[#1F2422]/40">
      <h2 class="text-lg font-semibold text-[#1F2422]">Corregir estado de la mesa</h2>
      <p class="mt-1 text-sm text-[#1F2422]/60">
        Uselo solo cuando la mesa quedo en un estado que no corresponde (por ejemplo, el
        cliente se fue sin avisar).
      </p>

      <div class="mt-4 space-y-4 w-72">
        <label class="block">
          <span class="text-sm text-[#1F2422]/70">Nuevo estado</span>
          <select
            class="mt-1 w-full rounded-lg border border-[#1F2422]/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6F5E]/30"
            [value]="pendingTargetStatus()"
            (change)="pendingTargetStatus.set($any($event.target).value)"
          >
            @for (target of pendingTransitions(); track target) {
              <option [value]="target">{{ STATUS_LABEL[target] }}</option>
            }
          </select>
        </label>

        @if (statusError()) {
          <p class="text-sm text-[#B5482A]">{{ statusError() }}</p>
        }

        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="rounded-lg px-4 py-2 text-sm text-[#1F2422]/70 hover:bg-[#FAF9F6] transition-colors"
            (click)="closeStatusDialog()"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="rounded-lg bg-[#2F6F5E] px-4 py-2 text-white text-sm font-medium hover:bg-[#26594B] transition-colors disabled:opacity-40"
            [disabled]="!pendingTargetStatus()"
            (click)="onChangeStatus()"
          >
            Aplicar
          </button>
        </div>
      </div>
    </dialog>
  `,
})
export class TableMapPage {
  protected readonly tables = inject(TablesService);
  private readonly router = inject(Router);

  protected readonly STATUS_LABEL = STATUS_LABEL;
  protected readonly STATUS_BAR = STATUS_BAR;
  protected readonly STATUS_DOT = STATUS_DOT;
  protected readonly formatCurrency = formatCurrency;
  protected readonly formatDateTime = formatDateTime;

  protected readonly freeCount = () =>
    this.tables.floorPlan.value().filter((row) => row.status === 'FREE').length;
  protected readonly occupiedCount = () =>
    this.tables.floorPlan.value().filter((row) => row.status === 'OCCUPIED' || row.status === 'BILL_REQUESTED')
      .length;

  protected floorPlanError(): string {
    return messageFor(this.tables.floorPlan.error());
  }

  /**
   * Respaldo del bug confirmado de GET /floor-plan (ver tables.service.ts): cuando una
   * mesa OCCUPIED/BILL_REQUESTED no trae `open_account`, se busca la cuenta real via
   * GET /accounts?tableId=X en vez de asumir que la mesa quedo mal de verdad.
   */
  private readonly fallbackAccounts = signal<Map<number, OpenAccountSummary>>(new Map());
  private readonly resolvingTables = signal<Set<number>>(new Set());

  constructor() {
    effect(() => {
      for (const row of this.tables.floorPlan.value()) {
        const needsFallback =
          (row.status === 'OCCUPIED' || row.status === 'BILL_REQUESTED') && !row.open_account;

        if (
          needsFallback &&
          !this.fallbackAccounts().has(row.restaurant_table_id) &&
          !this.resolvingTables().has(row.restaurant_table_id)
        ) {
          void this.resolveFallbackAccount(row.restaurant_table_id);
        }
      }
    });
  }

  private async resolveFallbackAccount(tableId: number): Promise<void> {
    this.resolvingTables.update((set) => new Set(set).add(tableId));
    try {
      const account = await this.tables.findOpenAccountForTable(tableId);
      if (account) {
        this.fallbackAccounts.update((map) =>
          new Map(map).set(tableId, {
            table_account_id: account.table_account_id,
            waiter_name: account.waiter_name,
            opened_at: account.opened_at,
            running_total: account.running_total,
          }),
        );
      }
    } finally {
      this.resolvingTables.update((set) => {
        const next = new Set(set);
        next.delete(tableId);
        return next;
      });
    }
  }

  protected openAccountOf(row: FloorPlanRow): OpenAccountSummary | null {
    return row.open_account ?? this.fallbackAccounts().get(row.restaurant_table_id) ?? null;
  }

  protected isResolvingAccount(tableId: number): boolean {
    return this.resolvingTables().has(tableId);
  }

  // --- Abrir cuenta ---

  private readonly openDialog = viewChild.required<ElementRef<HTMLDialogElement>>('openDialog');
  private pendingTableId: number | null = null;

  protected readonly openError = signal<string | null>(null);
  protected readonly openErrorAction = signal<string | null>(null);

  protected readonly openModel = signal({ guest_count: 1 });
  protected readonly openForm = form(this.openModel, (path) => {
    required(path.guest_count, { message: 'Indique cuantos comensales son' });
    min(path.guest_count, 1, { message: 'Minimo 1 comensal' });
    max(path.guest_count, 50, { message: 'Maximo 50 comensales' });
  });

  protected openAccountDialog(tableId: number): void {
    this.pendingTableId = tableId;
    this.openError.set(null);
    this.openErrorAction.set(null);
    this.openModel.set({ guest_count: 1 });
    this.openDialog().nativeElement.showModal();
  }

  protected closeOpenDialog(): void {
    this.openDialog().nativeElement.close();
  }

  protected onOpenAccount(event: Event): void {
    event.preventDefault();
    this.openError.set(null);
    this.openErrorAction.set(null);

    const tableId = this.pendingTableId;
    if (!tableId) return;

    submit(this.openForm, {
      action: async () => {
        try {
          const account = await this.tables.openAccount({
            table_id: tableId,
            guest_count: this.openModel().guest_count,
          });
          this.closeOpenDialog();
          await this.router.navigate(['/mesas', account.table_account_id]);
        } catch (error) {
          this.openError.set(messageFor(error));
          this.openErrorAction.set(actionLabelFor(error));
        }

        return undefined;
      },
    });
  }

  // --- Corregir estado manual ---

  private readonly statusDialog = viewChild.required<ElementRef<HTMLDialogElement>>('statusDialog');
  private pendingStatusTableId: number | null = null;

  protected readonly pendingTransitions = signal<TableStatus[]>([]);
  protected readonly pendingTargetStatus = signal<TableStatus | ''>('');
  protected readonly statusError = signal<string | null>(null);

  protected openStatusDialog(tableId: number, currentStatus: TableStatus): void {
    this.pendingStatusTableId = tableId;
    this.statusError.set(null);
    const transitions = VALID_TRANSITIONS[currentStatus];
    this.pendingTransitions.set(transitions);
    this.pendingTargetStatus.set(transitions[0] ?? '');
    this.statusDialog().nativeElement.showModal();
  }

  protected closeStatusDialog(): void {
    this.statusDialog().nativeElement.close();
  }

  protected async onChangeStatus(): Promise<void> {
    this.statusError.set(null);

    const tableId = this.pendingStatusTableId;
    const target = this.pendingTargetStatus();
    if (!tableId || !target) return;

    try {
      await this.tables.changeTableStatus(tableId, { status: target });
      this.closeStatusDialog();
    } catch (error) {
      this.statusError.set(messageFor(error));
    }
  }
}
