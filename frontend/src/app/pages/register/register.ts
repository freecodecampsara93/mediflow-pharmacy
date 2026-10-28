import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { friendlyError } from '../../shared/utils/error.util';

function matchPasswords(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirm = control.get('confirmPassword')?.value;
  return password && confirm && password !== confirm ? { mismatch: true } : null;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly submitting = signal(false);
  protected readonly submitError = signal('');

  protected readonly form = this.fb.nonNullable.group(
    {
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      address: [''],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: matchPasswords }
  );

  field(name: string) {
    return this.form.get(name);
  }

  isInvalid(name: string): boolean {
    const control = this.field(name);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  get passwordsMismatch(): boolean {
    return this.form.hasError('mismatch') && !!this.field('confirmPassword')?.touched;
  }

  submit(): void {
    this.submitError.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { confirmPassword, ...payload } = this.form.getRawValue();
    void confirmPassword;

    this.submitting.set(true);
    this.auth.register(payload).subscribe({
      next: (res) => {
        this.submitting.set(false);
        this.toast.success(`Welcome to MediFlow, ${res.user.name.split(' ')[0]}!`);
        this.router.navigateByUrl('/');
      },
      error: (err) => {
        this.submitting.set(false);
        this.submitError.set(friendlyError(err, 'Registration failed. Please try again.'));
      },
    });
  }
}
