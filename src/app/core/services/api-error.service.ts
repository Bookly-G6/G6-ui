import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

export interface ApiError {
  timestamp?: string;
  status: number;
  error: string;
  code: string;
  message: string;
  path?: string;
  details?: string[];
}

@Injectable({ providedIn: 'root' })
export class ApiErrorService {
  parseError(errorResponse: HttpErrorResponse): ApiError {
    const body = errorResponse.error || {};

    return {
      status: errorResponse.status,
      error: body.error || errorResponse.statusText || 'Unknown Error',
      code: body.code || this.getDefaultCode(errorResponse.status),
      message: body.message || this.getDefaultMessage(errorResponse.status),
      path: body.path,
      details: body.details || [],
      timestamp: body.timestamp,
    };
  }

  getHumanReadableMessage(error: ApiError): string {
    const statusMessages: Record<string, string> = {
      VALIDATION_ERROR: 'Hay errores en el formulario. Revisa los campos.',
      AUTH_REQUIRED: 'Debes estar autenticado para acceder a este recurso.',
      TOKEN_INVALID: 'Tu sesión no es válida. Por favor, inicia sesión nuevamente.',
      TOKEN_EXPIRED: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
      INSUFFICIENT_ROLE: 'No tienes permisos suficientes para esta acción.',
      ACCESS_DENIED: 'Acceso denegado.',
      RESOURCE_NOT_FOUND: 'El recurso solicitado no existe.',
      DATA_CONFLICT: 'Hay un conflicto en los datos. Por favor, intenta nuevamente.',
      INTERNAL_ERROR: 'Ha ocurrido un error en el servidor. Por favor, intenta más tarde.',
    };

    return statusMessages[error.code] || error.message || 'Ocurrió un error inesperado.';
  }

  private getDefaultCode(status: number): string {
    const codeMap: Record<number, string> = {
      400: 'VALIDATION_ERROR',
      401: 'AUTH_REQUIRED',
      403: 'ACCESS_DENIED',
      404: 'RESOURCE_NOT_FOUND',
      409: 'DATA_CONFLICT',
      500: 'INTERNAL_ERROR',
    };
    return codeMap[status] || 'UNKNOWN_ERROR';
  }

  private getDefaultMessage(status: number): string {
    const messageMap: Record<number, string> = {
      400: 'Solicitud inválida.',
      401: 'Se requiere autenticación.',
      403: 'Acceso denegado.',
      404: 'Recurso no encontrado.',
      409: 'Conflicto en los datos.',
      500: 'Error interno del servidor.',
    };
    return messageMap[status] || 'Ha ocurrido un error.';
  }
}
