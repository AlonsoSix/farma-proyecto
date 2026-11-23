-- =====================================================================
--  Restablecer la contraseña del administrador
--
--  La deja como en el script completo: admin12345.
--  El hash BCrypt es el mismo que usa farma_db_completo.sql.
-- =====================================================================

USE `farma_db`;

UPDATE `usuarios`
SET `contrasena` = '$2a$10$f4t6BwyVgqZSq4UwbaUY9e0ET/5aL6CfXudxZd.oP2dhv9XD59QEm'
WHERE `correo` = 'admin@farma.com';

SELECT `id_usuario`, `nombre`, `correo`, `rol` FROM `usuarios` WHERE `correo` = 'admin@farma.com';
