import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Usuario } from '../../../../models/usuario.model';
import { UsuarioService } from '../../../../services/usuario.services';
import { NotificationService } from '../../../../services/notification';
import { RolService } from '../../../../services/rol.services';
import { Rol } from '../../../../models/rol.model';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './user-form.component.html',
  styleUrl: './user-form.component.css',
})
export class UserFormComponent implements OnInit {
  @Input() userToEdit: Usuario | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  userForm!: FormGroup;
  isSubmitting = false;
  roles: Rol[] = [];
  private readonly rolService = inject(RolService);

  constructor(
    private readonly fb: FormBuilder,
    private readonly usuarioService: UsuarioService,
    private readonly notification: NotificationService,
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadRoles();

    if (this.userToEdit) {
      this.userForm.patchValue({
        nombre: this.userToEdit.nombre,
        apellido: this.userToEdit.apellido,
        email: this.userToEdit.email,
        activo: this.userToEdit.activo,
        idRol: this.getRolIdValue(this.userToEdit),
      });
      this.userForm.get('password')?.clearValidators();
      this.userForm.get('password')?.setValidators([Validators.minLength(6)]);
      this.userForm.get('password')?.updateValueAndValidity();
    }
  }

  private initForm(): void {
    this.userForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(80)]],
      apellido: ['', [Validators.required, Validators.maxLength(80)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      activo: [true],
      idRol: [1, [Validators.required]],
    });
  }

  private getRolIdValue(usuario: Usuario): number {
    if (typeof usuario.idRol === 'number') {
      return usuario.idRol;
    }

    if (usuario.rol && typeof usuario.rol === 'object' && 'idRol' in usuario.rol) {
      return usuario.rol.idRol as number;
    }

    return 1;
  }

  private loadRoles(): void {
    this.rolService.getRoles().subscribe({
      next: (data) => {
        this.roles = Array.isArray(data) ? data : [];

        if (!this.userToEdit && this.roles.length > 0) {
          this.userForm.patchValue({ idRol: this.roles[0].idRol ?? 1 });
        } else if (this.userToEdit) {
          this.userForm.patchValue({ idRol: this.getRolIdValue(this.userToEdit) });
        }
      },
      error: () => {
        this.notification.show('No se pudieron cargar los roles disponibles.', 'error');
      },
    });
  }

  onSubmit(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      this.notification.show('Completa los campos obligatorios.', 'info');
      return;
    }

    this.isSubmitting = true;
    const formValue = this.userForm.value;
    const isEditing = Boolean(this.userToEdit && this.userToEdit.idUsuario);

    const payload: Usuario = {
      nombre: formValue.nombre,
      apellido: formValue.apellido,
      email: formValue.email,
      activo: formValue.activo,
      idRol: Number(formValue.idRol),
      ...(formValue.password ? { password: formValue.password } : {}),
    };

    const successMessage = isEditing
      ? 'Usuario actualizado correctamente.'
      : 'Usuario creado correctamente.';

    const errorMessage = isEditing
      ? 'No se pudo actualizar el usuario.'
      : 'No se pudo crear el usuario.';

    const request$ = isEditing
      ? this.usuarioService.updateUsuario(this.userToEdit!.idUsuario!, payload)
      : this.usuarioService.createUsuario(payload);

    request$.subscribe({
      next: () => {
        this.isSubmitting = false;
        this.notification.show(successMessage, 'success');
        this.saved.emit();
        this.close.emit();
      },
      error: () => {
        this.isSubmitting = false;
        this.notification.show(errorMessage, 'error');
      },
    });
  }

  onCancel(): void {
    this.close.emit();
  }
}
