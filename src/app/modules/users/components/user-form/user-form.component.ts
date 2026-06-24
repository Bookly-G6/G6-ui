import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Usuario } from '../../../../models/usuario.model';
import { UsuarioService } from '../../../../services/usuario.services';
import { NotificationService } from '../../../../services/notification';
import { RolService } from '../../../../services/rol.services';
import { Rol } from '../../../../models/rol.model';
import { finalize } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiErrorService } from '../../../../core/services/api-error.service';

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
  submitAttempted = false;
  roles: Rol[] = [];
  private readonly rolService = inject(RolService);

  constructor(
    private readonly fb: FormBuilder,
    private readonly usuarioService: UsuarioService,
    private readonly notification: NotificationService,
    private readonly apiErrorService: ApiErrorService,
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadRoles();

    if (this.userToEdit) {
      this.userForm.patchValue({
        nombre: this.userToEdit.nombre,
        apellido: this.userToEdit.apellido,
        email: this.userToEdit.email,
        dni: this.userToEdit.dni ?? '',
        telefono: this.userToEdit.telefono ?? '',
        activo: this.userToEdit.activo,
        rol: this.getRolTextValue(this.userToEdit),
      });
      this.userForm.get('password')?.clearValidators();
      this.userForm
        .get('password')
        ?.setValidators([Validators.minLength(6), Validators.maxLength(72)]);
      this.userForm.get('password')?.updateValueAndValidity();
    }
  }

  private requiredTrimmed(control: AbstractControl): { required: true } | null {
    const value = String(control.value ?? '').trim();
    return value.length > 0 ? null : { required: true };
  }

  private optionalPattern(pattern: RegExp) {
    return (control: AbstractControl): { pattern: true } | null => {
      const value = String(control.value ?? '').trim();
      if (!value) {
        return null;
      }

      return pattern.test(value) ? null : { pattern: true };
    };
  }

  isControlInvalid(controlName: string): boolean {
    const control = this.userForm.get(controlName);
    return Boolean(control?.invalid && (control.touched || control.dirty || this.submitAttempted));
  }

  private initForm(): void {
    this.userForm = this.fb.group({
      nombre: [
        '',
        [
          Validators.required,
          this.requiredTrimmed.bind(this),
          Validators.minLength(2),
          Validators.maxLength(80),
          Validators.pattern(/^[A-Za-zÁÉÍÓÚáéíóúÑñÜü'\-\s]+$/),
        ],
      ],
      apellido: [
        '',
        [
          Validators.required,
          this.requiredTrimmed.bind(this),
          Validators.minLength(2),
          Validators.maxLength(80),
          Validators.pattern(/^[A-Za-zÁÉÍÓÚáéíóúÑñÜü'\-\s]+$/),
        ],
      ],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(72)]],
      dni: ['', [this.optionalPattern(/^\d{8}$/)]],
      telefono: ['', [this.optionalPattern(/^\d{8,15}$/)]],
      activo: [true],
      rol: ['', [Validators.required, this.requiredTrimmed.bind(this)]],
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

  private getRolTextValue(usuario: Usuario): string {
    if (typeof usuario.rol === 'string') {
      return this.toBackendRoleValue(usuario.rol);
    }

    if (usuario.rol && typeof usuario.rol === 'object' && 'nombreRol' in usuario.rol) {
      return this.toBackendRoleValue(String(usuario.rol.nombreRol ?? ''));
    }

    return '';
  }

  private toBackendRoleValue(rawRole: string): string {
    const normalized = String(rawRole ?? '')
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/^ROLE_/, '')
      .replace(/[\s\-]+/g, '_');

    const roleMap: Record<string, string> = {
      ADMIN: 'ADMIN',
      ADMINISTRADOR: 'ADMIN',
      VENDEDOR: 'VENDEDOR',
      VENDOR: 'VENDEDOR',
      VENTAS: 'VENDEDOR',
      CLIENTE: 'CLIENTE',
      CUSTOMER: 'CLIENTE',
      USUARIO: 'CLIENTE',
    };

    return roleMap[normalized] ?? normalized;
  }

  toBackendRoleFromOption(rol: Rol): string {
    return this.toBackendRoleValue(rol.nombreRol ?? '');
  }

  private getRoleNameById(id: number): string {
    return this.roles.find((rol) => Number(rol.idRol) === Number(id))?.nombreRol ?? '';
  }

  private loadRoles(): void {
    this.rolService.getRoles().subscribe({
      next: (data) => {
        this.roles = Array.isArray(data) ? data : [];

        if (!this.userToEdit && this.roles.length > 0) {
          this.userForm.patchValue({ rol: this.toBackendRoleFromOption(this.roles[0]) });
        } else if (this.userToEdit) {
          const currentRol = String(this.userForm.get('rol')?.value ?? '').trim();
          if (currentRol) {
            return;
          }

          const roleNameFromId = this.getRoleNameById(this.getRolIdValue(this.userToEdit));
          if (roleNameFromId) {
            this.userForm.patchValue({ rol: roleNameFromId });
          }
        }
      },
      error: () => {
        this.notification.show('No se pudieron cargar los roles disponibles.', 'error');
      },
    });
  }

  private normalizeOptionalValue(value: unknown): string | undefined {
    const normalized = String(value ?? '').trim();
    return normalized ? normalized : undefined;
  }

  onSubmit(): void {
    this.submitAttempted = true;

    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      this.notification.show('Completa los campos obligatorios.', 'info');
      return;
    }

    this.isSubmitting = true;
    const formValue = this.userForm.getRawValue();
    const isEditing = Boolean(this.userToEdit && this.userToEdit.idUsuario);
    const normalizedPassword = this.normalizeOptionalValue(formValue.password);
    const normalizedDni = this.normalizeOptionalValue(formValue.dni);
    const normalizedTelefono = this.normalizeOptionalValue(formValue.telefono);

    const payload: Usuario = {
      nombre: String(formValue.nombre).trim(),
      apellido: String(formValue.apellido).trim(),
      email: String(formValue.email).trim().toLowerCase(),
      activo: formValue.activo,
      rol: this.toBackendRoleValue(String(formValue.rol)),
      ...(normalizedPassword ? { password: normalizedPassword } : {}),
      ...(normalizedDni ? { dni: normalizedDni } : {}),
      ...(normalizedTelefono ? { telefono: normalizedTelefono } : {}),
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

    request$
      .pipe(
        finalize(() => {
          this.isSubmitting = false;
        }),
      )
      .subscribe({
        next: () => {
          this.submitAttempted = false;
          this.notification.show(successMessage, 'success');
          this.saved.emit();
          this.close.emit();
        },
        error: (error: HttpErrorResponse) => {
          const parsedError = this.apiErrorService.parseError(error);
          const detail = this.apiErrorService.getHumanReadableMessage(parsedError);
          this.notification.show(`${errorMessage} ${detail}`, 'error');
        },
      });
  }

  onCancel(): void {
    this.close.emit();
  }
}
