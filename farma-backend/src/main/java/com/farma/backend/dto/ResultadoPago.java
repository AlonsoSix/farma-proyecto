package com.farma.backend.dto;

/**
 * Resultado de cobrar una venta. No contiene datos sensibles de la tarjeta:
 * solo la marca, los últimos 4 dígitos y la referencia del cargo en la pasarela.
 */
public record ResultadoPago(
        String estado,          // APROBADO | PENDIENTE
        String pasarela,        // CULQI | SIMULADO | EFECTIVO
        String referencia,      // chr_... de Culqi o SIM-... en modo simulado
        String marcaTarjeta,    // Visa, Mastercard, etc. (null si no aplica)
        String ultimos4         // últimos 4 dígitos (null si no aplica)
) {
}
