package com.farma.backend.controller;

import com.farma.backend.model.Producto;
import com.farma.backend.repository.ProductoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/productos")
@CrossOrigin(origins = "*")
public class ProductoController {

    @Autowired
    private ProductoRepository productoRepository;

    @GetMapping
    public List<Producto> listar() {
        return productoRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> obtenerPorId(@PathVariable Integer id) {
        return productoRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).body(null));
    }

    @PostMapping
    public ResponseEntity<?> crear(@RequestBody Producto producto) {
        if (producto.getNombre() == null || producto.getNombre().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "El nombre del producto es obligatorio."));
        }
        if (producto.getPrecio() == null || producto.getPrecio().compareTo(BigDecimal.ZERO) < 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "El precio debe ser mayor o igual a 0."));
        }
        if (producto.getStock() == null || producto.getStock() < 0) {
            producto.setStock(0);
        }
        producto.setFechaCreacion(LocalDateTime.now());
        Producto guardado = productoRepository.save(producto);
        return ResponseEntity.status(HttpStatus.CREATED).body(guardado);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> actualizar(@PathVariable Integer id, @RequestBody Producto datos) {
        return productoRepository.findById(id)
                .map(producto -> {
                    if (datos.getNombre() != null && !datos.getNombre().trim().isEmpty()) {
                        producto.setNombre(datos.getNombre().trim());
                    }
                    if (datos.getDescripcion() != null) {
                        producto.setDescripcion(datos.getDescripcion().trim());
                    }
                    if (datos.getPrecio() != null && datos.getPrecio().compareTo(BigDecimal.ZERO) >= 0) {
                        producto.setPrecio(datos.getPrecio());
                    }
                    if (datos.getCategoria() != null) {
                        producto.setCategoria(datos.getCategoria().trim());
                    }
                    if (datos.getImagenUrl() != null) {
                        producto.setImagenUrl(datos.getImagenUrl().trim());
                    }
                    if (datos.getStock() != null && datos.getStock() >= 0) {
                        producto.setStock(datos.getStock());
                    }
                    Producto actualizado = productoRepository.save(producto);
                    return ResponseEntity.ok(actualizado);
                })
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).body(null));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminar(@PathVariable Integer id) {
        return productoRepository.findById(id)
                .map(producto -> {
                    productoRepository.delete(producto);
                    return ResponseEntity.ok(Map.of("mensaje", "Producto eliminado correctamente.", "id", id));
                })
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).body(null));
    }
}