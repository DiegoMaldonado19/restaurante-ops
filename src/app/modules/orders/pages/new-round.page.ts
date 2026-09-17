import { Component, computed, effect, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { OrdersService } from '../orders.service';
import { TablesService } from '../../tables/tables.service';
import { actionLabelFor, messageFor } from '../../../core/error-messages';
import { formatCurrency } from '../../../core/format';
import { MenuComboView, MenuDishView, ModifierBrief, OrderLineDTO } from '../orders.types';
import { TableAccountView } from '../../tables/tables.types';

/** Una linea es un platillo suelto (con sus modificadores) o un combo. Nunca las dos. */
interface CartLine {
  key: number;
  dish: MenuDishView | null;
  combo: MenuComboView | null;
  quantity: number;
  modifierIds: number[];
  note: string;
}

@Component({
  selector: 'app-new-round',
  imports: [RouterLink],
  template: `
    <div class="min-h-full bg-[#FAF9F6] -m-6 p-6">
      <a
        [routerLink]="['/mesas', accountId()]"
        class="text-sm text-[#1F2422]/50 hover:text-[#1F2422]"
      >
        ← Volver a la cuenta
      </a>

      <header class="mt-4 mb-6">
        <h1 class="text-2xl font-semibold text-[#1F2422]">
          Nueva ronda
          @if (tableNumber(); as number) {
            — Mesa {{ number }}
          }
        </h1>
        <p class="mt-1 text-sm text-[#1F2422]/60">
          Arme la ronda y envíela a cocina. El precio se congela al enviar.
        </p>
        @if (accountError()) {
          <p class="mt-2 text-sm text-[#B5482A]">{{ accountError() }}</p>
        }
      </header>

      <div class="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div class="space-y-6">
          <section class="rounded-2xl bg-white border border-[#1F2422]/10 p-6">
            <h2 class="text-xs font-semibold uppercase tracking-wider text-[#1F2422]/50">Menú</h2>

            @if (orders.menu.isLoading()) {
              <p class="mt-3 text-[#1F2422]/60">Cargando menú...</p>
            } @else if (orders.menu.error()) {
              <p class="mt-3 text-sm text-[#B5482A]">{{ menuError() }}</p>
            } @else {
              @for (group of dishesByCategory(); track group.category) {
                <h3 class="mt-5 text-sm font-medium text-[#1F2422]">{{ group.category }}</h3>
                <div class="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  @for (dish of group.dishes; track dish.dish_id) {
                    <button
                      type="button"
                      class="rounded-lg border border-[#1F2422]/10 p-4 text-left text-sm hover:bg-[#FAF9F6] transition-colors"
                      (click)="onPickDish(dish)"
                    >
                      <p class="font-semibold text-[#1F2422]">{{ dish.name }}</p>
                      <p class="mt-1 text-[#1F2422]/60">
                        {{ formatCurrency(dish.sale_price) }} · {{ dish.prep_minutes }} min
                      </p>
                    </button>
                  }
                </div>
              } @empty {
                <p class="mt-3 text-[#1F2422]/60">El menú no tiene platillos.</p>
              }
            }
          </section>

          <section class="rounded-2xl bg-white border border-[#1F2422]/10 p-6">
            <h2 class="text-xs font-semibold uppercase tracking-wider text-[#1F2422]/50">Combos</h2>
            @if (orders.menu.value().combos.length) {
              <div class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                @for (combo of orders.menu.value().combos; track combo.combo_id) {
                  <button
                    type="button"
                    class="rounded-lg border border-[#1F2422]/10 p-4 text-left text-sm hover:bg-[#FAF9F6] transition-colors"
                    (click)="onPickCombo(combo)"
                  >
                    <p class="font-semibold text-[#1F2422]">{{ combo.name }}</p>
                    <p class="mt-1 text-[#1F2422]/60">{{ formatCurrency(combo.combo_price) }}</p>
                    <p class="mt-1 text-xs text-[#1F2422]/50">
                      @for (item of combo.items; track item.dish_id; let last = $last) {
                        {{ item.quantity }}× {{ item.dish_name }}{{ last ? '' : ' + ' }}
                      }
                    </p>
                  </button>
                }
              </div>
            } @else {
              <p class="mt-2 text-sm text-[#1F2422]/40">No hay combos publicados en el menú.</p>
            }
          </section>
        </div>

        <aside class="rounded-2xl bg-white border border-[#1F2422]/10 p-6 h-fit lg:sticky lg:top-6">
          <h2 class="text-xs font-semibold uppercase tracking-wider text-[#1F2422]/50">Ronda</h2>

          <ul class="mt-3 divide-y divide-[#1F2422]/10">
            @for (line of cart(); track line.key) {
              <li class="py-3 space-y-2">
                <div class="flex items-start justify-between gap-2">
                  <p class="text-sm font-medium text-[#1F2422]">{{ lineName(line) }}</p>
                  <button
                    type="button"
                    class="text-xs text-[#1F2422]/50 hover:text-[#B5482A] transition-colors"
                    (click)="removeLine(line.key)"
                  >
                    Quitar
                  </button>
                </div>
                @if (selectedModifiers(line); as mods) {
                  @if (mods.length) {
                    <p class="text-xs text-[#1F2422]/50">
                      @for (mod of mods; track mod.dish_modifier_id; let last = $last) {
                        {{ mod.name }} (+{{ formatCurrency(mod.extra_price) }}){{ last ? '' : ', ' }}
                      }
                    </p>
                  }
                }
                <label class="block">
                  <span class="text-xs text-[#1F2422]/60">Cantidad</span>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    class="mt-1 w-20 rounded-lg border border-[#1F2422]/15 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6F5E]/30"
                    [value]="line.quantity"
                    (input)="setQuantity(line.key, $any($event.target).value)"
                  />
                </label>
                <label class="block">
                  <span class="text-xs text-[#1F2422]/60">Nota</span>
                  <textarea
                    maxlength="255"
                    rows="2"
                    class="mt-1 w-full rounded-lg border border-[#1F2422]/15 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6F5E]/30"
                    [value]="line.note"
                    (input)="setNote(line.key, $any($event.target).value)"
                  ></textarea>
                </label>
                <p class="text-right text-sm text-[#1F2422]">{{ formatCurrency(lineTotal(line)) }}</p>
              </li>
            } @empty {
              <p class="py-3 text-sm text-[#1F2422]/50">Agregue platillos del menú.</p>
            }
          </ul>

          <p class="mt-3 flex justify-between border-t border-[#1F2422]/10 pt-3 font-semibold text-[#1F2422]">
            <span>Estimado</span>
            <span>{{ formatCurrency(cartTotal()) }}</span>
          </p>

          @if (submitError()) {
            <p class="mt-3 text-sm text-[#B5482A]">{{ submitError() }}</p>
            @if (submitErrorAction()) {
              <p class="text-sm text-[#1F2422]/60">Sugerencia: {{ submitErrorAction() }}</p>
            }
          }

          <button
            type="button"
            class="mt-4 w-full rounded-lg bg-[#2F6F5E] px-4 py-2 text-white text-sm font-medium hover:bg-[#26594B] transition-colors disabled:opacity-40"
            [disabled]="cart().length === 0 || submitting()"
            (click)="onSubmit()"
          >
            Enviar a cocina
          </button>
        </aside>
      </div>
    </div>

    <dialog #modifierDialog class="rounded-2xl p-6 shadow-xl backdrop:bg-[#1F2422]/40">
      <h2 class="text-lg font-semibold text-[#1F2422]">{{ pendingDish()?.name }}</h2>
      <p class="mt-1 text-sm text-[#1F2422]/60">Elija los modificadores de esta línea.</p>

      <ul class="mt-4 w-80 space-y-2">
        @for (mod of pendingDish()?.modifiers ?? []; track mod.dish_modifier_id) {
          <li>
            <label class="flex items-center justify-between gap-3 text-sm text-[#1F2422]">
              <span class="flex items-center gap-2">
                <input
                  type="checkbox"
                  [checked]="pendingModifierIds().includes(mod.dish_modifier_id)"
                  (change)="togglePendingModifier(mod.dish_modifier_id)"
                />
                {{ mod.name }}
              </span>
              <span class="text-[#1F2422]/60">+{{ formatCurrency(mod.extra_price) }}</span>
            </label>
          </li>
        }
      </ul>

      <div class="mt-4 flex justify-end gap-2">
        <button
          type="button"
          class="rounded-lg px-4 py-2 text-sm text-[#1F2422]/70 hover:bg-[#FAF9F6] transition-colors"
          (click)="closeModifierDialog()"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="rounded-lg bg-[#2F6F5E] px-4 py-2 text-white text-sm font-medium hover:bg-[#26594B] transition-colors"
          (click)="confirmModifiers()"
        >
          Agregar
        </button>
      </div>
    </dialog>
  `,
})
export class NewRoundPage {
  /** Llega de /comandas/:accountId/nueva por withComponentInputBinding. */
  readonly accountId = input.required<string>();

  protected readonly orders = inject(OrdersService);
  private readonly tables = inject(TablesService);
  private readonly router = inject(Router);

  protected readonly formatCurrency = formatCurrency;

  private readonly account = signal<TableAccountView | null>(null);
  protected readonly accountError = signal<string | null>(null);

  constructor() {
    effect(() => {
      const id = Number(this.accountId());
      if (!id) return;
      void this.loadAccount(id);
    });
  }

  private async loadAccount(id: number): Promise<void> {
    this.accountError.set(null);
    try {
      this.account.set(await this.tables.findAccount(id));
    } catch (error) {
      this.accountError.set(messageFor(error));
    }
  }

  protected readonly tableNumber = computed(() => {
    const restaurantTableId = this.account()?.restaurant_table_id;
    if (!restaurantTableId) return null;
    return (
      this.tables.floorPlan.value().find((row) => row.restaurant_table_id === restaurantTableId)
        ?.table_number ?? restaurantTableId
    );
  });

  protected menuError(): string {
    return messageFor(this.orders.menu.error());
  }

  protected readonly dishesByCategory = computed(() => {
    const groups = new Map<string, MenuDishView[]>();
    for (const dish of this.orders.menu.value().dishes) {
      const list = groups.get(dish.category_name) ?? [];
      list.push(dish);
      groups.set(dish.category_name, list);
    }
    return [...groups.entries()].map(([category, dishes]) => ({ category, dishes }));
  });

  // --- Carrito ---

  private nextKey = 1;
  protected readonly cart = signal<CartLine[]>([]);

  protected readonly cartTotal = computed(() =>
    this.cart().reduce((total, line) => total + this.lineTotal(line), 0),
  );

  protected lineName(line: CartLine): string {
    return line.dish?.name ?? line.combo?.name ?? '';
  }

  protected lineTotal(line: CartLine): number {
    const base = line.dish?.sale_price ?? line.combo?.combo_price ?? 0;
    const extras = this.selectedModifiers(line).reduce((sum, mod) => sum + mod.extra_price, 0);
    return (base + extras) * line.quantity;
  }

  protected selectedModifiers(line: CartLine): ModifierBrief[] {
    return (line.dish?.modifiers ?? []).filter((mod) =>
      line.modifierIds.includes(mod.dish_modifier_id),
    );
  }

  protected onPickDish(dish: MenuDishView): void {
    if (dish.modifiers.length === 0) {
      this.addLine(dish, []);
      return;
    }
    this.pendingDish.set(dish);
    this.pendingModifierIds.set([]);
    this.modifierDialog().nativeElement.showModal();
  }

  protected onPickCombo(combo: MenuComboView): void {
    this.cart.update((lines) => [
      ...lines,
      { key: this.nextKey++, dish: null, combo, quantity: 1, modifierIds: [], note: '' },
    ]);
  }

  private addLine(dish: MenuDishView, modifierIds: number[]): void {
    this.cart.update((lines) => [
      ...lines,
      { key: this.nextKey++, dish, combo: null, quantity: 1, modifierIds, note: '' },
    ]);
  }

  protected setQuantity(key: number, raw: string): void {
    const quantity = Math.min(99, Math.max(1, Math.floor(Number(raw) || 1)));
    this.cart.update((lines) => lines.map((line) => (line.key === key ? { ...line, quantity } : line)));
  }

  protected setNote(key: number, note: string): void {
    this.cart.update((lines) =>
      lines.map((line) => (line.key === key ? { ...line, note: note.slice(0, 255) } : line)),
    );
  }

  protected removeLine(key: number): void {
    this.cart.update((lines) => lines.filter((line) => line.key !== key));
  }

  // --- Modificadores ---

  private readonly modifierDialog = viewChild.required<ElementRef<HTMLDialogElement>>('modifierDialog');
  protected readonly pendingDish = signal<MenuDishView | null>(null);
  protected readonly pendingModifierIds = signal<number[]>([]);

  protected togglePendingModifier(id: number): void {
    this.pendingModifierIds.update((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  protected closeModifierDialog(): void {
    this.modifierDialog().nativeElement.close();
    this.pendingDish.set(null);
  }

  protected confirmModifiers(): void {
    const dish = this.pendingDish();
    if (dish) this.addLine(dish, this.pendingModifierIds());
    this.closeModifierDialog();
  }

  // --- Envío ---

  protected readonly submitting = signal(false);
  protected readonly submitError = signal<string | null>(null);
  protected readonly submitErrorAction = signal<string | null>(null);

  protected async onSubmit(): Promise<void> {
    const accountId = Number(this.accountId());
    const lines = this.cart();
    if (!accountId || lines.length === 0) return;

    this.submitError.set(null);
    this.submitErrorAction.set(null);
    this.submitting.set(true);

    const items: OrderLineDTO[] = lines.map((line) => {
      const note = line.note.trim() || undefined;
      if (line.combo) {
        return { combo_id: line.combo.combo_id, quantity: line.quantity, note };
      }
      return {
        dish_id: line.dish!.dish_id,
        quantity: line.quantity,
        modifier_ids: line.modifierIds.length ? line.modifierIds : undefined,
        note,
      };
    });

    try {
      await this.orders.submit(accountId, { items });
      await this.router.navigate(['/mesas', accountId]);
    } catch (error) {
      this.submitError.set(messageFor(error));
      this.submitErrorAction.set(actionLabelFor(error));
    } finally {
      this.submitting.set(false);
    }
  }
}
