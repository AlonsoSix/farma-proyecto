package com.farma.backend.controller;

import com.farma.backend.dto.VentaRequest;
import com.farma.backend.model.Venta;
import com.farma.backend.service.PagoRechazadoException;
import com.farma.backend.service.VentaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api/ventas")
@CrossOrigin(origins = "*")
public class VentaController {

    @Autowired
    private VentaService ventaService;

    // POST /api/ventas  -> confirma la compra del carrito y devuelve la boleta
    @PostMapping
    public ResponseEntity<Venta> registrar(@RequestBody VentaRequest datos) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ventaService.registrar(datos));
    }

    // GET /api/ventas/B001-00000001  -> una boleta por su número (para volver a verla o imprimirla)
    @GetMapping("/{numero}")
    public Venta buscar(@PathVariable("numero") String numero) {
        return ventaService.buscarPorNumero(numero);
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

    @ExceptionHandler(PagoRechazadoException.class)
    public ResponseEntity<Map<String, String>> pagoRechazado(PagoRechazadoException e) {
        return ResponseEntity.status(HttpStatus.PAYMENT_REQUIRED).body(Map.of("error", e.getMessage()));
    }
}
