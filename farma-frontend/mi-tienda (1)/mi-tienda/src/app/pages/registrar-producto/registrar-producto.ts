import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProductoService } from '../../services/producto.service';

@Component({
  selector: 'app-registrar-producto',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <h2>Registrar producto</h2>

    <form [formGroup]="form" (ngSubmit)="registrar()" novalidate>
      <label>Nombre *</label>
      <input type="text" formControlName="nombre" placeholder="Ej. Zapatillas urbanas" />
      @if (invalido('nombre')) {
        <small class="error">
          @if (form.controls.nombre.errors?.['required']) { El nombre es obligatorio. }
          @else { El nombre debe tener mínimo 3 caracteres. }
        </small>
      }

      <label>Descripción *</label>
      <textarea formControlName="descripcion" rows="3"></textarea>
      @if (invalido('descripcion')) {
        <small class="error">La descripción es obligatoria.</small>
      }

      <label>Precio (USD) *</label>
      <input type="number" formControlName="precio" step="0.01" />
      @if (invalido('precio')) {
        <small class="error">
          @if (form.controls.precio.errors?.['required']) { El precio es obligatorio. }
          @else { El precio debe ser mayor que cero. }
        </small>
      }

      <label>Categoría *</label>
      <select formControlName="categoria">
        <option value="">-- Seleccione --</option>
        @for (c of categorias; track c) {
          <option [value]="c">{{ c }}</option>
        }
      </select>
      @if (invalido('categoria')) {
        <small class="error">Seleccione una categoría.</small>
      }

      <label>Cantidad disponible *</label>
      <input type="number" formControlName="cantidad" />
      @if (invalido('cantidad')) {
        <small class="error">
          @if (form.controls.cantidad.errors?.['required']) { La cantidad es obligatoria. }
          @else { La cantidad no puede ser negativa. }
        </small>
      }

      <div class="acciones">
        <button type="submit">Registrar</button>
        <button type="button" class="secundario" (click)="limpiar()">Limpiar</button>
      </div>
    </form>

    @if (mensajeError()) {
      <p class="alerta error-box">{{ mensajeError() }}</p>
    }
    @if (mensajeExito()) {
      <p class="alerta exito-box">
        {{ mensajeExito() }} <a routerLink="/productos">Ver en el catálogo</a>
      </p>
    }
  `,
  styles: [`
    form { display: flex; flex-direction: column; max-width: 460px; gap: 4px; }
    label { font-weight: bold; margin-top: 10px; }
    input, textarea, select { padding: 8px; border: 1px solid #ccc; border-radius: 6px; font: inherit; }
    input.ng-invalid.ng-touched, textarea.ng-invalid.ng-touched, select.ng-invalid.ng-touched { border-color: red; }
    .error { color: red; }
    .acciones { margin-top: 16px; display: flex; gap: 8px; }
    button { padding: 8px 18px; border: none; border-radius: 6px; background: #1e3a8a; color: white; cursor: pointer; }
    .secundario { background: #6b7280; }
    .alerta { max-width: 460px; padding: 10px; border-radius: 8px; }
    .error-box { background: #fee2e2; color: #991b1b; }
    .exito-box { background: #dcfce7; color: #166534; }
  `],
})
export class RegistrarProducto {
  private fb = inject(FormBuilder);
  private productoService = inject(ProductoService);

  categorias = ['Electrónica', 'Ropa', 'Calzado', 'Joyería', 'Hogar', 'Otros'];

  form = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    descripcion: ['', Validators.required],
    precio: [null as number | null, [Validators.required, Validators.min(0.01)]],
    categoria: ['', Validators.required],
    cantidad: [null as number | null, [Validators.required, Validators.min(0)]],
  });

  enviado = signal(false);
  mensajeExito = signal('');
  mensajeError = signal('');

  // true si el campo tiene error y el usuario ya lo tocó o intentó enviar
  invalido(campo: string): boolean {
    const control = this.form.get(campo);
    return !!control && control.invalid && (control.touched || this.enviado());
  }

  registrar(): void {
    this.enviado.set(true);
    this.mensajeExito.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.mensajeError.set('Corrija los campos marcados en rojo.');
      return;
    }

    const datos = this.form.getRawValue();
    this.productoService.registrarProducto({
      nombre: datos.nombre!.trim(),
      descripcion: datos.descripcion!.trim(),
      precio: Number(datos.precio),
      categoria: datos.categoria!,
      cantidad: Number(datos.cantidad),
    });

    this.mensajeError.set('');
    this.mensajeExito.set('Producto "' + datos.nombre + '" registrado correctamente.');
    this.form.reset({ nombre: '', descripcion: '', precio: null, categoria: '', cantidad: null });
    this.enviado.set(false);
  }

  limpiar(): void {
    this.form.reset({ nombre: '', descripcion: '', precio: null, categoria: '', cantidad: null });
    this.enviado.set(false);
    this.mensajeError.set('');
    this.mensajeExito.set('');
  }
}
