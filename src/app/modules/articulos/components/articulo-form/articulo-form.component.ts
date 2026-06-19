import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Articulo } from '../../../../models/articulo.model';
import { ArticuloService } from '../../../../services/articulo.services';
import { NotificationService } from '../../../../services/notification';

@Component({
  selector: 'app-articulo-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './articulo-form.component.html',
  styleUrl: './articulo-form.component.css',
})
export class ArticuloFormComponent implements OnInit {
  @Input() articuloToEdit: Articulo | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  articuloForm!: FormGroup;
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private articuloService: ArticuloService,
    private notification: NotificationService,
  ) {}

  ngOnInit(): void {
    this.initForm();
    if (this.articuloToEdit) {
      this.articuloForm.patchValue(this.articuloToEdit);
    }
  }

  private initForm(): void {
    this.articuloForm = this.fb.group({
      nombreArticulo: ['', [Validators.required, Validators.maxLength(120)]],
      descripcion: ['', [Validators.required, Validators.maxLength(250)]],
      codigoBarras: ['', [Validators.required, Validators.maxLength(50)]],
    });
  }

  onSubmit(): void {
    if (this.articuloForm.invalid) {
      this.articuloForm.markAllAsTouched();
      this.notification.show('Completa los campos obligatorios.', 'info');
      return;
    }

    this.isSubmitting = true;
    const formValue = this.articuloForm.value;
    const isEditing = Boolean(this.articuloToEdit && this.articuloToEdit.idArticulo);

    const payload: Articulo = {
      nombreArticulo: formValue.nombreArticulo,
      descripcion: formValue.descripcion,
      codigoBarras: formValue.codigoBarras,
      activo: true,
    };

    const request$ = isEditing
      ? this.articuloService.updateArticulo(this.articuloToEdit!.idArticulo!, {
          nombreArticulo: formValue.nombreArticulo,
          descripcion: formValue.descripcion,
          codigoBarras: formValue.codigoBarras,
          activo: true,
        })
      : this.articuloService.createArticulo(payload);

    request$.subscribe({
      next: () => {
        this.isSubmitting = false;
        this.notification.show(
          isEditing ? 'Artículo actualizado correctamente.' : 'Artículo creado correctamente.',
          'success',
        );
        this.saved.emit();
        this.close.emit();
      },
      error: () => {
        this.isSubmitting = false;
        this.notification.show(
          isEditing ? 'No se pudo actualizar el artículo.' : 'No se pudo crear el artículo.',
          'error',
        );
      },
    });
  }

  onCancel(): void {
    this.close.emit();
  }
}
