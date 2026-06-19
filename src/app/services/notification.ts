import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

// Estructura estricta para nuestras alertas personalizadas
export interface AlertMessage {
  text: string;
  type: 'success' | 'error' | 'info';
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  // El BehaviorSubject arranca en null (sin alertas en pantalla)
  private alert$ = new BehaviorSubject<AlertMessage | null>(null);
  currentAlert = this.alert$.asObservable();

  // Método para disparar la alerta desde cualquier componente
  show(text: string, type: 'success' | 'error' | 'info' = 'success', duration = 3000) {
    this.alert$.next({ text, type });
    setTimeout(() => this.clear(), duration); // Se limpia automáticamente
  }

  clear() {
    this.alert$.next(null);
  }
}
