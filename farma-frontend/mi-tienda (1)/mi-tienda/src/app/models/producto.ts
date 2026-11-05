export interface Producto {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: string;
  cantidad: number;
  imagen?: string; // opcional: los productos registrados a mano no tienen imagen
}
