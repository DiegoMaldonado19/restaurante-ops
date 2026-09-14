import { isPlatformBrowser } from '@angular/common';
import { Component, computed, ElementRef, inject, PLATFORM_ID, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { messageFor } from '../../../core/error-messages';
import { OverdueBadge } from '../../orders/components/overdue-badge';
import { KitchenService } from '../kitchen.service';
import { KitchenItemView } from '../kitchen.types';

/** Mismo criterio que /comandas (PENDINGS #13). */
const OVERDUE_GRACE_MINUTES = 5;
const DEFAULT_PREP_MINUTES = 15;

@Component({
  selector: 'app-kitchen-queue',
  imports: [OverdueBadge],
  template: `
    <div class="min-h-full bg-[#FAF9F6] -m-6 p-6">
      <header class="mb-6">
        <h1 class="text-2xl font-semibold text-[#1F2422]">Cocina</h1>
        <p class="mt-1 text-sm text-[#1F2422]/60">
          La más antigua primero. Se actualiza sola.
        </p>
      </header>

      @if (actionError()) {
        <p class="mb-4 text-sm text-[#B5482A]">{{ actionError() }}</p>
      }

      <section class="mb-6 rounded-2xl bg-white border border-[#1F2422]/10 p-6 max-w-3xl">
        <h2 class="text-xs font-semibold uppercase tracking-wider text-[#1F2422]/50">
          Por atender
        </h2>
        @if (kitchen.received.isLoading() && !kitchen.received.value().length) {
          <p class="mt-3 text-[#1F2422]/60">Cargando cola...</p>
        } @else if (kitchen.received.error()) {
          <p class="mt-3 text-sm text-[#B5482A]">{{ receivedError() }}</p>
        } @else {
          <ul class="mt-3 divide-y divide-[#1F2422]/10">
            @for (item of kitchen.received.value(); track item.order_item_id) {
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
                      <p class="mt-0.5 text-xs text-[#1F2422]/50">{{ modifierNames(item) }}</p>
                    }
                    @if (item.note) {
                      <p class="mt-0.5 text-xs text-[#1F2422]/60">Nota: {{ item.note }}</p>
                    }
                    <p class="mt-1 text-xs text-[#1F2422]/50">
                      {{ minutesWaiting(item.submitted_at) }} min
                    </p>
                  </div>
                  <app-overdue-badge [overdue]="itemOverdue(item)" [minutes]="minutesWaiting(item.submitted_at)" />
                </div>
                <div class="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    class="rounded-lg bg-[#2F6F5E] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#26594B] transition-colors disabled:opacity-40"
                    [disabled]="busyId() === item.order_item_id"
                    (click)="onStart(item.order_item_id)"
                  >
                    Empezar a preparar
                  </button>
                  <button
                    type="button"
                    class="rounded-lg border border-[#B5482A]/30 px-3 py-1.5 text-xs text-[#B5482A] hover:bg-[#B5482A]/5 transition-colors disabled:opacity-40"
                    [disabled]="busyId() === item.order_item_id"
                    (click)="openUnavailable(item)"
                  >
                    No disponible
                  </button>
                </div>
              </li>
            } @empty {
              <li class="py-3 text-sm text-[#1F2422]/50">No hay platillos por atender.</li>
            }
          </ul>
        }
      </section>

      <section class="rounded-2xl bg-white border border-[#1F2422]/10 p-6 max-w-3xl">
        <h2 class="text-xs font-semibold uppercase tracking-wider text-[#1F2422]/50">
          En preparación
        </h2>
        @if (kitchen.preparing.isLoading() && !kitchen.preparing.value().length) {
          <p class="mt-3 text-[#1F2422]/60">Cargando...</p>
        } @else if (kitchen.preparing.error()) {
          <p class="mt-3 text-sm text-[#B5482A]">{{ preparingError() }}</p>
        } @else {
          <ul class="mt-3 divide-y divide-[#1F2422]/10">
            @for (item of kitchen.preparing.value(); track item.order_item_id) {
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
                      <p class="mt-0.5 text-xs text-[#1F2422]/50">{{ modifierNames(item) }}</p>
                    }
                    @if (item.note) {
                      <p class="mt-0.5 text-xs text-[#1F2422]/60">Nota: {{ item.note }}</p>
                    }
                    <p class="mt-1 text-xs text-[#1F2422]/50">
                      {{ minutesWaiting(item.submitted_at) }} min
                    </p>
                  </div>
                  <app-overdue-badge [overdue]="itemOverdue(item)" [minutes]="minutesWaiting(item.submitted_at)" />
                </div>
                <button
                  type="button"
                  class="mt-2 rounded-lg bg-[#2F6F5E] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#26594B] transition-colors disabled:opacity-40"
                  [disabled]="busyId() === item.order_item_id"
                  (click)="onReady(item.order_item_id)"
                >
                  Marcar listo
                </button>
              </li>
            } @empty {
              <li class="py-3 text-sm text-[#1F2422]/50">Nada en preparación.</li>
            }
          </ul>
        }
      </section>
    </div>

    <dialog #unavailableDialog class="rounded-2xl p-6 shadow-xl backdrop:bg-[#1F2422]/40">
      <h2 class="text-lg font-semibold text-[#1F2422]">Marcar no disponible</h2>
      <p class="mt-2 w-80 text-sm text-[#1F2422]/70">
        ¿{{ pendingName() }} no se puede preparar? El ítem sale de la cola y se
        devuelve el stock. No se pide motivo.
      </p>
      <div class="mt-4 flex justify-end gap-2">
        <button
          type="button"
          class="rounded-lg px-4 py-2 text-sm text-[#1F2422]/70 hover:bg-[#FAF9F6] transition-colors"
          (click)="closeUnavailable()"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="rounded-lg bg-[#B5482A] px-4 py-2 text-white text-sm font-medium hover:bg-[#9A3C24] transition-colors disabled:opacity-40"
          [disabled]="busyId() != null"
          (click)="onConfirmUnavailable()"
        >
          No disponible
        </button>
      </div>
    </dialog>
  `,
})
export class KitchenQueuePage {
  protected readonly kitchen = inject(KitchenService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly clock = signal(Date.now());
  protected readonly actionError = signal<string | null>(null);
  protected readonly busyId = signal<number | null>(null);

  private readonly unavailableDialog = viewChild.required<ElementRef<HTMLDialogElement>>('unavailableDialog');
  private readonly pendingItem = signal<KitchenItemView | null>(null);

  protected readonly pendingName = computed(() => {
    const item = this.pendingItem();
    return item ? `${item.quantity}× ${this.dishName(item)}` : '';
  });

  private readonly dishById = computed(() => {
    const map = new Map<number, { name: string; prep_minutes: number }>();
    for (const dish of this.kitchen.menu.value().dishes) {
      map.set(dish.dish_id, { name: dish.name, prep_minutes: dish.prep_minutes });
    }
    return map;
  });

  protected readonly receivedError = computed(() => messageFor(this.kitchen.received.error()));
  protected readonly preparingError = computed(() => messageFor(this.kitchen.preparing.error()));

  constructor() {
    if (!this.isBrowser) return;
    interval(5_000)
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        this.clock.set(Date.now());
        this.kitchen.reloadQueue();
      });
  }

  protected dishName(item: KitchenItemView): string {
    if (item.dish_name && item.dish_name !== 'DishNamePlaceholder') {
      return item.dish_name;
    }
    return this.dishById().get(item.dish_id)?.name ?? item.dish_name;
  }

  protected modifierNames(item: KitchenItemView): string {
    return item.modifiers.map((mod) => mod.name).join(', ');
  }

  protected minutesWaiting(submittedAt: string): number {
    return Math.max(0, Math.floor((this.clock() - Date.parse(submittedAt)) / 60_000));
  }

  protected itemOverdue(item: KitchenItemView): boolean {
    this.clock();
    if (item.overdue) return true;
    const prep = this.dishById().get(item.dish_id)?.prep_minutes ?? DEFAULT_PREP_MINUTES;
    return this.minutesWaiting(item.submitted_at) > prep + OVERDUE_GRACE_MINUTES;
  }

  protected async onStart(itemId: number): Promise<void> {
    await this.runAction(itemId, () => this.kitchen.advance(itemId, 'IN_PREPARATION'));
  }

  protected async onReady(itemId: number): Promise<void> {
    await this.runAction(itemId, () => this.kitchen.advance(itemId, 'READY'));
  }

  protected openUnavailable(item: KitchenItemView): void {
    this.pendingItem.set(item);
    this.unavailableDialog().nativeElement.showModal();
  }

  protected closeUnavailable(): void {
    this.unavailableDialog().nativeElement.close();
    this.pendingItem.set(null);
  }

  protected async onConfirmUnavailable(): Promise<void> {
    const item = this.pendingItem();
    if (!item) return;
    const ok = await this.runAction(item.order_item_id, () =>
      this.kitchen.markUnavailable(item.order_item_id),
    );
    if (ok) this.closeUnavailable();
  }

  private async runAction(itemId: number, work: () => Promise<unknown>): Promise<boolean> {
    this.actionError.set(null);
    this.busyId.set(itemId);
    try {
      await work();
      return true;
    } catch (error) {
      this.actionError.set(messageFor(error));
      return false;
    } finally {
      this.busyId.set(null);
    }
  }
}
