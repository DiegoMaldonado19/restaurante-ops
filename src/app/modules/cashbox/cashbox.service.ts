import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ApiConfig } from '../../api-config';
import {
  CashShiftView,
  CashMovementView,
  OpenCashShiftRequest,
  CloseCashShiftRequest,
} from './cashbox.types';

@Injectable({ providedIn: 'root' })
export class CashboxService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiConfig);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /**
   * Solo se pide en el navegador: en el servidor no hay token (localStorage no
   * existe ahi), y pedir sin token dispara un 401 que el interceptor traduce en
   * una redireccion a /login dentro de la propia respuesta del SSR.
   */
  readonly openShifts = httpResource<CashShiftView[]>(
    () => (this.isBrowser ? `${this.api.apiBaseUrl}/api/v1/cash-shifts?status=OPEN` : undefined),
    { defaultValue: [] },
  );

  readonly currentShift = computed<CashShiftView | null>(() => this.openShifts.value()[0] ?? null);

  private readonly currentShiftId = computed(() => this.currentShift()?.cash_shift_id);

  readonly movements = httpResource<CashMovementView[]>(
    () => {
      if (!this.isBrowser) return undefined;
      const id = this.currentShiftId();
      return id ? `${this.api.apiBaseUrl}/api/v1/cash-shifts/${id}/movements` : undefined;
    },
    { defaultValue: [] },
  );

  async openShift(request: OpenCashShiftRequest): Promise<CashShiftView> {
    const shift = await firstValueFrom(
      this.http.post<CashShiftView>(`${this.api.apiBaseUrl}/api/v1/cash-shifts`, request),
    );

    this.openShifts.reload();

    return shift;
  }

  async closeShift(shiftId: number, request: CloseCashShiftRequest): Promise<CashShiftView> {
    const shift = await firstValueFrom(
      this.http.post<CashShiftView>(
        `${this.api.apiBaseUrl}/api/v1/cash-shifts/${shiftId}/closings`,
        request,
      ),
    );

    this.openShifts.reload();

    return shift;
  }
}
