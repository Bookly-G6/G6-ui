import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Usuario } from '../../../../models/usuario.model';
import { UsuarioService } from '../../../../services/usuario.services';
import { NotificationService } from '../../../../services/notification';
import { UserFormComponent } from '../../components/user-form/user-form.component';
import { UserDetailComponent } from '../../components/user-detail/user-detail.component';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, UserFormComponent, UserDetailComponent, ConfirmDialogComponent],
  templateUrl: './user-list.page.html',
  styleUrl: './user-list.page.css',
})
export class UserListPage implements OnInit {
  usuarios: Usuario[] = [];
  isModalOpen = false;
  selectedUsuario: Usuario | null = null;
  isDetailOpen = false;
  selectedUsuarioId: string | null = null;
  isDeleteConfirmOpen = false;
  usuarioToDeleteId: string | null = null;

  constructor(
    private usuarioService: UsuarioService,
    private notification: NotificationService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadUsuarios();
  }

  loadUsuarios(): void {
    this.usuarioService.getUsuarios().subscribe({
      next: (data) => {
        this.usuarios = Array.isArray(data) ? data : [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.notification.show('No se pudieron cargar los usuarios.', 'error');
      },
    });
  }

  openModal(usuario: Usuario | null = null): void {
    this.selectedUsuario = usuario;
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.selectedUsuario = null;
    this.cdr.detectChanges();
  }

  openDetail(usuario: Usuario): void {
    this.selectedUsuarioId = usuario.idUsuario ?? null;
    this.isDetailOpen = true;
    this.cdr.detectChanges();
  }

  closeDetail(): void {
    this.isDetailOpen = false;
    this.selectedUsuarioId = null;
  }

  getRolDisplayName(usuario: Usuario): string {
    if (typeof usuario.rol === 'string') {
      return usuario.rol;
    }

    if (usuario.rol && typeof usuario.rol === 'object' && 'nombreRol' in usuario.rol) {
      return usuario.rol.nombreRol;
    }

    if (typeof usuario.idRol === 'number') {
      return `Rol ${usuario.idRol}`;
    }

    return 'Sin rol';
  }

  requestDeleteUsuario(id: string | undefined): void {
    if (!id) {
      this.notification.show('No se encontró el usuario para dar de baja.', 'info');
      return;
    }

    this.usuarioToDeleteId = id;
    this.isDeleteConfirmOpen = true;
  }

  confirmDelete(): void {
    if (!this.usuarioToDeleteId) return;

    const idToDelete = this.usuarioToDeleteId;

    this.usuarioService.deleteUsuario(idToDelete).subscribe({
      next: () => {
        this.notification.show('Usuario dado de baja correctamente.', 'success');
        this.isDeleteConfirmOpen = false;
        this.usuarioToDeleteId = null;
        this.usuarios = this.usuarios.filter((usuario) => usuario.idUsuario !== idToDelete);
        this.cdr.detectChanges();
        this.loadUsuarios();
      },
      error: () => {
        this.notification.show('No se pudo dar de baja el usuario.', 'error');
        this.isDeleteConfirmOpen = false;
        this.usuarioToDeleteId = null;
      },
    });
  }

  cancelDelete(): void {
    this.isDeleteConfirmOpen = false;
    this.usuarioToDeleteId = null;
  }
}
