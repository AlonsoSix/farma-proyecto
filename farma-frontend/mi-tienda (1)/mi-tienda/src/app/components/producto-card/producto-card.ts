import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { Producto } from '../../models/producto';

@Component({
  selector: 'app-producto-card',
  imports: [CurrencyPipe],
  template: `
    <div class="tarjeta">
      @if (producto.imagen) {
        <img [src]="producto.imagen" [alt]="producto.nombre" />
      }
      <span class="categoria">{{ producto.categoria }}</span>
      <h3>{{ producto.nombre }}</h3>
      <p class="descripcion">{{ producto.descripcion }}</p>
      <p class="precio">{{ producto.precio | currency: 'USD' }}</p>
      <p class="stock">Disponibles: {{ producto.cantidad }}</p>
      <button (click)="agregarAlCarrito()" [disabled]="producto.cantidad === 0">
        Agregar al carrito
      </button>
    </div>
  `,
  styles: [`
    .tarjeta { border: 1px solid #ddd; border-radius: 10px; padding: 14px; background: white;
               display: flex; flex-direction: column; height: 100%; box-sizing: border-box; }
    img { height: 150px; object-fit: contain; margin-bottom: 10px; }
    .categoria { font-size: 12px; color: #1e3a8a; text-transform: uppercase; }
    h3 { font-size: 15px; margin: 6px 0; }
    .descripcion { font-size: 13px; color: #555; flex: 1;
                   display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
    .precio { font-size: 18px; font-weight: bold; color: #16a34a; margin: 4px 0; }
    .stock { font-size: 13px; margin: 0 0 8px; }
    button { padding: 8px; background: #1e3a8a; color: white; border: none; border-radius: 6px; cursor: pointer; }
    button:disabled { background: #999; cursor: not-allowed; }
  `],
})
export class ProductoCard {
  // Dato que llega DESDE el padre
  @Input({ required: true }) producto!: Producto;

  // Evento que se envía HACIA el padre
  @Output() agregar = new EventEmitter<Producto>();

  agregarAlCarrito() {
    this.agregar.emit(this.producto);
  }
}
