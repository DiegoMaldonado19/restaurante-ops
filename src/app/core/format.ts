/**
 * Formato de moneda y fecha. El backend hace toda la aritmetica de fechas y devuelve
 * ISO sin zona; aqui solo se formatea, por eso no se instala date-fns ni moment.
 */
const currency = new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' });
const date = new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium' });
const dateTime = new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium', timeStyle: 'short' });

export const formatCurrency = (amount: number) => currency.format(amount);

export const formatDate = (isoDate: string) => date.format(new Date(isoDate));

export const formatDateTime = (isoDateTime: string) => dateTime.format(new Date(isoDateTime));

/** Minutos transcurridos desde una marca de tiempo del backend. */
export const minutesSince = (isoDateTime: string) =>
  Math.floor((Date.now() - Date.parse(isoDateTime)) / 60_000);
