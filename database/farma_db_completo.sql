-- =====================================================================
--  FARMA - Base de datos completa (Avance 2)
--  Un solo script: crea la base, las tablas, los 20 productos y el administrador.
--
--  CÓMO USARLO EN MySQL Workbench:
--    1. File  ->  Open SQL Script...  y abre este archivo.
--    2. Ejecuta TODO con el rayo (⚡) o con Ctrl+Shift+Enter (sin seleccionar nada).
--    3. Al final deben salir 20 productos y 1 usuario (el admin), sin advertencias.
--
--  Está pensado para una base NUEVA (una laptop donde aún no existe "farma_db").
--  Si ya tienes "farma_db" y quieres reinstalar desde cero, quita el "-- " de la
--  línea DROP DATABASE de más abajo para que primero borre la base y la vuelva a crear.
--
--  USUARIO ADMINISTRADOR:
--    correo: admin@farma.com    contraseña: admin12345
--    (los clientes se crean desde la web, en el botón "Registrarse")
-- =====================================================================

-- Para REINSTALAR desde cero, quita el "-- " de la siguiente línea:
-- DROP DATABASE IF EXISTS `farma_db`;

CREATE DATABASE IF NOT EXISTS `farma_db`
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `farma_db`;

-- ---------------------------------------------------------------------
-- Tabla PRODUCTOS (ya incluye todas las columnas del Avance 2)
--   codigo            : código único para buscar/editar (FAR-0001...)
--   marca             : marca del producto
--   fecha_vencimiento : NULL en los equipos médicos (no vencen)
--   activo            : 1 = se muestra en la tienda, 0 = dado de baja (oculto)
-- ---------------------------------------------------------------------
CREATE TABLE `productos` (
  `id_producto` int NOT NULL AUTO_INCREMENT,
  `codigo` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `marca` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `precio` decimal(10,2) NOT NULL,
  `categoria` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `imagen_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `stock` int NOT NULL DEFAULT 0,
  `activo` bit(1) NOT NULL DEFAULT b'1',
  `fecha_vencimiento` date DEFAULT NULL,
  `fecha_creacion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_producto`),
  UNIQUE KEY `uk_productos_codigo` (`codigo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `productos`
  (`id_producto`,`codigo`,`nombre`,`marca`,`descripcion`,`precio`,`categoria`,`imagen_url`,`stock`,`activo`,`fecha_vencimiento`)
VALUES
  (1,'FAR-0001','Paracetamol 500mg (x20 tabletas)','Portugal','Analgésico y antipirético de uso común.',8.50,'Medicamentos','/img/productos/paracetamol.jpg',120,b'1','2028-03-31'),
  (2,'FAR-0002','Ibuprofeno 400mg (x10 tabletas)','Genfar','Antiinflamatorio no esteroideo.',10.90,'Medicamentos','/img/productos/ibuprofeno.jpg',80,b'1','2027-11-30'),
  (3,'FAR-0003','Vitamina C 1000mg (x30 tabletas)','Redoxon','Suplemento para reforzar el sistema inmune.',25.00,'Suplementos','/img/productos/vitaminac.jpg',60,b'1','2027-08-31'),
  (4,'FAR-0004','Alcohol en gel 500ml','Alkofarma','Antiséptico para manos, con dosificador.',12.00,'Cuidado Personal','/img/productos/alcoholgel.jpg',200,b'1','2028-01-31'),
  (5,'FAR-0005','Termómetro digital','Omron','Termómetro clínico digital de lectura rápida.',18.50,'Equipos Médicos','/img/productos/termometro.jpg',40,b'1',NULL),
  (6,'FAR-0006','Mascarillas KN95 (x10 unidades)','3M','Mascarillas de protección respiratoria certificadas.',22.00,'Cuidado Personal','/img/productos/mascarillas.jpg',150,b'1','2029-06-30'),
  (7,'FAR-0007','Amoxicilina 500mg (x12 cápsulas)','Medifarma','Antibiótico de amplio espectro. Venta con receta médica.',15.90,'Medicamentos','img/productos/amoxicilina.jpg',50,b'1','2027-09-30'),
  (8,'FAR-0008','Loratadina 10mg (x10 tabletas)','Genfar','Antialérgico para rinitis, estornudos y picazón.',6.50,'Medicamentos','img/productos/loratadina.jpg',90,b'1','2028-02-29'),
  (9,'FAR-0009','Omeprazol 20mg (x14 cápsulas)','Medifarma','Protector gástrico para acidez y gastritis.',9.80,'Medicamentos','img/productos/omeprazol.jpg',4,b'1','2027-12-31'),
  (10,'FAR-0010','Antigripal (x10 tabletas)','Panadol','Alivia los síntomas de la gripe y el resfrío común.',7.90,'Medicamentos','img/productos/antigripal.jpg',70,b'1','2027-10-31'),
  (11,'FAR-0011','Multivitamínico (x30 tabletas)','Centrum','Vitaminas y minerales para la energía del día a día.',32.00,'Suplementos','img/productos/multivitaminico.jpg',45,b'1','2028-05-31'),
  (12,'FAR-0012','Omega 3 1000mg (x60 cápsulas)','Nature''s Bounty','Aceite de pescado que apoya la salud cardiovascular.',39.90,'Suplementos','img/productos/omega3.jpg',30,b'1','2028-04-30'),
  (13,'FAR-0013','Colágeno hidrolizado 300g','Colnatur','Suplemento en polvo para piel, cabello y articulaciones.',54.90,'Suplementos','img/productos/colageno.jpg',0,b'1','2027-07-31'),
  (14,'FAR-0014','Protector solar FPS 50 (120ml)','La Roche-Posay','Protección UVA/UVB de amplio espectro, resistente al agua.',45.00,'Cuidado Personal','img/productos/protectorsolar.jpg',35,b'1','2028-06-30'),
  (15,'FAR-0015','Shampoo anticaspa 400ml','Head & Shoulders','Limpieza profunda que controla la caspa desde el primer uso.',21.50,'Cuidado Personal','img/productos/shampoo.jpg',60,b'1','2028-09-30'),
  (16,'FAR-0016','Tensiómetro digital de brazo','Omron','Mide la presión arterial y el pulso con memoria de lecturas.',129.00,'Equipos Médicos','img/productos/tensiometro.jpg',12,b'1',NULL),
  (17,'FAR-0017','Oxímetro de pulso','Beurer','Mide la saturación de oxígeno y la frecuencia cardiaca.',59.90,'Equipos Médicos','img/productos/oximetro.jpg',3,b'1',NULL),
  (18,'FAR-0018','Botiquín de primeros auxilios','Farma','Incluye gasas, vendas, esparadrapo, tijera y guantes.',49.00,'Primeros Auxilios','img/productos/botiquin.jpg',20,b'1','2029-12-31'),
  (19,'FAR-0019','Gasas estériles 10x10cm (x10)','Farma','Gasas de algodón estériles para curaciones.',4.50,'Primeros Auxilios','img/productos/gasas.jpg',100,b'1','2030-03-31'),
  (20,'FAR-0020','Pañales para bebé talla M (x40)','Huggies','Pañales ultra absorbentes con cintas ajustables.',42.90,'Cuidado del Bebé','img/productos/panales.jpg',25,b'1','2029-01-31');

-- ---------------------------------------------------------------------
-- Tabla USUARIOS
--   rol : ADMIN entra al panel; CLIENTE es un comprador normal.
--   La contraseña va cifrada con BCrypt (no se guarda en texto plano).
-- ---------------------------------------------------------------------
CREATE TABLE `usuarios` (
  `id_usuario` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `apellido` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `correo` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contrasena` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `telefono` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rol` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'CLIENTE',
  `fecha_registro` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_usuario`),
  UNIQUE KEY `correo` (`correo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `usuarios` (`nombre`,`apellido`,`correo`,`contrasena`,`telefono`,`rol`) VALUES
  ('Administrador','Farma','admin@farma.com','$2a$10$f4t6BwyVgqZSq4UwbaUY9e0ET/5aL6CfXudxZd.oP2dhv9XD59QEm',NULL,'ADMIN');

-- ---------------------------------------------------------------------
-- Verificación
-- ---------------------------------------------------------------------
SELECT COUNT(*) AS total_productos FROM `productos`;                 -- debe ser 20
SELECT `codigo`,`nombre`,`marca`,`precio`,`stock`,`activo`+0 AS activo FROM `productos` ORDER BY `codigo`;
SELECT `id_usuario`,`nombre`,`correo`,`rol` FROM `usuarios`;         -- debe mostrar solo el admin
