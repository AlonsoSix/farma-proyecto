# Farma · "Boticas Por tu Salud"

Sistema web para una farmacia: catálogo de productos con búsqueda y filtros, carrito,
registro e inicio de sesión, y un panel de administración con CRUD de productos
(registrar, editar, dar de baja / activar y eliminar).

Proyecto académico — **Avance 2**.

---

## 🧰 Tecnologías

- **Backend:** Java 21 + Spring Boot (Maven)
- **Base de datos:** MySQL 8
- **Frontend:** HTML, CSS y JavaScript con Bootstrap 5

---

## ✅ Requisitos previos

Antes de empezar, cada persona debe tener instalado en su computadora:

1. **JDK 21** (Java). Comprueba con: `java -version`
2. **MySQL 8** y **MySQL Workbench**
3. **Git** (para clonar) — https://git-scm.com
4. **Visual Studio Code** (recomendado), con la extensión **Live Server** para abrir el frontend.

---

## 📥 1. Clonar el proyecto

```bash
git clone https://github.com/AlonsoSix/farma-proyecto.git
cd farma-proyecto
```

---

## 🗄️ 2. Crear la base de datos

1. Abre **MySQL Workbench** y conéctate a tu servidor local.
2. Abre el archivo **`database/farma_db_completo.sql`** (File → Open SQL Script).
3. Ejecútalo completo con el **rayo ⚡** (o Ctrl+Shift+Enter), sin seleccionar nada.
4. Al final debe mostrar **20 productos** y **1 usuario (el administrador)**.

> Esto crea la base `farma_db` con todas las tablas y los datos de ejemplo.
> Si ya tenías la base y quieres reinstalarla desde cero, lee el comentario al
> inicio del mismo archivo `.sql`.

---

## ⚙️ 3. Configurar el backend (contraseña de MySQL)

La contraseña de MySQL **no viene en el proyecto** (cada quien tiene la suya), así que
hay que crear el archivo de configuración:

1. Ve a la carpeta `farma-backend/src/main/resources/`
2. Copia el archivo **`application.properties.example`** y pégalo en la misma carpeta.
3. Renombra la copia a **`application.properties`**.
4. Ábrelo y cambia la línea de la contraseña por **la tuya de MySQL**:

   ```properties
   spring.datasource.password=TU_CONTRASEÑA_DE_MYSQL
   ```

---

## ▶️ 4. Ejecutar el backend

Desde la carpeta `farma-backend`:

```bash
cd farma-backend
./mvnw spring-boot:run
```

En Windows también puedes usar: `mvnw spring-boot:run`

El backend queda corriendo en **http://localhost:8081**
(para comprobar, abre `http://localhost:8081/api/productos` en el navegador: debe
mostrar los productos en formato JSON).

---

## 🌐 5. Abrir el frontend

1. Abre la carpeta `farma-frontend` en VS Code.
2. Haz clic derecho en **`index.html`** → **"Open with Live Server"**.
3. Se abrirá la tienda en el navegador (por ejemplo, `http://127.0.0.1:5500`).

> Importante: el backend (paso 4) debe estar corriendo para que la web muestre los
> productos y funcione el login.

---

## 👤 Usuario administrador

Para entrar al panel de administración, inicia sesión en la web con:

- **Correo:** `admin@farma.com`
- **Contraseña:** `admin12345`

Los clientes se crean desde la propia web, con el botón **"Registrarse"**.

> ¿Olvidaste la contraseña del admin? Ejecuta `database/cambiar_contrasena_admin.sql`
> en Workbench y la vuelve a dejar en `admin12345`.

---

## 📁 Estructura del proyecto

```
farma-proyecto/
├── database/          Scripts SQL (ejecutar farma_db_completo.sql)
├── farma-backend/     API REST con Spring Boot (puerto 8081)
└── farma-frontend/    Tienda y panel admin (HTML, CSS, JS)
```

---

## 📝 Notas

- El archivo `application.properties` con tu contraseña **no se sube a GitHub** (está en el `.gitignore`).
- Orden correcto para que todo funcione: **base de datos → backend → frontend**.
