import { Injectable, signal } from '@angular/core';

export interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  danger: boolean;
}

interface PendingConfirm extends ConfirmRequest {
  resolve: (result: boolean) => void;
}

export interface ConfirmOptions {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  private readonly pendingSignal = signal<PendingConfirm | null>(null);
  readonly pending = this.pendingSignal.asReadonly();

  confirm(message: string, options: ConfirmOptions = {}): Promise<boolean> {
    return new Promise((resolve) => {
      this.pendingSignal.set({
        title: options.title ?? 'Please confirm',
        message,
        confirmLabel: options.confirmLabel ?? 'Confirm',
        cancelLabel: options.cancelLabel ?? 'Cancel',
        danger: options.danger ?? false,
        resolve,
      });
    });
  }

  resolve(result: boolean): void {
    const current = this.pendingSignal();
    if (!current) return;
    this.pendingSignal.set(null);
    current.resolve(result);
  }
}
