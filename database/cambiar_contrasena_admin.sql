-- =====================================================================
--  Cambiar (o recuperar) la contraseña del ADMINISTRADOR
--  Correo: admin@farma.com
--  Nueva contraseña: admin12345
--
--  La contraseña se guarda cifrada con BCrypt (igual que la de los clientes),
--  por eso aquí va el texto cifrado y no "admin12345" directamente.
--  Ejecutar en MySQL Workbench (rayo ⚡). No hace falta reiniciar el backend.
-- =====================================================================
USE `farma_db`;

UPDATE `usuarios`
SET `contrasena` = '$2a$10$f4t6BwyVgqZSq4UwbaUY9e0ET/5aL6CfXudxZd.oP2dhv9XD59QEm',
    `rol` = 'ADMIN'
WHERE `correo` = 'admin@farma.com';

-- Verificación: debe salir 1 fila con rol ADMIN
SELECT `id_usuario`, `nombre`, `correo`, `rol` FROM `usuarios` WHERE `correo` = 'admin@farma.com';
