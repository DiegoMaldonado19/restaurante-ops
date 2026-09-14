import { Component, input } from '@angular/core';

@Component({
  selector: 'app-overdue-badge',
  template: `
    @if (overdue()) {
      <span
        class="inline-flex items-center gap-1 rounded-full bg-[#B5482A]/10 px-2 py-0.5 text-xs font-medium text-[#B5482A]"
      >
        ⏱ {{ minutes() }} min de retraso
      </span>
    }
  `,
})
export class OverdueBadge {
  readonly overdue = input.required<boolean>();
  readonly minutes = input.required<number>();
}
