# Mi Tienda Virtual (Angular 20)

Proyecto de la Guía 1 de Laboratorio – Desarrollo Web Integrado, Semana 12.

## Cómo ejecutarlo

1. Tener Node.js 20 o superior.
2. Abrir una terminal en esta carpeta y ejecutar:

       npm install
       npm start

3. Se abre http://localhost:4200

## Estructura

- src/app/app.ts – menú (RouterLink) + router-outlet
- src/app/app.routes.ts – rutas: Inicio, Productos, Registrar producto, Contacto
- src/app/app.config.ts – provideRouter + provideHttpClient
- src/app/models/producto.ts – interfaz Producto
- src/app/services/producto.service.ts – consumo de FakeStoreAPI con HttpClient
- src/app/pages/productos – componente PADRE (catálogo, manejo de errores)
- src/app/components/producto-card – componente HIJO (@Input / @Output)
- src/app/pages/registrar-producto – formulario reactivo con validaciones
- src/app/pages/contacto – página de contacto
