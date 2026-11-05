import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header class="encabezado">
      <h1>Mi Tienda Virtual</h1>
      <nav>
        <a routerLink="/" routerLinkActive="activo" [routerLinkActiveOptions]="{ exact: true }">Inicio</a>
        <a routerLink="/productos" routerLinkActive="activo">Productos</a>
        <a routerLink="/registrar" routerLinkActive="activo">Registrar producto</a>
        <a routerLink="/contacto" routerLinkActive="activo">Contacto</a>
      </nav>
    </header>

    <main class="contenido">
      <router-outlet />
    </main>

    <footer>Desarrollo Web Integrado – Semana 12</footer>
  `,
  styles: [`
    .encabezado { background: #1e3a8a; color: white; padding: 12px 24px;
                  display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; }
    .encabezado h1 { margin: 0; font-size: 22px; }
    nav a { color: white; text-decoration: none; margin-left: 16px; padding: 6px 10px; border-radius: 6px; }
    nav a:hover { background: rgba(255, 255, 255, 0.15); }
    nav a.activo { background: white; color: #1e3a8a; font-weight: bold; }
    .contenido { max-width: 1100px; margin: 24px auto; padding: 0 16px; min-height: 70vh; }
    footer { text-align: center; padding: 16px; color: #666; border-top: 1px solid #ddd; }
  `],
})
export class App {}
