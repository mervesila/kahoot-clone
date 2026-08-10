import { inject } from '@angular/core';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, Observable, throwError } from 'rxjs';
import { getToken } from './api.service';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const router = inject(Router);
  const auth = inject(AuthService);
  const token = getToken();

  const authReq =
    token && !req.headers.has('Authorization')
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(authReq).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        const isAdminCall = req.url.includes('/api/admin/');
        const onLogin = router.url === '/login' || router.url === '/admin';
        if (isAdminCall && !onLogin) {
          auth.logout();
          void router.navigate(['/login'], { replaceUrl: true });
        }
      }
      return throwError(() => error);
    }),
  );
};
