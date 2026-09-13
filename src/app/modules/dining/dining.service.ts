import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ApiConfig } from '../../api-config';
import {
  ReservationView,
  CreateReservationRequest,
  CancelReservationRequest,
  WaitlistEntryView,
  CreateWaitlistEntryRequest,
  SeatWaitlistRequest,
  SeatingResultView,
  FloorPlanRow,
} from './dining.types';

/** Spring Data envuelve las listas paginadas asi: { content: T[], page: {...} }. */
interface PageResponse<T> {
  content: T[];
}

@Injectable({ providedIn: 'root' })
export class DiningService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiConfig);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly floorPlanResource = httpResource<FloorPlanRow[]>(
    () => (this.isBrowser ? `${this.api.apiBaseUrl}/api/v1/floor-plan` : undefined),
    { defaultValue: [] },
  );

  readonly floorPlan = {
    isLoading: this.floorPlanResource.isLoading,
    value: this.floorPlanResource.value,
    reload: () => this.floorPlanResource.reload(),
  };

  private readonly reservationsPage = httpResource<PageResponse<ReservationView>>(
    () => (this.isBrowser ? `${this.api.apiBaseUrl}/api/v1/reservations?status=BOOKED` : undefined),
    { defaultValue: { content: [] } },
  );

  readonly reservations = {
    isLoading: this.reservationsPage.isLoading,
    value: computed(() => this.reservationsPage.value().content),
    reload: () => this.reservationsPage.reload(),
  };

  readonly waitlist = httpResource<WaitlistEntryView[]>(
    () => (this.isBrowser ? `${this.api.apiBaseUrl}/api/v1/waitlist-entries?status=WAITING` : undefined),
    { defaultValue: [] },
  );

  private reloadAll(): void {
    this.floorPlan.reload();
    this.reservations.reload();
    this.waitlist.reload();
  }

  async createReservation(request: CreateReservationRequest): Promise<ReservationView> {
    const reservation = await firstValueFrom(
      this.http.post<ReservationView>(`${this.api.apiBaseUrl}/api/v1/reservations`, request),
    );
    this.reloadAll();
    return reservation;
  }

  async seatReservation(reservationId: number): Promise<SeatingResultView> {
    const result = await firstValueFrom(
      this.http.post<SeatingResultView>(
        `${this.api.apiBaseUrl}/api/v1/reservations/${reservationId}/seatings`,
        {},
      ),
    );
    this.reloadAll();
    return result;
  }

  async cancelReservation(reservationId: number, request: CancelReservationRequest): Promise<ReservationView> {
    const reservation = await firstValueFrom(
      this.http.post<ReservationView>(
        `${this.api.apiBaseUrl}/api/v1/reservations/${reservationId}/cancellations`,
        request,
      ),
    );
    this.reloadAll();
    return reservation;
  }

  async createWaitlistEntry(request: CreateWaitlistEntryRequest): Promise<WaitlistEntryView> {
    const entry = await firstValueFrom(
      this.http.post<WaitlistEntryView>(`${this.api.apiBaseUrl}/api/v1/waitlist-entries`, request),
    );
    this.reloadAll();
    return entry;
  }

  async seatWaitlistEntry(entryId: number, request: SeatWaitlistRequest): Promise<SeatingResultView> {
    const result = await firstValueFrom(
      this.http.post<SeatingResultView>(
        `${this.api.apiBaseUrl}/api/v1/waitlist-entries/${entryId}/seatings`,
        request,
      ),
    );
    this.reloadAll();
    return result;
  }

  async removeWaitlistEntry(entryId: number): Promise<void> {
    await firstValueFrom(
      this.http.delete<void>(`${this.api.apiBaseUrl}/api/v1/waitlist-entries/${entryId}`),
    );
    this.reloadAll();
  }
}
