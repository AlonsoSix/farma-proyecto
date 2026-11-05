import { Routes } from '@angular/router';
import { Inicio } from './pages/inicio/inicio';
import { Productos } from './pages/productos/productos';
import { RegistrarProducto } from './pages/registrar-producto/registrar-producto';
import { Contacto } from './pages/contacto/contacto';

export const routes: Routes = [
  { path: '', component: Inicio, title: 'Inicio' },
  { path: 'productos', component: Productos, title: 'Productos' },
  { path: 'registrar', component: RegistrarProducto, title: 'Registrar producto' },
  { path: 'contacto', component: Contacto, title: 'Contacto' },
  { path: '**', redirectTo: '' }, // cualquier ruta desconocida vuelve a Inicio
];
