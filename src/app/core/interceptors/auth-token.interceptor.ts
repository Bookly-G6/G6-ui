import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthSessionService } from '../services/auth-session.service';
import { NotificationService } from '../../services/notification';

export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const authSession = inject(AuthSessionService);
  const notification = inject(NotificationService);
  const token = authSession.getToken();

  const isAuthCall = req.url.includes('/auth/login') || req.url.includes('/auth/register');

  if (!token || isAuthCall) {
    return next(req).pipe(
      catchError((error: HttpErrorResponse) => {
        handleApiError(error, notification);
        return throwError(() => error);
      }),
    );
  }

  const authorizedReq = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });

  return next(authorizedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      handleApiError(error, notification, authSession);
      return throwError(() => error);
    }),
  );
};

function handleApiError(
  error: HttpErrorResponse,
  notification: NotificationService,
  authSession?: AuthSessionService,
): void {
  const body = error.error || {};
  const message = body.message || body.error || 'Error en la solicitud';
  const code = body.code || '';
  const details = body.details || [];

  let displayMessage = message;
  if (details && details.length > 0) {
    displayMessage = `${message}\n${details.join('\n')}`;
  }

  if (error.status === 401) {
    authSession?.logout();
    notification.show('Sesión expirada. Por favor, inicia sesión nuevamente.', 'error');
  } else if (error.status === 403) {
    notification.show(displayMessage || 'No tienes permisos para esta acción.', 'error');
  } else if (error.status === 400) {
    notification.show(displayMessage || 'Hay errores en la solicitud.', 'error');
  } else if (error.status === 404) {
    notification.show(displayMessage || 'El recurso no fue encontrado.', 'error');
  } else if (error.status >= 500) {
    notification.show(
      displayMessage || 'Error en el servidor. Por favor, intenta más tarde.',
      'error',
    );
  }
}
