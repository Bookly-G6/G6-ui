import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Usuario } from '../../../../models/usuario.model';
import { UsuarioService } from '../../../../services/usuario.services';
import { NotificationService } from '../../../../services/notification';

@Component({
  selector: 'app-user-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-detail.component.html',
  styleUrl: './user-detail.component.css',
})
export class UserDetailComponent implements OnInit, OnChanges {
  @Input() userId: string | null = null;
  @Output() close = new EventEmitter<void>();

  user: Usuario | null = null;
  isLoading = false;

  constructor(
    private usuarioService: UsuarioService,
    private notification: NotificationService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    if (this.userId) {
      this.loadUser();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['userId'] && this.userId) {
      this.loadUser();
    }
  }

  private loadUser(): void {
    if (!this.userId) return;

    this.isLoading = true;
    this.usuarioService.getUsuarioById(this.userId).subscribe({
      next: (response) => {
        this.user = response;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.user = null;
        this.cdr.detectChanges();
        this.notification.show('No se pudo cargar la información del usuario.', 'error');
      },
    });
  }

  getRolDisplayName(): string {
    if (!this.user) {
      return 'Sin rol';
    }

    if (typeof this.user.rol === 'string') {
      return this.user.rol;
    }

    if (this.user.rol && typeof this.user.rol === 'object' && 'nombreRol' in this.user.rol) {
      return this.user.rol.nombreRol;
    }

    return this.user.idRol ? `Rol ${this.user.idRol}` : 'Sin rol';
  }

  onClose(): void {
    this.close.emit();
  }
}
