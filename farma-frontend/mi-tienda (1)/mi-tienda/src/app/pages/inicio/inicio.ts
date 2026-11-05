import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-inicio',
  imports: [RouterLink],
  template: `
    <section class="bienvenida">
      <h2>Bienvenido a Mi Tienda Virtual</h2>
      <p>Administra el catálogo de productos: consulta los productos disponibles,
         registra nuevos productos y ponte en contacto con nosotros.</p>
      <a routerLink="/productos" class="boton">Ver productos</a>
      <a routerLink="/registrar" class="boton secundario">Registrar producto</a>
    </section>
  `,
  styles: [`
    .bienvenida { text-align: center; padding: 48px 16px; background: #eff6ff; border-radius: 12px; }
    .boton { display: inline-block; margin: 16px 8px 0; padding: 10px 20px; background: #1e3a8a;
             color: white; text-decoration: none; border-radius: 8px; }
    .secundario { background: #16a34a; }
  `],
})
export class Inicio {}
