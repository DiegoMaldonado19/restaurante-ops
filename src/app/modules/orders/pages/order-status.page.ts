import { isPlatformBrowser } from '@angular/common';
import { Component, computed, ElementRef, inject, PLATFORM_ID, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { interval } from 'rxjs';
import { actionLabelFor, messageFor } from '../../../core/error-messages';
import { OrdersService } from '../orders.service';
import { TablesService } from '../../tables/tables.service';
import { OverdueBadge } from '../components/overdue-badge';
import {
  ORDER_ITEM_STATUS_LABEL,
  OrderItemStatus,
  OrderItemView,
  UpdateOrderItemRequest,
} from '../orders.types';

const QUEUE_STATUSES: OrderItemStatus[] = ['RECEIVED', 'IN_PREPARATION', 'READY'];
const STATUS_RANK: Record<OrderItemStatus, number> = {
  READY: 0,
  IN_PREPARATION: 1,
  RECEIVED: 2,
  DELIVERED: 3,
  UNAVAILABLE: 4,
  CANCELLED: 5,
};

interface AccountGroup {
  key: string;
  accountId: number | null;
  tableNumber: number | null;
  items: OrderItemView[];
}

@Component({
  selector: 'app-order-status',
  imports: [RouterLink, OverdueBadge],
  template: `
    <div class="min-h-full bg-[#FAF9F6] -m-6 p-6">
      <header class="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 class="text-2xl font-semibold text-[#1F2422]">Mis platillos</h1>
          <p class="mt-1 text-sm text-[#1F2422]/60">
            Lo que envió a cocina en todas sus mesas. Se actualiza solo.
          </p>
        </div>
        <label class="inline-flex items-center gap-2 text-sm text-[#1F2422]">
          <input
            type="checkbox"
            class="h-4 w-4 accent-[#B5482A]"
            [checked]="orders.overdueOnly()"
            (change)="orders.overdueOnly.set($any($event.target).checked)"
          />
          Solo vencidos
        </label>
      </header>

      @if (actionError()) {
        <p class="mb-4 text-sm text-[#B5482A]">
          {{ actionError() }}
          @if (actionErrorLabel()) {
            <span class="ml-1 text-[#1F2422]/60">· {{ actionErrorLabel() }}</span>
          }
        </p>
      }

      @if (orders.myQueue.isLoading() && !groups().length) {
        <p class="text-[#1F2422]/60">Cargando comandas...</p>
      } @else if (orders.myQueue.error()) {
        <p class="text-sm text-[#B5482A]">{{ queueError() }}</p>
      } @else {
        @for (group of groups(); track group.key) {
          <section class="mb-6 rounded-2xl bg-white border border-[#1F2422]/10 p-6 max-w-3xl">
            <div class="flex items-center justify-between gap-3">
              <h2 class="text-xs font-semibold uppercase tracking-wider text-[#1F2422]/50">
                @if (group.tableNumber != null && group.accountId != null) {
                  Mesa {{ group.tableNumber }}
                } @else {
                  Otras comandas
                }
              </h2>
              @if (group.accountId != null) {
                <a
                  [routerLink]="['/mesas', group.accountId]"
                  class="text-sm text-[#2F6F5E] hover:underline"
                >
                  Ver cuenta
                </a>
              }
            </div>

            <ul class="mt-3 divide-y divide-[#1F2422]/10">
              @for (item of group.items; track item.order_item_id) {
                <li
                  class="py-3"
                  [class]="itemOverdue(item) ? 'border-l-4 border-l-[#B5482A] pl-3 -ml-3' : ''"
                >
                  <div class="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p class="text-sm font-medium text-[#1F2422]">
                        {{ item.quantity }}× {{ dishName(item) }}
                      </p>
                      @if (item.modifiers.length) {
                        <p class="mt-0.5 text-xs text-[#1F2422]/50">
                          {{ modifierNames(item) }}
                        </p>
                      }
                      @if (item.note) {
                        <p class="mt-0.5 text-xs text-[#1F2422]/60">Nota: {{ item.note }}</p>
                      }
                      <p class="mt-1 text-xs" [class]="statusClass(item.status)">
                        {{ statusHint(item.status) }}
                      </p>
                    </div>
                    <div class="flex flex-col items-end gap-1">
                      <span class="text-xs text-[#1F2422]/50">
                        {{ ORDER_ITEM_STATUS_LABEL[item.status] }}
                        · {{ minutesWaiting(item.submitted_at) }} min
                      </span>
                      <app-overdue-badge [overdue]="itemOverdue(item)" [minutes]="minutesWaiting(item.submitted_at)" />
                    </div>
                  </div>

                  <div class="mt-2 flex flex-wrap gap-2">
                    @if (item.status === 'READY') {
                      <button
                        type="button"
                        class="rounded-lg bg-[#2F6F5E] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#26594B] transition-colors disabled:opacity-40"
                        [disabled]="busyId() === item.order_item_id"
                        (click)="onDeliver(item.order_item_id)"
                      >
                        Marcar entregado
                      </button>
                    }
                    @if (item.status === 'RECEIVED') {
                      <button
                        type="button"
                        class="rounded-lg border border-[#1F2422]/15 px-3 py-1.5 text-xs text-[#1F2422]/70 hover:bg-[#1F2422]/5 transition-colors disabled:opacity-40"
                        [disabled]="busyId() === item.order_item_id"
                        (click)="openEdit(item)"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        class="rounded-lg border border-[#B5482A]/30 px-3 py-1.5 text-xs text-[#B5482A] hover:bg-[#B5482A]/5 transition-colors disabled:opacity-40"
                        [disabled]="busyId() === item.order_item_id"
                        (click)="openDelete(item)"
                      >
                        Quitar
                      </button>
                    }
                  </div>
                </li>
              }
            </ul>
          </section>
        } @empty {
          <p class="text-[#1F2422]/60">
            @if (orders.overdueOnly()) {
              No hay platillos vencidos en su cola.
            } @else {
              Todavía no ha enviado rondas. Ábralas desde una mesa.
            }
          </p>
        }
      }
    </div>

    <dialog #editDialog class="rounded-2xl p-6 shadow-xl backdrop:bg-[#1F2422]/40">
      <h2 class="text-lg font-semibold text-[#1F2422]">Editar platillo</h2>
      <p class="mt-1 text-sm text-[#1F2422]/60">{{ editingName() }}</p>
      <div class="mt-4 w-80 space-y-3">
        <label class="block">
          <span class="text-sm text-[#1F2422]/70">Cantidad</span>
          <input
            type="number"
            min="1"
            max="99"
            class="mt-1 w-24 rounded-lg border border-[#1F2422]/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6F5E]/30"
            [value]="editQuantity()"
            (input)="editQuantity.set(clampQuantity($any($event.target).value))"
          />
        </label>
        <label class="block">
          <span class="text-sm text-[#1F2422]/70">Nota</span>
          <textarea
            maxlength="255"
            rows="3"
            class="mt-1 w-full rounded-lg border border-[#1F2422]/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6F5E]/30"
            [value]="editNote()"
            (input)="editNote.set($any($event.target).value.slice(0, 255))"
          ></textarea>
        </label>
        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="rounded-lg px-4 py-2 text-sm text-[#1F2422]/70 hover:bg-[#FAF9F6] transition-colors"
            (click)="closeEdit()"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="rounded-lg bg-[#2F6F5E] px-4 py-2 text-white text-sm font-medium hover:bg-[#26594B] transition-colors disabled:opacity-40"
            [disabled]="busyId() != null"
            (click)="onSaveEdit()"
          >
            Guardar
          </button>
        </div>
      </div>
    </dialog>

    <dialog #deleteDialog class="rounded-2xl p-6 shadow-xl backdrop:bg-[#1F2422]/40">
      <h2 class="text-lg font-semibold text-[#1F2422]">Quitar platillo</h2>
      <p class="mt-2 w-80 text-sm text-[#1F2422]/70">
        ¿Quitar {{ deletingName() }} de la ronda? Cocina dejará de verlo si todavía no lo empezó.
      </p>
      <div class="mt-4 flex justify-end gap-2">
        <button
          type="button"
          class="rounded-lg px-4 py-2 text-sm text-[#1F2422]/70 hover:bg-[#FAF9F6] transition-colors"
          (click)="closeDelete()"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="rounded-lg bg-[#B5482A] px-4 py-2 text-white text-sm font-medium hover:bg-[#9A3C24] transition-colors disabled:opacity-40"
          [disabled]="busyId() != null"
          (click)="onConfirmDelete()"
        >
          Quitar
        </button>
      </div>
    </dialog>
  `,
})
export class OrderStatusPage {
  protected readonly orders = inject(OrdersService);
  private readonly tables = inject(TablesService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly ORDER_ITEM_STATUS_LABEL = ORDER_ITEM_STATUS_LABEL;

  /** Fuerza a recalcular minutos / overdue en cada sondeo, aunque el JSON no cambie. */
  private readonly clock = signal(Date.now());

  protected readonly actionError = signal<string | null>(null);
  protected readonly actionErrorLabel = signal<string | null>(null);
  protected readonly busyId = signal<number | null>(null);

  private readonly editDialog = viewChild.required<ElementRef<HTMLDialogElement>>('editDialog');
  private readonly deleteDialog = viewChild.required<ElementRef<HTMLDialogElement>>('deleteDialog');
  private readonly editingItem = signal<OrderItemView | null>(null);
  private readonly deletingItem = signal<OrderItemView | null>(null);
  protected readonly editQuantity = signal(1);
  protected readonly editNote = signal('');

  protected readonly editingName = computed(() => {
    const item = this.editingItem();
    return item ? this.dishName(item) : '';
  });
  protected readonly deletingName = computed(() => {
    const item = this.deletingItem();
    return item ? `${item.quantity}× ${this.dishName(item)}` : '';
  });

  /** GET /orders no trae account_id: se cruza con las cuentas OPEN (tickets). */
  private readonly itemLocation = computed(() => {
    const map = new Map<number, { accountId: number; tableId: number }>();
    for (const account of this.tables.openAccounts.value()) {
      for (const ticket of account.tickets ?? []) {
        for (const item of ticket.items ?? []) {
          map.set(item.order_item_id, {
            accountId: account.table_account_id,
            tableId: account.restaurant_table_id,
          });
        }
      }
    }
    return map;
  });

  protected readonly groups = computed<AccountGroup[]>(() => {
    this.clock();
    const locations = this.itemLocation();
    const floor = this.tables.floorPlan.value();
    const tableNumberOf = (tableId: number) =>
      floor.find((row) => row.restaurant_table_id === tableId)?.table_number ?? tableId;

    const buckets = new Map<string, AccountGroup>();
    for (const item of this.visibleItems()) {
      const loc = locations.get(item.order_item_id);
      const key = loc ? String(loc.accountId) : 'other';
      const group = buckets.get(key) ?? {
        key,
        accountId: loc?.accountId ?? null,
        tableNumber: loc ? tableNumberOf(loc.tableId) : null,
        items: [],
      };
      group.items.push(item);
      buckets.set(key, group);
    }

    for (const group of buckets.values()) {
      group.items.sort((a, b) => {
        const rank = STATUS_RANK[a.status] - STATUS_RANK[b.status];
        if (rank !== 0) return rank;
        return Date.parse(b.submitted_at) - Date.parse(a.submitted_at);
      });
    }

    return [...buckets.values()].sort((a, b) => {
      if (a.accountId == null) return 1;
      if (b.accountId == null) return -1;
      return (a.tableNumber ?? 0) - (b.tableNumber ?? 0);
    });
  });

  constructor() {
    if (!this.isBrowser) return;
    interval(5_000)
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        this.clock.set(Date.now());
        this.orders.myQueue.reload();
        this.tables.openAccounts.reload();
      });
  }

  protected readonly queueError = computed(() => messageFor(this.orders.myQueue.error()));

  protected dishName(item: OrderItemView): string {
    return item.dish_name;
  }

  protected modifierNames(item: OrderItemView): string {
    return item.modifiers.map((mod) => mod.name).join(', ');
  }

  protected minutesWaiting(submittedAt: string): number {
    return Math.max(0, Math.floor((this.clock() - Date.parse(submittedAt)) / 60_000));
  }

  /** El atraso lo calcula el backend con prep_minutes del platillo mas su margen de gracia. */
  protected itemOverdue(item: OrderItemView): boolean {
    return item.overdue;
  }

  protected statusHint(status: OrderItemStatus): string {
    if (status === 'READY') return 'Listo para servir';
    if (status === 'RECEIVED' || status === 'IN_PREPARATION') return 'En cocina…';
    return ORDER_ITEM_STATUS_LABEL[status];
  }

  protected statusClass(status: OrderItemStatus): string {
    return status === 'READY' ? 'font-medium text-[#2F6F5E]' : 'text-[#1F2422]/50';
  }

  protected clampQuantity(raw: string): number {
    return Math.min(99, Math.max(1, Math.floor(Number(raw) || 1)));
  }

  protected openEdit(item: OrderItemView): void {
    this.editingItem.set(item);
    this.editQuantity.set(item.quantity);
    this.editNote.set(item.note ?? '');
    this.editDialog().nativeElement.showModal();
  }

  protected closeEdit(): void {
    this.editDialog().nativeElement.close();
    this.editingItem.set(null);
  }

  protected openDelete(item: OrderItemView): void {
    this.deletingItem.set(item);
    this.deleteDialog().nativeElement.showModal();
  }

  protected closeDelete(): void {
    this.deleteDialog().nativeElement.close();
    this.deletingItem.set(null);
  }

  protected async onDeliver(itemId: number): Promise<void> {
    await this.runAction(itemId, () => this.orders.markDelivered(itemId));
  }

  protected async onSaveEdit(): Promise<void> {
    const item = this.editingItem();
    if (!item) return;
    const request: UpdateOrderItemRequest = {
      quantity: this.editQuantity(),
      note: this.editNote().trim() || undefined,
    };
    const ok = await this.runAction(item.order_item_id, () => this.orders.updateItem(item.order_item_id, request));
    if (ok) this.closeEdit();
  }

  protected async onConfirmDelete(): Promise<void> {
    const item = this.deletingItem();
    if (!item) return;
    const ok = await this.runAction(item.order_item_id, () => this.orders.deleteItem(item.order_item_id));
    if (ok) this.closeDelete();
  }

  private visibleItems(): OrderItemView[] {
    // GET /orders sin status trae historial DELIVERED de dias atras; el mesero
    // opera sobre la cola viva. Entregados/cancelados no se listan aqui.
    // overdue=true lo recorta el servidor (httpResource); aqui no se vuelve a filtrar.
    return this.orders.myQueue.value().filter((item) => QUEUE_STATUSES.includes(item.status));
  }

  private async runAction(itemId: number, work: () => Promise<unknown>): Promise<boolean> {
    this.actionError.set(null);
    this.actionErrorLabel.set(null);
    this.busyId.set(itemId);
    try {
      await work();
      return true;
    } catch (error) {
      this.actionError.set(messageFor(error));
      this.actionErrorLabel.set(actionLabelFor(error));
      return false;
    } finally {
      this.busyId.set(null);
    }
  }
}
