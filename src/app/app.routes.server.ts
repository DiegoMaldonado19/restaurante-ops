import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * El build de CI prerrenderiza, asi que un descuido aqui no rompe una pantalla: rompe
 * el despliegue de todo el equipo.
 *
 * REGLA: toda ruta con parametro (`:id`) necesita su entrada aqui con
 * RenderMode.Client o un getPrerenderParams, porque el build no puede saber que ids
 * existen. Las pantallas detras de authGuard son dependientes del usuario y no ganan
 * nada prerrenderizadas.
 */
export const serverRoutes: ServerRoute[] = [
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
