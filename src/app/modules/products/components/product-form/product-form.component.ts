import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
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
import { catchError, finalize, forkJoin, of } from 'rxjs';
import {
  PRODUCT_ATTRIBUTES_CONFIG,
  ProductAttributeConfig,
} from '../../../../core/constants/business-options';

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
export class ProductFormComponent implements OnInit, OnChanges {
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
  submitAttempted = false;
  readonly productAttributesConfig = PRODUCT_ATTRIBUTES_CONFIG;
  attributeRows: AttributeRow[] = [{ key: '', value: '' }];
  private initialConfiguredAttributeKeys = new Set<string>();
  private pendingProductForForm: Product | null = null;

  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    private catalogSettings: CatalogSettingsService,
    private notification: NotificationService,
    private cdr: ChangeDetectorRef,
  ) {}

  private loadFullProduct(id: string): void {
    this.loadingCatalogs = true;
    this.cdr.detectChanges();

    this.productService.getProductById(id).subscribe({
      next: (response) => {
        const payload = (response as Product & { data?: Product }).data ?? response;
        this.pendingProductForForm = payload as Product;
        this.tryApplyPendingProductToForm();
        this.loadingCatalogs = false;
        this.cdr.detectChanges();
      },
      error: () => {
        if (this.productToEdit) {
          this.pendingProductForForm = this.productToEdit;
          this.tryApplyPendingProductToForm();
        }
        this.loadingCatalogs = false;
        this.cdr.detectChanges();
      },
    });
  }

  ngOnInit(): void {
    this.initForm();
    this.loadCatalogs();
    if (this.productToEdit?.idProducto) {
      this.loadFullProduct(this.productToEdit.idProducto); // <-- trae datos completos
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.productForm || !changes['productToEdit']) {
      return;
    }

    const current = changes['productToEdit'].currentValue as Product | null;
    if (current?.idProducto) {
      this.loadFullProduct(current.idProducto); // <-- trae datos completos
      return;
    }

    this.productForm.reset({
      codigoBarras: '',
      nombreProducto: '',
      descripcion: '',
      precioCosto: null,
      precioActual: 1,
      activo: true,
      stock: 0,
      idTipoProducto: this.tiposProducto[0]?.idTipoProducto ?? 1,
      idEditorialSello: this.editoriales[0]?.idEditorialSello ?? 1,
      idRangoEtario: this.rangosEtarios[0]?.idRangoEtario ?? 1,
      idsCategorias: [],
      idsAutores: [],
    });
    this.productAttributesConfig.forEach((config) => {
      this.productForm.get(`attr_${config.key}`)?.setValue('');
    });
    this.productForm.markAsPristine();
    this.productForm.markAsUntouched();
    this.submitAttempted = false;
    this.initialConfiguredAttributeKeys.clear();
    this.attributeRows = [{ key: '', value: '' }];
    this.pendingProductForForm = null;
    this.cdr.detectChanges();
  }

  private tryApplyPendingProductToForm(): void {
    if (!this.pendingProductForForm || !this.productForm) {
      return;
    }

    this.applyProductToForm(this.pendingProductForForm);
  }

  private applyProductToForm(product: Product): void {
    const resolvedTipoProductoId = this.resolveTipoProductoId(product);
    const resolvedEditorialId = this.resolveEditorialId(product);
    const resolvedRangoEtarioId = this.resolveRangoEtarioId(product);
    const resolvedCategoriasIds = this.resolveCategoriaIds(product);
    const resolvedAutoresIds = this.resolveAutorIds(product);

    this.productForm.patchValue(
      {
        codigoBarras: product.codigoBarras ?? '',
        nombreProducto: product.nombreProducto ?? '',
        descripcion: product.descripcion ?? '',
        precioCosto: product.precioCosto ?? null,
        precioActual: Number(product.precioActual ?? 1),
        activo: Boolean(product.activo),
        stock: product.stock ?? 0,
        idTipoProducto: resolvedTipoProductoId,
        idEditorialSello: resolvedEditorialId,
        idRangoEtario: resolvedRangoEtarioId,
        idsCategorias: resolvedCategoriasIds,
        idsAutores: resolvedAutoresIds,
      },
      { emitEvent: false },
    );
    this.initAttributeRowsFromProduct(product.atributosEspecificos);
    this.productForm.markAsPristine();
    this.productForm.markAsUntouched();
    this.submitAttempted = false;
    this.cdr.detectChanges();
  }

  private normalizeText(value: string | null | undefined): string {
    return String(value ?? '')
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  private toValidNumber(value: unknown): number | null {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null;
  }

  private resolveTipoProductoId(product: Product): number {
    const directId = this.toValidNumber(product.idTipoProducto);
    if (directId !== null) {
      return directId;
    }

    const byName = this.tiposProducto.find(
      (item) =>
        this.normalizeText(item.nombreTipoProducto) === this.normalizeText(product.tipoProducto),
    );

    return byName?.idTipoProducto ?? this.tiposProducto[0]?.idTipoProducto ?? 1;
  }

  private resolveEditorialId(product: Product): number {
    const directId = this.toValidNumber(product.idEditorialSello);
    if (directId !== null) {
      return directId;
    }

    const byName = this.editoriales.find(
      (item) =>
        this.normalizeText(item.nombreEditorial) === this.normalizeText(product.editorialSello),
    );

    return byName?.idEditorialSello ?? this.editoriales[0]?.idEditorialSello ?? 1;
  }

  private resolveRangoEtarioId(product: Product): number {
    const directId = this.toValidNumber(product.idRangoEtario);
    if (directId !== null) {
      return directId;
    }

    const byName = this.rangosEtarios.find(
      (item) => this.normalizeText(item.descripcion) === this.normalizeText(product.rangoEtario),
    );

    return byName?.idRangoEtario ?? this.rangosEtarios[0]?.idRangoEtario ?? 1;
  }

  private resolveCategoriaIds(product: Product): number[] {
    const directIds = (product.idsCategorias ?? [])
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value > 0);

    if (directIds.length > 0) {
      return directIds;
    }

    const names = new Set((product.categorias ?? []).map((value) => this.normalizeText(value)));
    if (names.size === 0) {
      return [];
    }

    return this.categorias
      .filter((categoria) => names.has(this.normalizeText(categoria.nombreCategoria)))
      .map((categoria) => categoria.idCategoria);
  }

  private resolveAutorIds(product: Product): number[] {
    const directIds = (product.idsAutores ?? [])
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value > 0);

    if (directIds.length > 0) {
      return directIds;
    }

    const names = new Set((product.autores ?? []).map((value) => this.normalizeText(value)));
    if (names.size === 0) {
      return [];
    }

    return this.autores
      .filter((autor) => names.has(this.normalizeText(autor.nombre)))
      .map((autor) => autor.idAutorArtista);
  }

  private requiredTrimmed(control: AbstractControl): { required: true } | null {
    const value = String(control.value ?? '').trim();
    return value.length > 0 ? null : { required: true };
  }

  private minArrayLength(minimum: number) {
    return (
      control: AbstractControl,
    ): { minArrayLength: { requiredLength: number; actualLength: number } } | null => {
      const currentValue = control.value;

      if (Array.isArray(currentValue) && currentValue.length >= minimum) {
        return null;
      }

      return {
        minArrayLength: {
          requiredLength: minimum,
          actualLength: Array.isArray(currentValue) ? currentValue.length : 0,
        },
      };
    };
  }

  isControlInvalid(controlName: string): boolean {
    const control = this.productForm.get(controlName);
    return Boolean(control?.invalid && (control.touched || control.dirty || this.submitAttempted));
  }

  private initForm(): void {
    const formControls: Record<string, [unknown, any]> = {
      codigoBarras: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.maxLength(20),
          Validators.pattern(/^\d+$/),
        ],
      ],
      nombreProducto: [
        '',
        [
          Validators.required,
          this.requiredTrimmed.bind(this),
          Validators.minLength(3),
          Validators.maxLength(100),
        ],
      ],
      descripcion: [
        '',
        [
          Validators.required,
          this.requiredTrimmed.bind(this),
          Validators.minLength(10),
          Validators.maxLength(500),
        ],
      ],
      precioCosto: [null, [Validators.required, Validators.min(0)]],
      precioActual: [1, [Validators.required, Validators.min(0.01)]],
      activo: [true, []],
      stock: [0, [Validators.required, Validators.min(0)]],
      idTipoProducto: [1, [Validators.required, Validators.min(1)]],
      idEditorialSello: [1, [Validators.required, Validators.min(1)]],
      idRangoEtario: [1, [Validators.required, Validators.min(1)]],
      idsCategorias: [[], [this.minArrayLength(1)]],
      idsAutores: [[], [this.minArrayLength(1)]],
    };

    // Agregar dinámicamente controles para cada atributo configurado
    this.productAttributesConfig.forEach((config) => {
      const defaultVal = config.defaultValue ?? '';
      const validators = config.required ? [Validators.required] : [];

      if (config.type === 'number') {
        validators.push(Validators.min(0));
      }

      formControls[`attr_${config.key}`] = [defaultVal, validators];
    });

    this.productForm = this.fb.group(formControls);
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
        this.tryApplyPendingProductToForm();
        this.cdr.detectChanges();

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
    this.initialConfiguredAttributeKeys.clear();

    // Cargar dinámicamente los valores para cada atributo configurado
    if (atributosEspecificos) {
      this.productAttributesConfig.forEach((config) => {
        const value = atributosEspecificos[config.key];
        if (value !== undefined) {
          this.initialConfiguredAttributeKeys.add(config.key);
          this.productForm.patchValue({
            [`attr_${config.key}`]: this.coerceAttributeValue(value, config),
          });
          return;
        }

        this.productForm.patchValue({ [`attr_${config.key}`]: '' });
      });
    } else {
      this.productAttributesConfig.forEach((config) => {
        this.productForm.patchValue({ [`attr_${config.key}`]: '' });
      });
    }

    // Atributos personalizados adicionales
    const configuredKeys = new Set(this.productAttributesConfig.map((c) => c.key));
    const customRows = Object.entries(atributosEspecificos ?? {})
      .filter(([key]) => !configuredKeys.has(key))
      .map(([key, value]) => ({
        key,
        value:
          typeof value === 'string'
            ? value
            : typeof value === 'number' || typeof value === 'boolean'
              ? String(value)
              : JSON.stringify(value),
      }));

    this.attributeRows = customRows.length > 0 ? customRows : [{ key: '', value: '' }];
  }

  private coerceAttributeValue(value: unknown, config: ProductAttributeConfig): unknown {
    if (config.type === 'number') {
      return Number(value) || 0;
    }
    if (config.type === 'boolean') {
      return Boolean(value);
    }
    return String(value);
  }

  private buildAtributosEspecificosFromForm(): Record<string, unknown> {
    const attributes: Record<string, unknown> = {};

    // Construir desde controles configurados
    this.productAttributesConfig.forEach((config) => {
      const val = this.productForm.get(`attr_${config.key}`)?.value;

      if (config.type === 'boolean') {
        const boolValue = Boolean(val);
        if (boolValue || this.initialConfiguredAttributeKeys.has(config.key)) {
          attributes[config.key] = boolValue;
        }
        return;
      }

      if (config.type === 'number') {
        if (val === null || val === undefined || val === '') {
          return;
        }
        const numericValue = Number(val);
        if (Number.isFinite(numericValue)) {
          attributes[config.key] = numericValue;
        }
        return;
      }

      const textValue = String(val ?? '').trim();
      if (textValue !== '') {
        attributes[config.key] = textValue;
      }
    });

    // Agregar atributos personalizados adicionales
    const customAttributes = this.buildAtributosEspecificosFromRows();
    return { ...attributes, ...customAttributes };
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

  private normalizeAttributeKey(rawKey: string): string {
    const normalized = rawKey
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_\-\s]/g, '')
      .replace(/[\s\-]+/g, '_')
      .replace(/^_+|_+$/g, '');

    return normalized;
  }

  private buildAtributosEspecificosFromRows(): Record<string, unknown> {
    const attributes: Record<string, unknown> = {};
    let normalizedKeyCount = 0;

    this.attributeRows.forEach((row) => {
      const originalKey = row.key.trim();
      const key = this.normalizeAttributeKey(originalKey);
      if (!key) {
        return;
      }

      if (key !== originalKey) {
        normalizedKeyCount += 1;
      }

      attributes[key] = this.parseAttributeValue(row.value ?? '');
    });

    if (normalizedKeyCount > 0) {
      this.notification.show(
        'Se ajustaron algunas claves de atributos para evitar caracteres incompatibles.',
        'info',
      );
    }

    return attributes;
  }

  onSubmit(): void {
    this.submitAttempted = true;

    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      this.notification.show('Completa los campos obligatorios.', 'info');
      this.cdr.detectChanges();
      return;
    }

    this.isSubmitting = true;
    this.cdr.detectChanges();
    const raw = this.productForm.getRawValue();
    const atributosEspecificos = this.buildAtributosEspecificosFromForm();

    const productData: ProductUpsertPayload = {
      codigoBarras: raw.codigoBarras,
      nombreProducto: raw.nombreProducto,
      descripcion: raw.descripcion,
      precioCosto: raw.precioCosto ? Number(raw.precioCosto) : undefined,
      precioActual: Number(raw.precioActual),
      activo: Boolean(raw.activo),
      stock: raw.stock !== null && raw.stock !== undefined ? Number(raw.stock) : undefined,
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

    const request$ = isEditing
      ? this.productService.updateProduct(this.productToEdit!.idProducto!, productData)
      : this.productService.createProduct(productData);

    request$
      .pipe(
        finalize(() => {
          this.isSubmitting = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: () => {
          this.submitAttempted = false;
          this.notification.show(successMessage, 'success');
          this.saved.emit();
          this.close.emit();
        },
        error: () => {
          this.notification.show(errorMessage, 'error');
        },
      });
  }

  onCancel(): void {
    this.close.emit();
  }
}
