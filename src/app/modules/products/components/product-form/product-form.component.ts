import { Component, EventEmitter, Output, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ProductService, ProductUpsertPayload } from '../../../../services/product.services';
import { Product } from '../../../../models/product.model';
import { NotificationService } from '../../../../services/notification';
import { CatalogSettingsService } from '../../../../services/catalog-settings.service';
import {
  AutorArtista,
  Categoria,
  EditorialSello,
  RangoEtario,
  TipoProducto,
} from '../../../../models/catalog.model';
import { catchError, forkJoin, of } from 'rxjs';

interface AttributeRow {
  key: string;
  value: string;
}

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './product-form.component.html',
  styleUrl: './product-form.component.css',
})
export class ProductFormComponent implements OnInit {
  @Input() productToEdit: Product | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  productForm!: FormGroup;
  isSubmitting = false;
  tiposProducto: TipoProducto[] = [];
  editoriales: EditorialSello[] = [];
  rangosEtarios: RangoEtario[] = [];
  categorias: Categoria[] = [];
  autores: AutorArtista[] = [];
  loadingCatalogs = false;
  attributeRows: AttributeRow[] = [{ key: '', value: '' }];

  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    private catalogSettings: CatalogSettingsService,
    private notification: NotificationService,
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadCatalogs();
    // Si viene un producto para editar, se cargan los datos en el formulario
    if (this.productToEdit) {
      this.productForm.patchValue({
        ...this.productToEdit,
        idsCategorias: [],
        idsAutores: [],
      });
      this.initAttributeRowsFromProduct(this.productToEdit.atributosEspecificos);
    }
  }

  private initForm(): void {
    this.productForm = this.fb.group({
      codigoBarras: ['', [Validators.required, Validators.minLength(8)]],
      nombreProducto: ['', [Validators.required, Validators.maxLength(100)]],
      descripcion: [''],
      precioCosto: [null],
      precioActual: [1, [Validators.required, Validators.min(0.01)]],
      activo: [true],
      idTipoProducto: [1, [Validators.required]],
      idEditorialSello: [1, [Validators.required]],
      idRangoEtario: [1, [Validators.required]],
      idsCategorias: [[], [Validators.required]],
      idsAutores: [[]],
    });
  }

  addAttributeRow(): void {
    this.attributeRows = [...this.attributeRows, { key: '', value: '' }];
  }

  removeAttributeRow(index: number): void {
    const next = this.attributeRows.filter((_, idx) => idx !== index);
    this.attributeRows = next.length > 0 ? next : [{ key: '', value: '' }];
  }

  setAttributeKey(index: number, value: string): void {
    this.attributeRows = this.attributeRows.map((row, idx) =>
      idx === index ? { ...row, key: value } : row,
    );
  }

  setAttributeValue(index: number, value: string): void {
    this.attributeRows = this.attributeRows.map((row, idx) =>
      idx === index ? { ...row, value } : row,
    );
  }

  private loadCatalogs(): void {
    this.loadingCatalogs = true;

    forkJoin({
      tiposProducto: this.catalogSettings.getTiposProducto().pipe(catchError(() => of([]))),
      editoriales: this.catalogSettings.getEditoriales().pipe(catchError(() => of([]))),
      rangosEtarios: this.catalogSettings.getRangosEtarios().pipe(catchError(() => of([]))),
      categorias: this.catalogSettings.getCategorias().pipe(catchError(() => of([]))),
      autores: this.catalogSettings.getAutores().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ tiposProducto, editoriales, rangosEtarios, categorias, autores }) => {
        this.tiposProducto = tiposProducto;
        this.editoriales = editoriales;
        this.rangosEtarios = rangosEtarios;
        this.categorias = categorias;
        this.autores = autores;

        if (!this.productToEdit) {
          if (tiposProducto.length > 0) {
            this.productForm.patchValue({ idTipoProducto: tiposProducto[0].idTipoProducto });
          }
          if (editoriales.length > 0) {
            this.productForm.patchValue({ idEditorialSello: editoriales[0].idEditorialSello });
          }
          if (rangosEtarios.length > 0) {
            this.productForm.patchValue({ idRangoEtario: rangosEtarios[0].idRangoEtario });
          }
        }
        this.loadingCatalogs = false;
      },
      error: () => {
        this.loadingCatalogs = false;
        this.notification.show('No se pudieron cargar listas maestras del producto.', 'error');
      },
    });
  }

  toggleMultiSelection(controlName: 'idsCategorias' | 'idsAutores', id: number): void {
    const current = (this.productForm.get(controlName)?.value as number[]) ?? [];
    const exists = current.includes(id);
    const updated = exists ? current.filter((value) => value !== id) : [...current, id];
    this.productForm.get(controlName)?.setValue(updated);
    this.productForm.get(controlName)?.markAsTouched();
  }

  isSelected(controlName: 'idsCategorias' | 'idsAutores', id: number): boolean {
    const current = (this.productForm.get(controlName)?.value as number[]) ?? [];
    return current.includes(id);
  }

  private initAttributeRowsFromProduct(
    atributosEspecificos: Record<string, unknown> | undefined,
  ): void {
    if (!atributosEspecificos || Object.keys(atributosEspecificos).length === 0) {
      this.attributeRows = [{ key: '', value: '' }];
      return;
    }

    this.attributeRows = Object.entries(atributosEspecificos).map(([key, value]) => ({
      key,
      value:
        typeof value === 'string'
          ? value
          : typeof value === 'number' || typeof value === 'boolean'
            ? String(value)
            : JSON.stringify(value),
    }));
  }

  private parseAttributeValue(rawValue: string): unknown {
    const trimmed = rawValue.trim();

    if (trimmed === '') {
      return '';
    }

    if (trimmed === 'true') {
      return true;
    }

    if (trimmed === 'false') {
      return false;
    }

    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      return Number(trimmed);
    }

    if (
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
      try {
        return JSON.parse(trimmed);
      } catch {
        return trimmed;
      }
    }

    return trimmed;
  }

  private buildAtributosEspecificosFromRows(): Record<string, unknown> {
    const attributes: Record<string, unknown> = {};

    this.attributeRows.forEach((row) => {
      const key = row.key.trim();
      if (!key) {
        return;
      }
      attributes[key] = this.parseAttributeValue(row.value ?? '');
    });

    return attributes;
  }

  onSubmit(): void {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      this.notification.show('Completa los campos obligatorios.', 'info');
      return;
    }

    this.isSubmitting = true;
    const raw = this.productForm.getRawValue();
    const atributosEspecificos = this.buildAtributosEspecificosFromRows();

    const productData: ProductUpsertPayload = {
      codigoBarras: raw.codigoBarras,
      nombreProducto: raw.nombreProducto,
      descripcion: raw.descripcion,
      precioCosto: raw.precioCosto ? Number(raw.precioCosto) : undefined,
      precioActual: Number(raw.precioActual),
      activo: Boolean(raw.activo),
      idTipoProducto: Number(raw.idTipoProducto),
      idEditorialSello: Number(raw.idEditorialSello),
      idRangoEtario: Number(raw.idRangoEtario),
      idsCategorias: (raw.idsCategorias ?? []).map((id: number | string) => Number(id)),
      idsAutores: (raw.idsAutores ?? []).map((id: number | string) => Number(id)),
      atributosEspecificos,
    };

    const isEditing = Boolean(this.productToEdit && this.productToEdit.idProducto);

    const successMessage = isEditing
      ? '¡Producto actualizado con éxito!'
      : '¡Producto registrado con éxito!';

    const errorMessage = isEditing
      ? 'No se pudo actualizar el producto. Intenta nuevamente.'
      : 'No se pudo crear el producto. Intenta nuevamente.';

    if (isEditing) {
      this.productService.updateProduct(this.productToEdit!.idProducto!, productData).subscribe({
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
    } else {
      this.productService.createProduct(productData).subscribe({
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
  }

  onCancel(): void {
    this.close.emit();
  }
}
