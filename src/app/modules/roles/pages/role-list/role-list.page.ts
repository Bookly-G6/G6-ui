import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Rol } from '../../../../models/rol.model';
import { RolService } from '../../../../services/rol.services';
import { NotificationService } from '../../../../services/notification';
import { RoleFormComponent } from '../../components/role-form/role-form.component';
import { RoleDetailComponent } from '../../components/role-detail/role-detail.component';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-role-list',
  standalone: true,
  imports: [CommonModule, RoleFormComponent, RoleDetailComponent, ConfirmDialogComponent],
  templateUrl: './role-list.page.html',
  styleUrl: './role-list.page.css',
})
export class RoleListPage implements OnInit {
  roles: Rol[] = [];
  isModalOpen = false;
  selectedRole: Rol | null = null;
  isDetailOpen = false;
  selectedRoleId: number | null = null;
  isDeleteConfirmOpen = false;
  roleToDeleteId: number | null = null;

  constructor(
    private rolService: RolService,
    private notification: NotificationService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadRoles();
  }

  loadRoles(): void {
    this.rolService.getRoles().subscribe({
      next: (data) => {
        this.roles = Array.isArray(data) ? data : [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.notification.show('No se pudieron cargar los roles.', 'error');
      },
    });
  }

  openModal(role: Rol | null = null): void {
    this.selectedRole = role;
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.selectedRole = null;
    this.cdr.detectChanges();
  }

  openDetail(role: Rol): void {
    this.selectedRoleId = role.idRol ?? null;
    this.isDetailOpen = true;
    this.cdr.detectChanges();
  }

  closeDetail(): void {
    this.isDetailOpen = false;
    this.selectedRoleId = null;
  }

  requestDeleteRole(id: number | undefined): void {
    if (id === undefined || id === null) {
      this.notification.show('No se encontró el rol para eliminar.', 'info');
      return;
    }

    this.roleToDeleteId = id;
    this.isDeleteConfirmOpen = true;
  }

  confirmDelete(): void {
    if (this.roleToDeleteId === null) return;

    const idToDelete = this.roleToDeleteId;

    this.rolService.deleteRole(idToDelete).subscribe({
      next: () => {
        this.notification.show('Rol eliminado correctamente.', 'success');
        this.isDeleteConfirmOpen = false;
        this.roleToDeleteId = null;
        this.roles = this.roles.filter((role) => role.idRol !== idToDelete);
        this.cdr.detectChanges();
        this.loadRoles();
      },
      error: () => {
        this.notification.show('No se pudo eliminar el rol.', 'error');
        this.isDeleteConfirmOpen = false;
        this.roleToDeleteId = null;
      },
    });
  }

  cancelDelete(): void {
    this.isDeleteConfirmOpen = false;
    this.roleToDeleteId = null;
  }
}
