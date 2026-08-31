import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/** Envoltura de las pantallas sin sesion. Hoy solo el login. */
@Component({
  selector: 'app-public-shell',
  imports: [RouterOutlet],
  template: `
    <div class="flex min-h-dvh items-center justify-center bg-slate-100 p-4">
      <router-outlet />
    </div>
  `,
})
export class PublicShell {}
