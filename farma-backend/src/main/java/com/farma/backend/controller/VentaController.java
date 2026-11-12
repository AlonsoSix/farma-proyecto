package com.farma.backend.controller;

import com.farma.backend.dto.VentaRequest;
import com.farma.backend.model.Venta;
import com.farma.backend.service.VentaService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controlador REST para el registro y consulta de ventas.
 * Cumple con SRP: Enrutamiento HTTP puro, delegando el manejo de errores al GlobalExceptionHandler.
 * Cumple con DIP: VentaService inyectado mediante constructor.
 */
@RestController
@RequestMapping("/api/ventas")
@CrossOrigin(origins = "*")
public class VentaController {

    private final VentaService ventaService;

    public VentaController(VentaService ventaService) {
        this.ventaService = ventaService;
    }

    // POST /api/ventas -> confirma la compra del carrito y devuelve la boleta
    @PostMapping
    public ResponseEntity<Venta> registrar(@RequestBody VentaRequest datos) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ventaService.registrar(datos));
    }

    // GET /api/ventas/usuario/3 -> historial de compras del usuario 3
    @GetMapping("/usuario/{idUsuario}")
    public List<Venta> listarPorUsuario(@PathVariable("idUsuario") Integer idUsuario) {
        return ventaService.listarPorUsuario(idUsuario);
    }

    // GET /api/ventas/B001-00000001 -> una boleta por su número
    @GetMapping("/{numero}")
    public Venta buscar(@PathVariable("numero") String numero) {
        return ventaService.buscarPorNumero(numero);
    }
}
