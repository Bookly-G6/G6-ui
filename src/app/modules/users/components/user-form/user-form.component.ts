import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Usuario } from '../../../../models/usuario.model';
import { UsuarioService } from '../../../../services/usuario.services';
import { NotificationService } from '../../../../services/notification';

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

  constructor(
    private fb: FormBuilder,
    private usuarioService: UsuarioService,
    private notification: NotificationService,
  ) {}

  ngOnInit(): void {
    this.initForm();
    if (this.userToEdit) {
      this.userForm.patchValue(this.userToEdit);
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
      rol: formValue.rol,
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
