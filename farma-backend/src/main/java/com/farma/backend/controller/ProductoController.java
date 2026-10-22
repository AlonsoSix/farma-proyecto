package com.farma.backend.controller;

import com.farma.backend.dto.ProductoRequest;
import com.farma.backend.model.Producto;
import com.farma.backend.service.ProductoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api/productos")
@CrossOrigin(origins = "*")
public class ProductoController {

    @Autowired
    private ProductoService productoService;

    /* ---------- Consultas (tienda y administrador) ---------- */

    // GET /api/productos  -> productos ACTIVOS (los que ve la tienda)
    @GetMapping
    public List<Producto> listar() {
        return productoService.listar();
    }

    // GET /api/productos/admin  -> todos, también los dados de baja (solo administrador)
    @GetMapping("/admin")
    public List<Producto> listarTodos(@RequestHeader(value = "X-Usuario-Id", required = false) Integer idUsuario) {
        return productoService.listarTodos(idUsuario);
    }

    // GET /api/productos/buscar?texto=para  -> búsqueda por código, nombre, marca o categoría
    @GetMapping("/buscar")
    public List<Producto> buscar(@RequestParam(name = "texto", required = false) String texto) {
        return productoService.buscar(texto);
    }

    // GET /api/productos/codigo/FAR-0001  -> un producto por su código
    @GetMapping("/codigo/{codigo}")
    public Producto buscarPorCodigo(@PathVariable("codigo") String codigo) {
        return productoService.buscarPorCodigo(codigo);
    }

    /* ---------- CRUD del administrador ----------
       El frontend envía la cabecera X-Usuario-Id con el id del usuario que inició sesión. */

    // POST /api/productos  -> registrar
    @PostMapping
    public ResponseEntity<Producto> registrar(@RequestBody ProductoRequest datos,
                                              @RequestHeader(value = "X-Usuario-Id", required = false) Integer idUsuario) {
        return ResponseEntity.status(HttpStatus.CREATED).body(productoService.registrar(datos, idUsuario));
    }

    // PUT /api/productos/codigo/FAR-0001  -> editar
    @PutMapping("/codigo/{codigo}")
    public Producto actualizar(@PathVariable("codigo") String codigo,
                               @RequestBody ProductoRequest datos,
                               @RequestHeader(value = "X-Usuario-Id", required = false) Integer idUsuario) {
        return productoService.actualizar(codigo, datos, idUsuario);
    }

    // PATCH /api/productos/codigo/FAR-0001/estado  {"activo": false}  -> dar de baja / activar
    @PatchMapping("/codigo/{codigo}/estado")
    public Producto cambiarEstado(@PathVariable("codigo") String codigo,
                                  @RequestBody Map<String, Boolean> datos,
                                  @RequestHeader(value = "X-Usuario-Id", required = false) Integer idUsuario) {
        return productoService.cambiarEstado(codigo, datos.get("activo"), idUsuario);
    }

    // DELETE /api/productos/codigo/FAR-0001  -> eliminar
    @DeleteMapping("/codigo/{codigo}")
    public Map<String, String> eliminar(@PathVariable("codigo") String codigo,
                                        @RequestHeader(value = "X-Usuario-Id", required = false) Integer idUsuario) {
        productoService.eliminar(codigo, idUsuario);
        return Map.of("mensaje", "Producto " + codigo.toUpperCase() + " eliminado correctamente.");
    }

    /* ---------- Errores: siempre responden {"error": "mensaje"} ---------- */

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> datosInvalidos(IllegalArgumentException e) {
        return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
    }

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<Map<String, String>> noEncontrado(NoSuchElementException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
    }

    @ExceptionHandler(SecurityException.class)
    public ResponseEntity<Map<String, String>> sinPermiso(SecurityException e) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
    }
}
