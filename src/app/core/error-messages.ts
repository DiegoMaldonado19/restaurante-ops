import { HttpErrorResponse } from '@angular/common/http';

/** Cuerpo de error unico que produce el GlobalExceptionHandler del backend. */
export interface ApiError {
  error_code: string;
  message: string;
  suggested_action?: string;
  trace_id?: string;
  timestamp: string;
  path: string;
  fields?: FieldError[];
}

export interface FieldError {
  field: string;
  rejected_value: string;
  message: string;
}

/**
 * El mensaje lo escribe el backend, que es quien tiene el contexto ("No hay suficiente
 * carne molida para 3 Hamburguesas"). Aqui solo estan los casos en los que no llega
 * cuerpo: red caida, respuesta no JSON o un 401 emitido por la cadena de filtros.
 */
const FALLBACK_MESSAGES: Record<string, string> = {
  UNAUTHENTICATED: 'Su sesion expiro. Vuelva a iniciar sesion.',
  FORBIDDEN_RESOURCE: 'Su rol no tiene acceso a esta operacion.',
  VALIDATION_ERROR: 'La solicitud tiene campos invalidos.',
  INTERNAL_ERROR: 'Ocurrio un error inesperado. Intente de nuevo.',
};

const NETWORK_ERROR = 'No se pudo contactar al servidor. Revise su conexion.';

/**
 * Etiqueta del boton que la interfaz ofrece segun suggested_action. Esta es la mitad
 * del contrato que el backend no puede resolver: el sabe que se puede hacer, no como
 * se llama el boton en cada pantalla.
 */
export const ACTION_LABELS: Record<string, string> = {
  LOGIN: 'Iniciar sesion',
  CONTACT_ADMIN: 'Contactar al administrador',
  OPEN_CASH_SHIFT: 'Abrir caja',
  CLOSE_CURRENT_SHIFT: 'Cerrar el turno actual',
  REMOVE_ITEM: 'Quitar el platillo',
  DEACTIVATE_INSTEAD: 'Desactivar en vez de eliminar',
  SUGGEST_ALTERNATIVE: 'Ver alternativas',
  DEFINE_RECIPE: 'Definir la receta',
  CHOOSE_ANOTHER_TABLE: 'Elegir otra mesa',
  SEAT_RESERVATION: 'Sentar la reserva',
  OPEN_EXISTING_ACCOUNT: 'Abrir la cuenta existente',
  REQUEST_EXCEPTION: 'Solicitar excepcion',
  DELIVER_ITEMS_FIRST: 'Entregar los platillos pendientes',
  VIEW_INVOICE: 'Ver la factura',
  REDUCE_POINTS: 'Redimir menos puntos',
  OPEN_EXISTING_CUSTOMER: 'Abrir el cliente existente',
  JOIN_WAITLIST: 'Agregar a la lista de espera',
};

export function apiErrorOf(error: unknown): ApiError | null {
  const body = error instanceof HttpErrorResponse ? error.error : null;

  return body !== null && typeof body === 'object' && 'error_code' in body ? (body as ApiError) : null;
}

export function messageFor(error: unknown): string {
  const apiError = apiErrorOf(error);

  if (apiError !== null) {
    return apiError.message || FALLBACK_MESSAGES[apiError.error_code] || NETWORK_ERROR;
  }

  if (error instanceof HttpErrorResponse && error.status === 0) {
    return NETWORK_ERROR;
  }

  return FALLBACK_MESSAGES['INTERNAL_ERROR'];
}

/** Etiqueta del boton a ofrecer, o null si el error no sugiere ninguna accion. */
export function actionLabelFor(error: unknown): string | null {
  const action = apiErrorOf(error)?.suggested_action;

  return action ? (ACTION_LABELS[action] ?? null) : null;
}

/** Errores por campo de un 400, para pintar el formulario en rojo. */
export function fieldErrorsOf(error: unknown): FieldError[] {
  return apiErrorOf(error)?.fields ?? [];
}
