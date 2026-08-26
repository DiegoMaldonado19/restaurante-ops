import { inject, Injectable, PLATFORM_ID, provideAppInitializer } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class ApiConfig {
  apiBaseUrl = 'http://localhost:8080';

  async load(): Promise<void> {
    const response = await fetch('/config.json');
    if (!response.ok) {
      throw new Error(`GET /config.json returned ${response.status}`);
    }
    this.apiBaseUrl = (await response.json()).apiBaseUrl;
  }
}

export function provideApiConfig() {
  return provideAppInitializer(() => {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) {
      return;
    }
    return inject(ApiConfig).load();
  });
}
