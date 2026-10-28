import { Component, inject } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  templateUrl: './toast-container.html',
  styleUrl: './toast-container.css',
})
export class ToastContainer {
  protected readonly toastService = inject(ToastService);

  iconFor(type: string): string {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '⚠';
      default:
        return 'ℹ';
    }
  }
}
