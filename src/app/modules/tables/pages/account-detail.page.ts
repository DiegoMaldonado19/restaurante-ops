import { Component, computed, effect, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { form, FormField, max, min, submit } from '@angular/forms/signals';
import { TablesService } from '../tables.service';
import { messageFor, actionLabelFor } from '../../../core/error-messages';
import { formatCurrency, formatDateTime } from '../../../core/format';
import {
  ACCOUNT_STATUS_LABEL,
  ORDER_ITEM_STATUS_LABEL,
  OrderItemViewLite,
  SplitLine,
  TableAccountView,
} from '../tables.types';

/** Grupos disponibles para "Dividir por ítem". Alcanza de sobra para una mesa de ops. */
const ITEM_SPLIT_GROUPS = [1, 2, 3, 4, 5, 6, 7, 8];

@Component({
  selector: 'app-account-detail',
  imports: [FormField, RouterLink],
  template: `
    <div class="min-h-full bg-[#FAF9F6] -m-6 p-6">
      <a routerLink="/mesas" class="text-sm text-[#1F2422]/50 hover:text-[#1F2422]">← Mapa de mesas</a>

      @if (loading()) {
        <p class="mt-4 text-[#1F2422]/60">Cargando cuenta...</p>
      } @else if (loadError()) {
        <p class="mt-4 text-sm text-[#B5482A]">{{ loadError() }}</p>
      } @else if (account(); as acc) {
        <header class="mt-4 mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 class="text-2xl font-semibold text-[#1F2422]">
              Mesa {{ tableNumber() ?? acc.restaurant_table_id }}
            </h1>
            <p class="mt-1 text-sm text-[#1F2422]/60">
              Atiende {{ acc.waiter_name }} · {{ acc.guest_count }} comensales · desde
              {{ formatDateTime(acc.opened_at) }}
            </p>
          </div>
          <div class="text-right">
            <span class="inline-flex rounded-full bg-[#1F2422]/[0.05] px-3 py-1 text-xs font-medium text-[#1F2422]/70">
              {{ ACCOUNT_STATUS_LABEL[acc.status] }}
            </span>
            <p class="mt-2 text-2xl font-semibold text-[#1F2422]">{{ formatCurrency(acc.running_total) }}</p>
            <p class="text-xs text-[#1F2422]/50">Total acumulado</p>
          </div>
        </header>

        <div class="flex flex-wrap gap-2">
          <a
            [routerLink]="['/comandas', acc.table_account_id, 'nueva']"
            class="rounded-lg bg-[#2F6F5E] px-4 py-2 text-white text-sm font-medium hover:bg-[#26594B] transition-colors"
          >
            Agregar ronda
          </a>
          @if (acc.status === 'OPEN') {
            <button
              type="button"
              class="rounded-lg border border-[#1F2422]/15 px-4 py-2 text-sm text-[#1F2422]/70 hover:bg-[#1F2422]/5 transition-colors"
              (click)="openTransferDialog()"
            >
              Transferir
            </button>
            <button
              type="button"
              class="rounded-lg border border-[#1F2422]/15 px-4 py-2 text-sm text-[#1F2422]/70 hover:bg-[#1F2422]/5 transition-colors"
              (click)="openMergeDialog()"
            >
              Fusionar
            </button>
            <button
              type="button"
              class="rounded-lg border border-[#1F2422]/15 px-4 py-2 text-sm text-[#1F2422]/70 hover:bg-[#1F2422]/5 transition-colors"
              (click)="openSplitDialog()"
            >
              Dividir cuenta
            </button>
            <button
              type="button"
              class="rounded-lg bg-[#C98A2E] px-4 py-2 text-white text-sm font-medium hover:bg-[#B37A26] transition-colors disabled:opacity-40"
              [disabled]="requestBillPending() || hasNoOrders()"
              (click)="onRequestBill()"
            >
              Pedir la cuenta
            </button>
          }
        </div>

              @if (hasNoOrders() && acc.status === 'OPEN') {
          <p class="mt-2 text-xs text-[#1F2422]/50">
            No se puede pedir la cuenta sin haber enviado al menos una ronda.
          </p>
        }

        @if (requestBillError()) {
          <p class="mt-3 text-sm text-[#B5482A]">{{ requestBillError() }}</p>
        }

        <section class="mt-6 rounded-2xl bg-white border border-[#1F2422]/10 p-6 max-w-3xl">
          <h2 class="text-xs font-semibold uppercase tracking-wider text-[#1F2422]/50">Rondas</h2>

          @for (ticket of acc.tickets; track ticket.order_ticket_id) {
            <div class="mt-4 rounded-lg border border-[#1F2422]/10 p-4">
              <p class="flex items-center justify-between text-sm">
                <span class="font-medium text-[#1F2422]">{{ formatDateTime(ticket.submitted_at) }}</span>
                <span class="text-[#1F2422]/50">{{ ORDER_ITEM_STATUS_LABEL[ticket.derived_status] }}</span>
              </p>
              <ul class="mt-2 divide-y divide-[#1F2422]/10">
                @for (item of ticket.items; track item.order_item_id) {
                  <li class="flex items-center justify-between py-2 text-sm">
                    <span class="text-[#1F2422]">
                      {{ item.quantity }}× {{ item.dish_name }}
                      @if (item.overdue) {
                        <span class="ml-1 text-xs font-medium text-[#B5482A]">· con retraso</span>
                      }
                    </span>
                    <span class="text-[#1F2422]/60">
                      {{ formatCurrency(item.unit_price * item.quantity) }}
                      · {{ ORDER_ITEM_STATUS_LABEL[item.status] }}
                    </span>
                  </li>
                }
              </ul>
            </div>
          } @empty {
            <p class="mt-3 text-[#1F2422]/60">Sin rondas todavía. Agregue la primera.</p>
          }
        </section>

        @if (acc.splits && acc.splits.count > 0) {
          <section class="mt-6 rounded-2xl bg-white border border-[#1F2422]/10 p-6 max-w-3xl">
            <h2 class="text-xs font-semibold uppercase tracking-wider text-[#1F2422]/50">
              Sub-cuentas ({{ acc.splits.count }})
            </h2>
            <ul class="mt-3 divide-y divide-[#1F2422]/10">
              @for (split of listedSplits(); track split.account_split_id) {
                <li class="flex items-start justify-between gap-3 py-2 text-sm">
                  <div>
                    <p class="flex flex-wrap items-baseline gap-x-2 text-[#1F2422]">
                      <span>{{ split.label ?? 'Parte' }}</span>
                      <span class="font-medium">{{ formatCurrency(split.share_amount ?? 0) }}</span>
                    </p>
                    @if (split.items.length) {
                      <ul class="mt-1 space-y-0.5 text-xs text-[#1F2422]/60">
                        @for (item of split.items; track item.order_item_id) {
                          <li>{{ item.quantity }}× {{ item.dish_name }}</li>
                        }
                      </ul>
                    }
                  </div>
                  <button
                    type="button"
                    class="shrink-0 text-xs text-[#1F2422]/50 hover:text-[#B5482A] transition-colors"
                    (click)="onDeleteSplit(split.account_split_id)"
                  >
                    Deshacer
                  </button>
                </li>
              }
            </ul>
            @if (deleteSplitError()) {
              <p class="mt-2 text-sm text-[#B5482A]">{{ deleteSplitError() }}</p>
            }
          </section>
        }
      }
    </div>

    <dialog #transferDialog class="rounded-2xl p-6 shadow-xl backdrop:bg-[#1F2422]/40">
      <h2 class="text-lg font-semibold text-[#1F2422]">Transferir a otra mesa</h2>

      <div class="mt-4 w-72 space-y-4">
        <label class="block">
          <span class="text-sm text-[#1F2422]/70">Mesa destino</span>
          <select
            class="mt-1 w-full rounded-lg border border-[#1F2422]/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6F5E]/30"
            [value]="transferTarget()"
            (change)="transferTarget.set($any($event.target).value)"
          >
            <option value="">Seleccione una mesa libre</option>
            @for (row of freeTables(); track row.restaurant_table_id) {
              <option [value]="row.restaurant_table_id">
                Mesa {{ row.table_number }} · {{ row.capacity }} personas
              </option>
            }
          </select>
        </label>

        @if (transferError()) {
          <p class="text-sm text-[#B5482A]">{{ transferError() }}</p>
          @if (transferErrorAction()) {
            <p class="text-sm text-[#1F2422]/60">Sugerencia: {{ transferErrorAction() }}</p>
          }
        }

        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="rounded-lg px-4 py-2 text-sm text-[#1F2422]/70 hover:bg-[#FAF9F6] transition-colors"
            (click)="closeTransferDialog()"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="rounded-lg bg-[#2F6F5E] px-4 py-2 text-white text-sm font-medium hover:bg-[#26594B] transition-colors disabled:opacity-40"
            [disabled]="!transferTarget()"
            (click)="onTransfer()"
          >
            Transferir
          </button>
        </div>
      </div>
    </dialog>

    <dialog #mergeDialog class="rounded-2xl p-6 shadow-xl backdrop:bg-[#1F2422]/40">
      <h2 class="text-lg font-semibold text-[#1F2422]">Fusionar con otra cuenta abierta</h2>

      <div class="mt-4 w-80 space-y-4">
        <ul class="max-h-64 divide-y divide-[#1F2422]/10 overflow-auto rounded-lg border border-[#1F2422]/10">
          @for (candidate of mergeCandidates(); track candidate.table_account_id) {
            <li>
              <button
                type="button"
                class="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-[#FAF9F6] transition-colors"
                [class]="mergeSourceId() === candidate.table_account_id ? 'bg-[#3B7A57]/10' : ''"
                (click)="mergeSourceId.set(candidate.table_account_id)"
              >
                <span class="text-[#1F2422]">
                  Mesa {{ tableNumberOf(candidate.restaurant_table_id) }} · {{ candidate.waiter_name }}
                </span>
                <span class="text-[#1F2422]/60">{{ formatCurrency(candidate.running_total) }}</span>
              </button>
            </li>
          } @empty {
            <li class="px-3 py-3 text-sm text-[#1F2422]/50">No hay otras cuentas abiertas.</li>
          }
        </ul>

        @if (mergeError()) {
          <p class="text-sm text-[#B5482A]">{{ mergeError() }}</p>
        }

        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="rounded-lg px-4 py-2 text-sm text-[#1F2422]/70 hover:bg-[#FAF9F6] transition-colors"
            (click)="closeMergeDialog()"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="rounded-lg bg-[#2F6F5E] px-4 py-2 text-white text-sm font-medium hover:bg-[#26594B] transition-colors disabled:opacity-40"
            [disabled]="!mergeSourceId()"
            (click)="onMerge()"
          >
            Fusionar
          </button>
        </div>
      </div>
    </dialog>

    <dialog #splitDialog class="rounded-2xl p-6 shadow-xl backdrop:bg-[#1F2422]/40">
      <h2 class="text-lg font-semibold text-[#1F2422]">Dividir cuenta</h2>

      <div class="mt-4 w-96 space-y-4">
        <label class="block">
          <span class="text-sm text-[#1F2422]/70">Modo</span>
          <select
            class="mt-1 w-full rounded-lg border border-[#1F2422]/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6F5E]/30"
            [value]="splitMode()"
            (change)="splitMode.set($any($event.target).value)"
          >
            <option value="BY_PERSON">Por persona (partes iguales)</option>
            <option value="BY_ITEM">Por ítem (cada platillo a su parte)</option>
          </select>
        </label>

        @if (splitMode() === 'BY_PERSON') {
          <label class="block">
            <span class="text-sm text-[#1F2422]/70">Cuántas personas</span>
            <input
              type="number"
              class="mt-1 w-32 rounded-lg border border-[#1F2422]/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6F5E]/30"
              [formField]="personCountForm.person_count"
            />
          </label>
          @if (personCountForm.person_count().touched() && personCountForm.person_count().invalid()) {
            @for (error of personCountForm.person_count().errors(); track error) {
              <p class="text-sm text-[#B5482A]">{{ error.message }}</p>
            }
          }
        } @else {
          <p class="text-sm text-[#1F2422]/60">
            Asigne cada platillo a una parte. Cada parte se cobra por separado desde Cobro.
          </p>
          <ul class="max-h-64 divide-y divide-[#1F2422]/10 overflow-auto rounded-lg border border-[#1F2422]/10">
            @for (item of deliverableItems(); track item.order_item_id) {
              <li class="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span class="text-[#1F2422]">{{ item.quantity }}× {{ item.dish_name }}</span>
                <select
                  class="rounded-lg border border-[#1F2422]/15 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6F5E]/30"
                  [value]="itemGroupOf(item.order_item_id)"
                  (change)="setItemGroup(item.order_item_id, $any($event.target).value)"
                >
                  <option value="0">Sin asignar</option>
                  @for (group of itemSplitGroups; track group) {
                    <option [value]="group">Parte {{ group }}</option>
                  }
                </select>
              </li>
            } @empty {
              <li class="px-3 py-3 text-sm text-[#1F2422]/50">No hay platillos para dividir.</li>
            }
          </ul>
        }

        @if (splitError()) {
          <p class="text-sm text-[#B5482A]">{{ splitError() }}</p>
        }

        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="rounded-lg px-4 py-2 text-sm text-[#1F2422]/70 hover:bg-[#FAF9F6] transition-colors"
            (click)="closeSplitDialog()"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="rounded-lg bg-[#2F6F5E] px-4 py-2 text-white text-sm font-medium hover:bg-[#26594B] transition-colors disabled:opacity-40"
            [disabled]="splitSubmitting()"
            (click)="onSplit()"
          >
            Dividir
          </button>
        </div>
      </div>
    </dialog>
  `,
})
export class AccountDetailPage {
  /** Llega de la ruta /mesas/:id por withComponentInputBinding. Es el table_account_id. */
  readonly id = input.required<string>();

  protected readonly tables = inject(TablesService);
  private readonly router = inject(Router);

  protected readonly ACCOUNT_STATUS_LABEL = ACCOUNT_STATUS_LABEL;
  protected readonly ORDER_ITEM_STATUS_LABEL = ORDER_ITEM_STATUS_LABEL;
  protected readonly itemSplitGroups = ITEM_SPLIT_GROUPS;
  protected readonly formatCurrency = formatCurrency;
  protected readonly formatDateTime = formatDateTime;

  protected readonly account = signal<TableAccountView | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);

  private readonly accountId = computed(() => Number(this.id()));

  constructor() {
    // input() no esta listo en el constructor (bug documentado en el carril de admin).
    // effect() corre despues de que el router asigna :id, y tambien si cambia la ruta.
    effect(() => {
      const id = this.accountId();
      if (!id) return;
      void this.load(id);
    });
  }

  private async load(accountId: number = this.accountId()): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    try {
      this.account.set(await this.tables.findAccount(accountId));
    } catch (error) {
      this.loadError.set(messageFor(error));
    } finally {
      this.loading.set(false);
    }
  }

  protected readonly tableNumber = computed(() => {
    const restaurantTableId = this.account()?.restaurant_table_id;
    return this.tableNumberOf(restaurantTableId);
  });

  protected tableNumberOf(restaurantTableId: number | undefined): number | null {
    if (!restaurantTableId) return null;
    return (
      this.tables.floorPlan.value().find((row) => row.restaurant_table_id === restaurantTableId)
        ?.table_number ?? null
    );
  }

  /** Todos los items de todas las rondas, sin filtrar. */
  private readonly allItems = computed<OrderItemViewLite[]>(
    () => this.account()?.tickets?.flatMap((ticket) => ticket.items) ?? [],
  );
  /** No se puede pedir la cuenta si todavia no se envio ninguna ronda. */
  protected readonly hasNoOrders = computed(() => this.allItems().length === 0);
  /** Candidatos para "Dividir por ítem": entregables, sin cancelar ni no-disponibles. */
  protected readonly deliverableItems = computed(() =>
    this.allItems().filter((item) => item.status !== 'CANCELLED' && item.status !== 'UNAVAILABLE'),
  );

  protected readonly hasPendingItems = computed(() =>
    this.deliverableItems().some((item) => item.status !== 'DELIVERED'),
  );

  /** Fuente de verdad nativa (GET /accounts/{id}.splits.accounts). Sobrevive a recargar. */
  protected readonly listedSplits = computed(
    () => this.account()?.splits?.accounts ?? [],
  );

  // --- Transferir ---

  private readonly transferDialog = viewChild.required<ElementRef<HTMLDialogElement>>('transferDialog');
  protected readonly freeTables = computed(() =>
    this.tables.floorPlan.value().filter((row) => row.status === 'FREE'),
  );
  protected readonly transferTarget = signal<number | ''>('');
  protected readonly transferError = signal<string | null>(null);
  protected readonly transferErrorAction = signal<string | null>(null);

  protected openTransferDialog(): void {
    this.transferTarget.set('');
    this.transferError.set(null);
    this.transferErrorAction.set(null);
    this.transferDialog().nativeElement.showModal();
  }

  protected closeTransferDialog(): void {
    this.transferDialog().nativeElement.close();
  }

  protected async onTransfer(): Promise<void> {
    const targetTableId = Number(this.transferTarget());
    if (!targetTableId) return;

    this.transferError.set(null);
    this.transferErrorAction.set(null);
    try {
      this.account.set(await this.tables.transfer(this.accountId(), { target_table_id: targetTableId }));
      this.closeTransferDialog();
    } catch (error) {
      this.transferError.set(messageFor(error));
      this.transferErrorAction.set(actionLabelFor(error));
    }
  }

  // --- Fusionar ---

  private readonly mergeDialog = viewChild.required<ElementRef<HTMLDialogElement>>('mergeDialog');
  protected readonly mergeCandidates = computed(() =>
    this.tables.openAccounts.value().filter((acc) => acc.table_account_id !== this.accountId()),
  );
  protected readonly mergeSourceId = signal<number | ''>('');
  protected readonly mergeError = signal<string | null>(null);

  protected openMergeDialog(): void {
    this.mergeSourceId.set('');
    this.mergeError.set(null);
    this.tables.openAccounts.reload();
    this.mergeDialog().nativeElement.showModal();
  }

  protected closeMergeDialog(): void {
    this.mergeDialog().nativeElement.close();
  }

  protected async onMerge(): Promise<void> {
    const sourceAccountId = Number(this.mergeSourceId());
    if (!sourceAccountId) return;

    this.mergeError.set(null);
    try {
      this.account.set(
        await this.tables.merge(this.accountId(), { source_account_id: sourceAccountId }),
      );
      this.closeMergeDialog();
    } catch (error) {
      this.mergeError.set(messageFor(error));
    }
  }

  // --- Dividir cuenta ---

  private readonly splitDialog = viewChild.required<ElementRef<HTMLDialogElement>>('splitDialog');
  protected readonly splitMode = signal<'BY_PERSON' | 'BY_ITEM'>('BY_PERSON');
  protected readonly splitError = signal<string | null>(null);
  protected readonly splitSubmitting = signal(false);
  protected readonly deleteSplitError = signal<string | null>(null);

  protected readonly personCountModel = signal({ person_count: 2 });
  protected readonly personCountForm = form(this.personCountModel, (path) => {
    min(path.person_count, 2, { message: 'Mínimo 2 personas' });
    max(path.person_count, 10, { message: 'Máximo 10 personas' });
  });

  private readonly itemGroupAssignments = signal<Record<number, number>>({});

  protected itemGroupOf(orderItemId: number): number {
    return this.itemGroupAssignments()[orderItemId] ?? 0;
  }

  protected setItemGroup(orderItemId: number, groupRaw: string): void {
    const group = Number(groupRaw);
    this.itemGroupAssignments.update((current) => ({ ...current, [orderItemId]: group }));
  }

  protected openSplitDialog(): void {
    this.splitMode.set('BY_PERSON');
    this.personCountModel.set({ person_count: 2 });
    this.itemGroupAssignments.set({});
    this.splitError.set(null);
    this.splitDialog().nativeElement.showModal();
  }

  protected closeSplitDialog(): void {
    this.splitDialog().nativeElement.close();
  }

  protected async onSplit(): Promise<void> {
    this.splitError.set(null);

    if (this.splitMode() === 'BY_PERSON') {
      submit(this.personCountForm, {
        action: async () => {
          await this.runSplit({
            mode: 'BY_PERSON',
            person_count: this.personCountModel().person_count,
            items: [],
          });
          return undefined;
        },
      });
      return;
    }

    const assignments = this.itemGroupAssignments();
    const items: SplitLine[] = this.deliverableItems()
      .filter((item) => assignments[item.order_item_id])
      .map((item) => ({
        order_item_id: item.order_item_id,
        account_split_id: assignments[item.order_item_id],
      }));

    if (items.length === 0) {
      this.splitError.set('Asigne al menos un platillo a una parte.');
      return;
    }

    await this.runSplit({ mode: 'BY_ITEM', items });
  }

  private async runSplit(request: {
    mode: 'BY_PERSON' | 'BY_ITEM';
    person_count?: number;
    items: SplitLine[];
  }): Promise<void> {
    this.splitSubmitting.set(true);
    try {
      await this.tables.split(this.accountId(), request);
      await this.load();
      this.closeSplitDialog();
    } catch (error) {
      this.splitError.set(messageFor(error));
    } finally {
      this.splitSubmitting.set(false);
    }
  }

  protected async onDeleteSplit(splitId: number): Promise<void> {
    this.deleteSplitError.set(null);
    try {
      await this.tables.deleteSplit(splitId);
      await this.load();
    } catch (error) {
      this.deleteSplitError.set(messageFor(error));
    }
  }

  // --- Pedir la cuenta ---

  protected readonly requestBillPending = signal(false);
  protected readonly requestBillError = signal<string | null>(null);

  protected async onRequestBill(): Promise<void> {
    this.requestBillError.set(null);
    this.requestBillPending.set(true);
    try {
      this.account.set(await this.tables.requestBill(this.accountId()));
      await this.router.navigate(['/mesas']);
    } catch (error) {
      this.requestBillError.set(messageFor(error));
    } finally {
      this.requestBillPending.set(false);
    }
  }
}
