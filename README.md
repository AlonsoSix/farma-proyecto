# Farma

Sistema de gestión para farmacia desarrollado con **Spring Boot**, **MySQL** y **JavaScript**.

## 📋 Requisitos

Antes de comenzar, asegúrate de tener instalado:

* [Git](https://git-scm.com/)
* **Java JDK 21**
* **MySQL Server**
* **MySQL Workbench**

### Verificar Java

Abre una terminal y ejecuta:

```bash
java -version
```

Debe aparecer una versión **21**.

### Configurar Git

Solo necesitas hacerlo una vez por computadora:

```bash
git config --global user.name "SuNombre"
git config --global user.email "sucorreo@ejemplo.com"
```

Utiliza el mismo nombre y correo que tienes asociados a tu cuenta de GitHub.

---

# 🚀 Instalación

## Paso 1: Clonar el proyecto

Ubícate en la carpeta donde quieras guardar el proyecto y ejecuta:

```bash
git clone https://github.com/AlonsoSix/farma-proyecto.git
```

Luego entra a la carpeta:

```bash
cd farma-proyecto
```

La estructura principal del proyecto es:

```text
farma-proyecto/
├── database/
├── farma-backend/
└── farma-frontend/
```

---

## Paso 2: Crear la base de datos

La base de datos se encuentra en:

```text
database/Dump20260921.sql
```

### Importar desde MySQL Workbench

1. Abre **MySQL Workbench**.

2. Conéctate a tu servidor local de MySQL.

3. Ve a:

   **Server → Data Import**

4. Selecciona:

   **Import from Self-Contained File**

5. Busca el archivo:

   ```text
   farma-proyecto/database/Dump20260921.sql
   ```

6. No es necesario seleccionar nada en **Default Target Schema**.

7. Haz clic en **Start Import**.

8. Espera hasta que en **Import Progress** aparezca:

   ```text
   Import completed
   ```

9. En el panel **Schemas**, actualiza la lista.

Deberías poder encontrar la base:

```text
farma_db
```

con sus tablas correspondientes, incluyendo:

```text
productos
usuarios
```

> **Nota:** Si ya tienes una base de datos `farma_db`, revisa el contenido del dump antes de importarlo, ya que puede modificar o reemplazar la información existente.

---

## Paso 3: Crear el archivo de configuración

Cada integrante tiene su propia contraseña de MySQL. Por seguridad, el archivo `application.properties` **no debe subirse a GitHub**.

El proyecto incluye una plantilla:

```text
farma-backend/
└── src/
    └── main/
        └── resources/
            └── application.properties.example
```

### Crear `application.properties`

1. Entra a:

   ```text
   farma-backend/src/main/resources/
   ```

2. Haz una copia de:

   ```text
   application.properties.example
   ```

3. Renombra la copia como:

   ```text
   application.properties
   ```

Al final deben existir **los dos archivos**:

```text
application.properties
application.properties.example
```

> **Importante:** No borres ni modifiques `application.properties.example`.

### Configurar MySQL

Abre:

```text
application.properties
```

y coloca tu contraseña de MySQL:

```properties
spring.datasource.username=root
spring.datasource.password=TU_CO_
```
