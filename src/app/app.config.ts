import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideClientHydration } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideApiConfig } from './api-config';
import { authInterceptor } from './core/auth.interceptor';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // withComponentInputBinding: los parametros de ruta llegan como input() al componente.
    provideRouter(routes, withComponentInputBinding()),
    provideClientHydration(),
    // withFetch() es lo correcto bajo SSR. Sin withInterceptors no se agrega el Bearer
    // a ninguna peticion, httpResource incluido, y todo responde 401.
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    provideApiConfig(),
  ],
};
