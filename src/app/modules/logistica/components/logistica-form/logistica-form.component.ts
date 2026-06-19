import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LogisticaService } from '../../../../services/logistica.service';
import { Logistica, TipoEnvio } from '../../../../models/logistica.model';
import { NotificationService } from '../../../../services/notification';

@Component({
  selector: 'app-logistica-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './logistica-form.component.html',
  styleUrls: ['./logistica-form.component.css'],
})
export class LogisticaFormComponent implements OnInit {
  @Input() logisticaToEdit: Logistica | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  logisticaForm!: FormGroup;
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private logisticaService: LogisticaService,
    private notification: NotificationService,
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.setupTypeValidation();

    if (this.logisticaToEdit) {
      this.logisticaForm.patchValue(this.logisticaToEdit);
    }
  }

  private initForm(): void {
    this.logisticaForm = this.fb.group({
      idVenta: ['', [Validators.required]],
      tipoEnvio: ['DOMICILIO', [Validators.required]],
      empresaCorreo: [''],
      numeroTracking: [''],
      observaciones: [''],
    });
  }

  private setupTypeValidation(): void {
    this.logisticaForm.get('tipoEnvio')?.valueChanges.subscribe(() => {
      this.updateValidation();
    });
    this.updateValidation();
  }

  private updateValidation(): void {
    const tipo = this.logisticaForm.get('tipoEnvio')?.value as TipoEnvio;

    const empresaCorreoControl = this.logisticaForm.get('empresaCorreo');
    const numeroTrackingControl = this.logisticaForm.get('numeroTracking');

    empresaCorreoControl?.clearValidators();
    numeroTrackingControl?.clearValidators();

    if (tipo === 'DOMICILIO') {
      empresaCorreoControl?.setValidators([Validators.required]);
      numeroTrackingControl?.setValidators([Validators.required]);
    }

    empresaCorreoControl?.updateValueAndValidity();
    numeroTrackingControl?.updateValueAndValidity();
  }

  onSubmit(): void {
    if (this.logisticaForm.invalid) {
      this.logisticaForm.markAllAsTouched();
      this.notification.show('Completa los campos obligatorios.', 'info');
      return;
    }

    this.isSubmitting = true;
    const formValue = this.logisticaForm.value;
    const payload = this.buildPayload(formValue);
    const isEditing = Boolean(this.logisticaToEdit && this.logisticaToEdit.idEnvio);

    const successMessage = isEditing
      ? 'La orden logística se actualizó correctamente.'
      : 'La orden logística se creó correctamente.';

    const errorMessage = isEditing
      ? 'No se pudo actualizar la orden logística.'
      : 'No se pudo crear la orden logística.';

    const request = isEditing
      ? this.logisticaService.updateLogistica(this.logisticaToEdit!.idEnvio!, payload)
      : this.logisticaService.createLogistica(payload);

    request.subscribe({
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

  private buildPayload(formValue: Logistica): Logistica {
    const payload: Logistica = {
      idVenta: formValue.idVenta,
      tipoEnvio: formValue.tipoEnvio,
      observaciones: formValue.observaciones || undefined,
    };

    if (formValue.tipoEnvio === 'DOMICILIO') {
      payload.empresaCorreo = formValue.empresaCorreo;
      payload.numeroTracking = formValue.numeroTracking;
    }

    return payload;
  }

  onCancel(): void {
    this.close.emit();
  }
}
