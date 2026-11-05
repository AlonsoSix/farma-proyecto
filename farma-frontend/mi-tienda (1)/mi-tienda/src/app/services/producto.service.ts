import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Producto } from '../models/producto';

// Forma en que FakeStoreAPI envía cada producto
interface ProductoApi {
  id: number;
  title: string;
  price: number;
  description: string;
  category: string;
  image: string;
  rating: { rate: number; count: number };
}

@Injectable({ providedIn: 'root' })
export class ProductoService {
  private http = inject(HttpClient);
  private apiUrl = 'https://fakestoreapi.com/products';

  // Productos registrados desde el formulario (se guardan en memoria)
  private registrados: Producto[] = [];

  // GET a la API y conversión al modelo Producto
  obtenerProductos(): Observable<Producto[]> {
    return this.http.get<ProductoApi[]>(this.apiUrl).pipe(
      map((lista) =>
        lista.map((p) => ({
          id: p.id,
          nombre: p.title,
          descripcion: p.description,
          precio: p.price,
          categoria: p.category,
          cantidad: p.rating?.count ?? 0,
          imagen: p.image,
        }))
      )
    );
  }

  obtenerRegistrados(): Producto[] {
    return [...this.registrados];
  }

  registrarProducto(producto: Omit<Producto, 'id'>): void {
    this.registrados.unshift({ ...producto, id: Date.now() });
  }
}
