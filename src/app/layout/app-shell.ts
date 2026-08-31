import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService, UserRole } from '../core/auth.service';

interface NavItem {
  path: string;
  label: string;
  roles: UserRole[];
}

// Cada quien agrega aqui la entrada de su modulo cuando su pantalla existe.
// La barra oculta lo que el rol no usa; el backend prohibe de todas formas.
const NAV_ITEMS: NavItem[] = [
  // Proximos: /mesas y /comandas (WAITER), /cocina (KITCHEN),
  //           /caja y /cobro (CASHIER), /salon (WAITER), /clientes (CASHIER, WAITER)
];

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="flex min-h-dvh bg-slate-100">
      <aside class="flex w-60 flex-col justify-between bg-slate-900 p-4 text-slate-100">
        <div>
          <p class="px-2 pb-4 text-lg font-semibold">{{ appName }}</p>

          <nav class="space-y-1">
            @for (item of visibleItems(); track item.path) {
              <a
                [routerLink]="item.path"
                routerLinkActive="bg-slate-700"
                [routerLinkActiveOptions]="{ exact: true }"
                class="block rounded-md px-3 py-2 text-sm hover:bg-slate-800"
              >
                {{ item.label }}
              </a>
            } @empty {
              <p class="px-3 text-sm text-slate-400">Sin modulos disponibles para su rol.</p>
            }
          </nav>
        </div>

        <div class="border-t border-slate-700 pt-4">
          <p class="px-3 text-sm font-medium">{{ auth.fullName() }}</p>
          <p class="px-3 pb-2 text-xs text-slate-400">{{ auth.role() }}</p>
          <button
            type="button"
            (click)="logout()"
            class="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-slate-800"
          >
            Cerrar sesion
          </button>
        </div>
      </aside>

      <main class="flex-1 p-6">
        <router-outlet />
      </main>
    </div>
  `,
})
export class AppShell {
  protected readonly appName = 'Operacion';

  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly visibleItems = computed(() =>
    NAV_ITEMS.filter((item) => this.auth.hasRole(...item.roles)),
  );

  protected logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
