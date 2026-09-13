import { Routes } from '@angular/router';
import { AppShell } from './layout/app-shell';
import { PublicShell } from './layout/public-shell';
import { authGuard, roleGuard } from './core/role.guard';

/**
 * Toda ruta de modulo va con loadComponent: es lo que mantiene el presupuesto inicial
 * de 500 kB que angular.json declara y que el build de CI hace cumplir.
 * Cada quien agrega la rama de su modulo con su roleGuard, por ejemplo:
 *
 *   {
 *     path: 'cocina',
 *     canActivate: [roleGuard('KITCHEN')],
 *     loadComponent: () =>
 *       import('./modules/kitchen/pages/kitchen-queue.page').then((m) => m.KitchenQueue),
 *   },
 */
export const routes: Routes = [
  {
    path: 'login',
    component: PublicShell,
    children: [
      {
        path: '',
        loadComponent: () => import('./modules/auth/pages/login.page').then((m) => m.LoginPage),
      },
    ],
  },
  {
    path: '',
    component: AppShell,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./modules/home/pages/home.page').then((m) => m.HomePage),
      },
      {
        path: 'caja',
        canActivate: [roleGuard('CASHIER')],
        loadComponent: () =>
          import('./modules/cashbox/pages/cash-shift.page').then((m) => m.CashShiftPage),
      },
      {
        path: 'cobro',
        canActivate: [roleGuard('CASHIER')],
        loadComponent: () =>
          import('./modules/billing/pages/billing.page').then((m) => m.BillingPage),
      },
      {
        path: 'salon',
        canActivate: [roleGuard('WAITER')],
        loadComponent: () =>
          import('./modules/dining/pages/dining.page').then((m) => m.DiningPage),
      },
      {
        path: 'facturas',
        canActivate: [roleGuard('CASHIER')],
        loadComponent: () =>
          import('./modules/billing/pages/invoice-history.page').then((m) => m.InvoiceHistoryPage),
      },
      {
        path: 'facturas/:id',
        canActivate: [roleGuard('CASHIER')],
        loadComponent: () =>
          import('./modules/billing/pages/receipt.page').then((m) => m.ReceiptPage),
      },
      {
        path: 'clientes',
        canActivate: [roleGuard('CASHIER', 'WAITER')],
        loadComponent: () =>
          import('./modules/customers/pages/customers.page').then((m) => m.CustomersPage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
