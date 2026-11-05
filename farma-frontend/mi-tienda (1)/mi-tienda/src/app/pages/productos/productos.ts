import { Component, OnInit, inject, signal } from '@angular/core';
import { ProductoService } from '../../services/producto.service';
import { Producto } from '../../models/producto';
import { ProductoCard } from '../../components/producto-card/producto-card';

@Component({
  selector: 'app-productos',
  imports: [ProductoCard],
  template: `
    <h2>Catálogo de productos</h2>

    @if (carrito() > 0) {
      <p class="aviso">
        Agregaste <strong>{{ ultimoAgregado() }}</strong> al carrito.
        Productos en el carrito: {{ carrito() }}
      </p>
    }

    @if (cargando()) {
      <p class="info">Cargando productos...</p>
    } @else {
      @if (error()) {
        <div class="error">
          <p>{{ error() }}</p>
          <button (click)="cargarProductos()">Reintentar</button>
        </div>
      }

      @if (productos().length === 0) {
        <p class="info">No existen productos disponibles.</p>
      } @else {
        <div class="grilla">
          @for (p of productos(); track p.id) {
            <!-- PADRE -> HIJO: [producto] (Input) | HIJO -> PADRE: (agregar) (Output) -->
            <app-producto-card [producto]="p" (agregar)="onAgregar($event)" />
          }
        </div>
      }
    }
  `,
  styles: [`
    .grilla { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
    .info { color: #555; font-style: italic; }
    .aviso { background: #dcfce7; color: #166534; padding: 10px; border-radius: 8px; }
    .error { background: #fee2e2; color: #991b1b; padding: 10px; border-radius: 8px; margin-bottom: 16px; }
    .error button { padding: 6px 12px; cursor: pointer; }
  `],
})
export class Productos implements OnInit {
  private productoService = inject(ProductoService);

  productos = signal<Producto[]>([]);
  cargando = signal(false);
  error = signal('');
  carrito = signal(0);
  ultimoAgregado = signal('');

  ngOnInit(): void {
    this.cargarProductos();
  }

  cargarProductos(): void {
    this.cargando.set(true);
    this.error.set('');
    const registrados = this.productoService.obtenerRegistrados();

    this.productoService.obtenerProductos().subscribe({
      next: (lista) => {
        // Primero los registrados en el formulario, luego los de la API
        this.productos.set([...registrados, ...lista]);
        this.cargando.set(false);
      },
      error: () => {
        // Si la API falla, igual mostramos los registrados localmente
        this.productos.set(registrados);
        this.error.set('No se pudo obtener el catálogo desde el servidor. Verifique su conexión e intente nuevamente.');
        this.cargando.set(false);
      },
    });
  }

  // Se ejecuta cuando el HIJO emite el evento (agregar)
  onAgregar(producto: Producto): void {
    this.carrito.update((n) => n + 1);
    this.ultimoAgregado.set(producto.nombre);
  }
}
