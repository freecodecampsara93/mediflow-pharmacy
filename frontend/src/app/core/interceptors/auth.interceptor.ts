import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.token();

  const authedReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authedReq).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        const wasLoggedIn = auth.isAuthenticated();
        auth.logout();
        if (wasLoggedIn) {
          const isAdminArea = router.url.startsWith('/admin');
          router.navigate([isAdminArea ? '/admin/login' : '/login']);
        }
      }
      return throwError(() => error);
    })
  );
};
