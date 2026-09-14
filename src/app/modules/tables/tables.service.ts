import { HttpClient, httpResource } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { computed, inject, Injectable, PLATFORM_ID } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiConfig } from '../../api-config';
import {
  AccountSplitView,
  FloorPlanRow,
  MergeAccountRequest,
  OpenAccountRequest,
  SplitAccountRequest,
  TableAccountView,
  TransferAccountRequest,
  UpdateAccountStatusRequest,
  UpdateTableStatusRequest,
} from './tables.types';

/** Spring Data envuelve las listas paginadas asi: { content: T[], page: {...} }. */
interface PageResponse<T> {
  content: T[];
}

@Injectable({ providedIn: 'root' })
export class TablesService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiConfig);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** El mapa completo. ~20 mesas: no hace falta paginar ni filtrar en el servidor. */
  private readonly floorPlanResource = httpResource<FloorPlanRow[]>(
    () => (this.isBrowser ? `${this.api.apiBaseUrl}/api/v1/floor-plan` : undefined),
    { defaultValue: [] },
  );

  readonly floorPlan = {
    isLoading: this.floorPlanResource.isLoading,
    value: this.floorPlanResource.value,
    error: this.floorPlanResource.error,
    reload: () => this.floorPlanResource.reload(),
  };

  /** Cuentas OPEN de otras mesas, candidatas a fusion (se excluye la actual en la pagina). */
  private readonly openAccountsPage = httpResource<PageResponse<TableAccountView>>(
    () => (this.isBrowser ? `${this.api.apiBaseUrl}/api/v1/accounts?status=OPEN` : undefined),
    { defaultValue: { content: [] } },
  );

  readonly openAccounts = {
    isLoading: this.openAccountsPage.isLoading,
    value: computed(() => this.openAccountsPage.value().content),
    error: this.openAccountsPage.error,
    reload: () => this.openAccountsPage.reload(),
  };

  private reloadAll(): void {
    this.floorPlan.reload();
    this.openAccounts.reload();
  }

  async findAccount(accountId: number): Promise<TableAccountView> {
    return firstValueFrom(
      this.http.get<TableAccountView>(`${this.api.apiBaseUrl}/api/v1/accounts/${accountId}`),
    );
  }

  /**
   * Mitigacion de un bug confirmado contra el backend real el 2026-09-13: GET /floor-plan
   * no devuelve `open_account` para una mesa que ya tuvo VARIAS cuentas historicas (todo
   * lo que ya lleva algunos dias de operacion), aunque SI tenga una cuenta OPEN vigente
   * -- confirmado reproduciendolo en la mesa 1 del set de datos de demo (6 cuentas
   * historicas), mientras que una mesa "nueva" con una sola cuenta si lo devuelve bien.
   * `GET /accounts?tableId=X&status=OPEN` (ordering, no restaurant) SI filtra correcto
   * en todos los casos probados, asi que se usa aqui como respaldo cuando floor-plan
   * dice OCCUPIED/BILL_REQUESTED pero no trae el open_account. Ver Bitacora, Fase 3.
   */
  async findOpenAccountForTable(tableId: number): Promise<TableAccountView | null> {
    const page = await firstValueFrom(
      this.http.get<{ content: TableAccountView[] }>(
        `${this.api.apiBaseUrl}/api/v1/accounts?tableId=${tableId}`,
      ),
    );
    // La mesa puede tener una cuenta OPEN o, si ya se pidio la cuenta, BILL_REQUESTED.
    return page.content.find((acc) => acc.status === 'OPEN' || acc.status === 'BILL_REQUESTED') ?? null;
  }

  async openAccount(request: OpenAccountRequest): Promise<TableAccountView> {
    const account = await firstValueFrom(
      this.http.post<TableAccountView>(`${this.api.apiBaseUrl}/api/v1/accounts`, request),
    );
    this.floorPlan.reload();
    return account;
  }

  async transfer(accountId: number, request: TransferAccountRequest): Promise<TableAccountView> {
    const account = await firstValueFrom(
      this.http.post<TableAccountView>(
        `${this.api.apiBaseUrl}/api/v1/accounts/${accountId}/transfers`,
        request,
      ),
    );
    this.floorPlan.reload();
    return account;
  }

  async merge(accountId: number, request: MergeAccountRequest): Promise<TableAccountView> {
    const account = await firstValueFrom(
      this.http.post<TableAccountView>(
        `${this.api.apiBaseUrl}/api/v1/accounts/${accountId}/merges`,
        request,
      ),
    );
    this.reloadAll();
    return account;
  }

  /**
   * Devuelve un arreglo de AccountSplitView, NO una TableAccountView envuelta -- confirmado
   * contra el backend real el 2026-09-13 (Fase 3). Cada elemento llega con `items: []`
   * (otro comportamiento confirmado: el backend no ecoa los items recien asignados en
   * esta respuesta), asi que la pagina que llama a este metodo es quien debe recordar
   * que item quedo en que grupo, usando el orden de `request.items` para emparejar.
   */
  async split(accountId: number, request: SplitAccountRequest): Promise<AccountSplitView[]> {
    return firstValueFrom(
      this.http.post<AccountSplitView[]>(
        `${this.api.apiBaseUrl}/api/v1/accounts/${accountId}/splits`,
        request,
      ),
    );
  }

  async deleteSplit(splitId: number): Promise<void> {
    await firstValueFrom(
      this.http.delete<void>(`${this.api.apiBaseUrl}/api/v1/account-splits/${splitId}`),
    );
  }

  /** Pide la cuenta: OPEN -> BILL_REQUESTED. El backend mueve la mesa a la misma vez. */
  async requestBill(accountId: number): Promise<TableAccountView> {
    const request: UpdateAccountStatusRequest = { status: 'BILL_REQUESTED' };
    const account = await firstValueFrom(
      this.http.patch<TableAccountView>(
        `${this.api.apiBaseUrl}/api/v1/accounts/${accountId}/status`,
        request,
      ),
    );
    this.floorPlan.reload();
    return account;
  }

  /** Valvula de recuperacion manual. El backend valida la matriz; aqui solo se pide. */
  async changeTableStatus(tableId: number, request: UpdateTableStatusRequest): Promise<void> {
    await firstValueFrom(
      this.http.patch<void>(`${this.api.apiBaseUrl}/api/v1/tables/${tableId}/status`, request),
    );
    this.floorPlan.reload();
  }
}
