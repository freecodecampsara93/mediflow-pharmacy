import { CurrencyPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { OrderService } from '../../core/services/order.service';
import { ToastService } from '../../core/services/toast.service';
import { PaymentMethod } from '../../models';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { LoadingSpinner } from '../../shared/components/loading-spinner/loading-spinner';
import { friendlyError } from '../../shared/utils/error.util';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, CurrencyPipe, LoadingSpinner, EmptyState],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css',
})
export class Checkout implements OnInit {
  private readonly fb = inject(FormBuilder);
  protected readonly cartService = inject(CartService);
  private readonly orderService = inject(OrderService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly submitError = signal('');

  protected readonly form = this.fb.nonNullable.group({
    shippingName: [this.auth.user()?.name ?? '', [Validators.required, Validators.minLength(2)]],
    shippingPhone: [this.auth.user()?.phone ?? '', [Validators.required, Validators.minLength(6)]],
    shippingAddress: [this.auth.user()?.address ?? '', [Validators.required, Validators.minLength(8)]],
    paymentMethod: ['cash_on_delivery' as PaymentMethod, Validators.required],
  });

  ngOnInit(): void {
    this.cartService.refresh().subscribe({
      next: () => this.loading.set(false),
      error: () => this.loading.set(false),
    });
  }

  get cartEmpty(): boolean {
    return this.cartService.cart().items.length === 0;
  }

  get hasUnavailableItems(): boolean {
    return this.cartService
      .cart()
      .items.some((item) => !item.active || item.quantity > item.availableStock);
  }

  field(name: string) {
    return this.form.get(name);
  }

  isInvalid(name: string): boolean {
    const control = this.field(name);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  submit(): void {
    this.submitError.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.cartEmpty) {
      this.submitError.set('Your cart is empty.');
      return;
    }
    if (this.hasUnavailableItems) {
      this.submitError.set('Some items in your cart are no longer available or exceed available stock. Please update your cart.');
      return;
    }

    this.submitting.set(true);
    this.orderService.create(this.form.getRawValue()).subscribe({
      next: (res) => {
        this.submitting.set(false);
        this.cartService.reset();
        this.toast.success('Order placed successfully!');
        this.router.navigate(['/orders', res.data.id]);
      },
      error: (err) => {
        this.submitting.set(false);
        this.submitError.set(friendlyError(err, 'Could not place your order.'));
      },
    });
  }
}
