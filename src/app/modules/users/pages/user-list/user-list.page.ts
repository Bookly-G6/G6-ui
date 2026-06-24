import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Usuario } from '../../../../models/usuario.model';
import { UsuarioService } from '../../../../services/usuario.services';
import { NotificationService } from '../../../../services/notification';
import { UserFormComponent } from '../../components/user-form/user-form.component';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, FormsModule, UserFormComponent, ConfirmDialogComponent],
  templateUrl: './user-list.page.html',
  styleUrl: './user-list.page.css',
})
export class UserListPage implements OnInit {
  usuarios: Usuario[] = [];
  isModalOpen = false;
  selectedUsuario: Usuario | null = null;
  isDeleteConfirmOpen = false;
  usuarioToDeleteId: string | null = null;

  searchTerm = '';
  currentPage = 1;
  pageSize = 10;

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
        this.currentPage = Math.min(this.currentPage, this.totalPages);
        this.cdr.detectChanges();
      },
      error: () => {
        this.notification.show('No se pudieron cargar los usuarios.', 'error');
      },
    });
  }

  get filteredUsuarios(): Usuario[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return this.usuarios;

    return this.usuarios.filter(
      (usuario) =>
        (usuario.nombre ?? '').toLowerCase().includes(term) ||
        (usuario.apellido ?? '').toLowerCase().includes(term) ||
        (usuario.email ?? '').toLowerCase().includes(term) ||
        (usuario.dni ?? '').toLowerCase().includes(term) ||
        (usuario.telefono ?? '').toLowerCase().includes(term) ||
        this.getRolDisplayName(usuario).toLowerCase().includes(term),
    );
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredUsuarios.length / this.pageSize));
  }

  get paginatedUsuarios(): Usuario[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredUsuarios.slice(start, start + this.pageSize);
  }

  onSearchChange(): void {
    this.currentPage = 1;
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
  }

  prevPage(): void {
    this.goToPage(this.currentPage - 1);
  }

  nextPage(): void {
    this.goToPage(this.currentPage + 1);
  }

  private readonly exportHeaders = ['Usuario', 'Email', 'DNI', 'Telefono', 'Rol', 'Estado'];

  private getExportRows(): string[][] {
    return this.filteredUsuarios.map((usuario) => [
      this.getFullName(usuario),
      usuario.email ?? '',
      usuario.dni ?? '',
      usuario.telefono ?? '',
      this.getRolDisplayName(usuario),
      usuario.activo ? 'Activo' : 'Inactivo',
    ]);
  }

  exportPdf(): void {
    const doc = new jsPDF();
    doc.text('Listado de usuarios', 14, 15);
    autoTable(doc, {
      head: [this.exportHeaders],
      body: this.getExportRows(),
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 58, 138] },
    });
    doc.save('usuarios.pdf');
  }

  exportExcel(): void {
    const worksheet = XLSX.utils.aoa_to_sheet([this.exportHeaders, ...this.getExportRows()]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Usuarios');
    XLSX.writeFile(workbook, 'usuarios.xlsx');
  }

  exportCsv(): void {
    const worksheet = XLSX.utils.aoa_to_sheet([this.exportHeaders, ...this.getExportRows()]);
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'usuarios.csv';
    link.click();
    URL.revokeObjectURL(url);
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

  getFullName(usuario: Usuario): string {
    return [usuario.nombre, usuario.apellido].filter(Boolean).join(' ');
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
        this.currentPage = Math.min(this.currentPage, this.totalPages);
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
