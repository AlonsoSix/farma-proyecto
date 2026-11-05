import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-contacto',
  imports: [FormsModule],
  template: `
    <h2>Contacto</h2>
    <p>Correo: ventas&#64;mitiendavirtual.pe · Teléfono: (01) 555-1234 · Lima, Perú</p>

    <div class="formulario">
      <input type="text" placeholder="Tu nombre" [(ngModel)]="nombre" />
      <input type="email" placeholder="Tu correo" [(ngModel)]="correo" />
      <textarea rows="4" placeholder="Mensaje" [(ngModel)]="mensaje"></textarea>
      <button (click)="enviar()">Enviar</button>
    </div>

    @if (respuesta()) {
      <p [class.error]="esError()" [class.exito]="!esError()">{{ respuesta() }}</p>
    }
  `,
  styles: [`
    .formulario { display: flex; flex-direction: column; gap: 8px; max-width: 420px; }
    input, textarea { padding: 8px; border: 1px solid #ccc; border-radius: 6px; font: inherit; }
    button { padding: 8px; background: #1e3a8a; color: white; border: none; border-radius: 6px; cursor: pointer; }
    .error { color: red; }
    .exito { color: green; }
  `],
})
export class Contacto {
  nombre = '';
  correo = '';
  mensaje = '';
  respuesta = signal('');
  esError = signal(false);

  enviar(): void {
    if (!this.nombre.trim() || !this.correo.includes('@') || !this.mensaje.trim()) {
      this.esError.set(true);
      this.respuesta.set('Complete todos los campos con un correo válido.');
      return;
    }
    this.esError.set(false);
    this.respuesta.set('Gracias ' + this.nombre + ', te responderemos pronto.');
    this.nombre = '';
    this.correo = '';
    this.mensaje = '';
  }
}
