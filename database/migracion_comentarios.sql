-- =====================================================================
--  FARMA - Migración: opiniones de clientes
--
--  Ejecuta este script SOLO si ya tenías la base `farma_db` creada con una
--  versión anterior del proyecto. Si vas a ejecutar
--  `farma_db_completo.sql`, ese script ya incluye la tabla.
--
--  Crea la tabla `comentarios` y agrega 6 opiniones de ejemplo.
--  No borra productos, usuarios ni ventas existentes.
-- =====================================================================

USE `farma_db`;

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `comentarios` (
  `id_comentario` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `calificacion` int NOT NULL,
  `comentario` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_comentario`),
  KEY `idx_comentarios_fecha` (`fecha`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- INSERT IGNORE evita duplicar las opiniones si el script se ejecuta dos veces
INSERT IGNORE INTO `comentarios` (`id_comentario`,`nombre`,`calificacion`,`comentario`,`fecha`) VALUES
  (1,'María Rodríguez',5,'Pedí por WhatsApp y en menos de una hora tenía mis medicinas en casa. Muy buena atención.','2026-11-18 10:20:00'),
  (2,'Jorge Quispe',5,'El químico farmacéutico me explicó con paciencia cómo tomar mi tratamiento. Volveré siempre.','2026-11-15 16:45:00'),
  (3,'Lucía Torres',4,'Buenos precios y siempre tienen stock. Me gustaría que abran una sucursal más cerca de mi casa.','2026-11-11 09:30:00'),
  (4,'Carlos Flores',5,'Encontré un medicamento que no había en otras farmacias. Me lo separaron por teléfono.','2026-11-06 18:10:00'),
  (5,'Clínica San Gabriel',5,'Como clínica trabajamos con ellos por convenio. Siempre cumplen con los pedidos a tiempo.','2026-10-29 12:00:00'),
  (6,'Andrea Vargas',4,'La página es fácil de usar y el carrito funciona bien. Recomiendo el delivery de los domingos.','2026-10-21 20:15:00');

SELECT COUNT(*) AS total_comentarios FROM `comentarios`;
