import { HttpErrorResponse } from '@angular/common/http';
import { actionLabelFor, fieldErrorsOf, messageFor } from './error-messages';
import { minutesSince } from './format';

const errorWith = (body: unknown, status = 409) =>
  new HttpErrorResponse({ error: body, status, url: '/api/v1/invoices' });

describe('messageFor', () => {
  it('prefiere el mensaje del backend, que es el que tiene el contexto', () => {
    const error = errorWith({
      error_code: 'INSUFFICIENT_STOCK',
      message: 'No hay suficiente carne molida.',
      suggested_action: 'REMOVE_ITEM',
    });

    expect(messageFor(error)).toBe('No hay suficiente carne molida.');
  });

  it('usa el respaldo cuando el codigo llega sin mensaje', () => {
    expect(messageFor(errorWith({ error_code: 'UNAUTHENTICATED', message: '' }, 401))).toContain(
      'sesion',
    );
  });

  it('avisa de red caida cuando no hay respuesta', () => {
    expect(messageFor(errorWith(null, 0))).toContain('conexion');
  });
});

describe('actionLabelFor', () => {
  it('traduce la accion sugerida a la etiqueta del boton', () => {
    const error = errorWith({
      error_code: 'CASH_SHIFT_NOT_OPEN',
      message: 'No hay una caja abierta.',
      suggested_action: 'OPEN_CASH_SHIFT',
    });

    expect(actionLabelFor(error)).toBe('Abrir caja');
  });

  it('devuelve null cuando el error no sugiere ninguna accion', () => {
    const error = errorWith({ error_code: 'ACCOUNT_NOT_OPEN', message: 'La cuenta esta cerrada.' });

    expect(actionLabelFor(error)).toBeNull();
  });
});

describe('fieldErrorsOf', () => {
  it('expone los campos de un 400 para pintarlos en rojo', () => {
    const error = errorWith(
      {
        error_code: 'VALIDATION_ERROR',
        message: 'La solicitud tiene campos invalidos.',
        fields: [{ field: 'quantity', rejected_value: '-3', message: 'Debe ser mayor que cero' }],
      },
      400,
    );

    expect(fieldErrorsOf(error).map((f) => f.field)).toEqual(['quantity']);
  });

  it('devuelve una lista vacia cuando el error no es de validacion', () => {
    expect(fieldErrorsOf(errorWith({ error_code: 'ACCOUNT_NOT_OPEN', message: 'x' }))).toEqual([]);
  });
});

describe('minutesSince', () => {
  // El backend devuelve LocalDateTime, es decir ISO SIN zona: "2026-09-10T20:14:32".
  // Date.parse lo interpreta en la zona del navegador, que es la del restaurante.
  const localIsoOf = (date: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');

    return (
      `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
      `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
    );
  };

  it('cuenta los minutos transcurridos desde una marca del backend', () => {
    const hace90Minutos = new Date(Date.now() - 90 * 60_000);

    expect(minutesSince(localIsoOf(hace90Minutos))).toBe(90);
  });
});
