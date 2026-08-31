import { Component, inject, signal } from '@angular/core';
import { form, FormField, minLength, required, submit } from '@angular/forms/signals';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { messageFor } from '../../../core/error-messages';

/**
 * Las validaciones espejan las del LoginDTO del backend. El frontend valida para dar
 * buen trato; el backend valida para ser correcto.
 */
@Component({
  selector: 'app-login',
  imports: [FormField],
  template: `
    <form
      (submit)="onSubmit($event)"
      class="w-full max-w-sm space-y-5 rounded-xl bg-white p-8 shadow-lg"
    >
      <div>
        <h1 class="text-2xl font-semibold text-slate-900">{{ appName }}</h1>
        <p class="mt-1 text-sm text-slate-500">Ingrese con su usuario del restaurante.</p>
      </div>

      <label class="block">
        <span class="text-sm font-medium text-slate-700">Usuario</span>
        <input
          type="text"
          autocomplete="username"
          [formField]="loginForm.username"
          class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-slate-900 focus:outline-none"
        />
        @if (loginForm.username().touched() && loginForm.username().invalid()) {
          @for (error of loginForm.username().errors(); track error.kind) {
            <p class="mt-1 text-sm text-red-600">{{ error.message }}</p>
          }
        }
      </label>

      <label class="block">
        <span class="text-sm font-medium text-slate-700">Contrasena</span>
        <input
          type="password"
          autocomplete="current-password"
          [formField]="loginForm.password"
          class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-slate-900 focus:outline-none"
        />
        @if (loginForm.password().touched() && loginForm.password().invalid()) {
          @for (error of loginForm.password().errors(); track error.kind) {
            <p class="mt-1 text-sm text-red-600">{{ error.message }}</p>
          }
        }
      </label>

      @if (failure()) {
        <p role="alert" class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {{ failure() }}
        </p>
      }

      <button
        type="submit"
        [disabled]="loginForm().invalid() || loginForm().submitting()"
        class="w-full rounded-md bg-slate-900 px-4 py-2 font-medium text-white disabled:opacity-50"
      >
        {{ loginForm().submitting() ? 'Entrando...' : 'Entrar' }}
      </button>
    </form>
  `,
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly appName = 'Restaurante';

  protected readonly failure = signal<string | null>(null);

  protected readonly credentials = signal({ username: '', password: '' });

  protected readonly loginForm = form(this.credentials, (path) => {
    required(path.username, { message: 'El usuario es obligatorio' });
    minLength(path.username, 4, { message: 'El usuario tiene al menos 4 caracteres' });

    required(path.password, { message: 'La contrasena es obligatoria' });
    minLength(path.password, 8, { message: 'La contrasena tiene al menos 8 caracteres' });
  });

  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.failure.set(null);

    submit(this.loginForm, {
      action: async () => {
        const { username, password } = this.credentials();

        try {
          await this.auth.login(username, password);
          await this.router.navigate(['/']);
        } catch (error) {
          // 401 INVALID_CREDENTIALS y 403 ACCOUNT_INACTIVE llegan aqui: son estado del
          // sistema, no un campo mal escrito, y el formulario no puede prevenirlos.
          this.failure.set(messageFor(error));
        }

        return undefined;
      },
    });
  }
}
