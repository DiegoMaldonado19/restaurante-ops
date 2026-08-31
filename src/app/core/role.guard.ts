import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, UserRole } from './auth.service';

/**
 * El build de CI prerrenderiza: durante el prerenderizado no hay localStorage y la
 * sesion siempre luce vacia. Si la guarda bloqueara ahi, tumbaria el despliegue de todo
 * el equipo. Por eso solo decide en el navegador; el backend prohibe de todas formas.
 */
const runsInBrowser = () => isPlatformBrowser(inject(PLATFORM_ID));

export const authGuard: CanActivateFn = () => {
  if (!runsInBrowser()) {
    return true;
  }

  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.isAuthenticated() ? true : router.createUrlTree(['/login']);
};

export const roleGuard =
  (...roles: UserRole[]): CanActivateFn =>
  () => {
    if (!runsInBrowser()) {
      return true;
    }

    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.isAuthenticated()) {
      return router.createUrlTree(['/login']);
    }

    return auth.hasRole(...roles) ? true : router.createUrlTree(['/']);
  };
