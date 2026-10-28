import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { friendlyError } from '../../../shared/utils/error.util';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './admin-login.html',
  styleUrl: './admin-login.css',
})
export class AdminLogin {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly submitting = signal(false);
  protected readonly submitError = signal('');

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

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

    this.submitting.set(true);
    this.auth.login(this.form.getRawValue()).subscribe({
      next: (res) => {
        this.submitting.set(false);
        if (res.user.role !== 'admin') {
          this.auth.logout();
          this.submitError.set('This account does not have admin access.');
          return;
        }
        this.toast.success(`Welcome back, ${res.user.name.split(' ')[0]}!`);
        this.router.navigateByUrl('/admin/dashboard');
      },
      error: (err) => {
        this.submitting.set(false);
        this.submitError.set(friendlyError(err, 'Login failed. Please check your credentials.'));
      },
    });
  }
}
