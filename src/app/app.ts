import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './shared/components/toast/toast.component';
import { AuthSessionService } from './core/services/auth-session.service';
import { GlobalLoadingComponent } from './shared/components/global-loading/global-loading.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent, GlobalLoadingComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly authSession = inject(AuthSessionService);

  constructor() {
    if (!this.authSession.hasToken()) {
      return;
    }

    this.authSession.syncCurrentUser().subscribe({
      error: () => {
        // El servicio ya limpia la sesión ante token inválido/expirado.
      },
    });
  }
}
