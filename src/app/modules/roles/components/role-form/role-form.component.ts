import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Rol } from '../../../../models/rol.model';
import { RolService } from '../../../../services/rol.services';
import { NotificationService } from '../../../../services/notification';

@Component({
  selector: 'app-role-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './role-form.component.html',
  styleUrl: './role-form.component.css',
})
export class RoleFormComponent implements OnInit {
  @Input() roleToEdit: Rol | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  roleForm!: FormGroup;
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private rolService: RolService,
    private notification: NotificationService,
  ) {}

  ngOnInit(): void {
    this.initForm();

    if (this.roleToEdit) {
      this.roleForm.patchValue(this.roleToEdit);
    }
  }

  private initForm(): void {
    this.roleForm = this.fb.group({
      nombreRol: ['', [Validators.required, Validators.maxLength(80)]],
    });
  }

  onSubmit(): void {
    if (this.roleForm.invalid) {
      this.roleForm.markAllAsTouched();
      this.notification.show('Completa el nombre del rol.', 'info');
      return;
    }

    this.isSubmitting = true;
    const formValue = this.roleForm.value;
    const isEditing = Boolean(this.roleToEdit && this.roleToEdit.idRol);

    const payload: Rol = {
      nombreRol: formValue.nombreRol,
    };

    const request$ = isEditing
      ? this.rolService.updateRole(this.roleToEdit!.idRol!, payload)
      : this.rolService.createRole(payload);

    request$.subscribe({
      next: () => {
        this.isSubmitting = false;
        this.notification.show(
          isEditing ? 'Rol actualizado correctamente.' : 'Rol creado correctamente.',
          'success',
        );
        this.saved.emit();
        this.close.emit();
      },
      error: () => {
        this.isSubmitting = false;
        this.notification.show(
          isEditing ? 'No se pudo actualizar el rol.' : 'No se pudo crear el rol.',
          'error',
        );
      },
    });
  }

  onCancel(): void {
    this.close.emit();
  }
}
