import { Component, inject } from '@angular/core';
import { AuthService } from '../../../core/auth.service';

/** Pantalla de aterrizaje tras iniciar sesion. Cada modulo cuelga de la barra lateral. */
@Component({
  selector: 'app-home',
  template: `
    <section class="rounded-xl bg-white p-8 shadow">
      <h1 class="text-2xl font-semibold text-slate-900">Hola, {{ auth.fullName() }}</h1>
      <p class="mt-2 text-slate-600">
        Sesion iniciada como <strong>{{ auth.role() }}</strong
        >. Elija un modulo en la barra lateral.
      </p>
    </section>
  `,
})
export class HomePage {
  protected readonly auth = inject(AuthService);
}
