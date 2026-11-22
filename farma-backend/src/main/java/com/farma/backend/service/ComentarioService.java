package com.farma.backend.service;

import com.farma.backend.dto.ComentarioRequest;
import com.farma.backend.model.Comentario;
import com.farma.backend.repository.ComentarioRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Servicio de opiniones de clientes.
 * Cumple con SOLID:
 * - SRP: valida y persiste únicamente los comentarios con calificación.
 * - DIP: ComentarioRepository se inyecta mediante constructor.
 */
@Service
public class ComentarioService {

    private static final int NOMBRE_MIN = 2;
    private static final int NOMBRE_MAX = 100;
    private static final int COMENTARIO_MIN = 10;
    private static final int COMENTARIO_MAX = 500;

    private final ComentarioRepository comentarioRepository;

    public ComentarioService(ComentarioRepository comentarioRepository) {
        this.comentarioRepository = comentarioRepository;
    }

    /** Opiniones publicadas, de la más reciente a la más antigua. */
    public List<Comentario> listar() {
        return comentarioRepository.findAllByOrderByFechaDescIdDesc();
    }

    /** Valida y guarda una opinión nueva. */
    public Comentario registrar(ComentarioRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Los datos de la opinión son obligatorios.");
        }

        String nombre = request.getNombre() == null ? "" : request.getNombre().trim();
        if (nombre.length() < NOMBRE_MIN || nombre.length() > NOMBRE_MAX) {
            throw new IllegalArgumentException("El nombre debe tener entre " + NOMBRE_MIN + " y " + NOMBRE_MAX + " caracteres.");
        }

        Integer calificacion = request.getCalificacion();
        if (calificacion == null || calificacion < 1 || calificacion > 5) {
            throw new IllegalArgumentException("La calificación debe ser un número entero de 1 a 5 estrellas.");
        }

        String texto = request.getComentario() == null ? "" : request.getComentario().trim();
        if (texto.length() < COMENTARIO_MIN || texto.length() > COMENTARIO_MAX) {
            throw new IllegalArgumentException("El comentario debe tener entre " + COMENTARIO_MIN + " y " + COMENTARIO_MAX + " caracteres.");
        }

        Comentario comentario = new Comentario();
        comentario.setNombre(nombre);
        comentario.setCalificacion(calificacion);
        comentario.setComentario(texto);
        // Sin nanosegundos: la fecha viaja como "2026-11-22T09:40:34" y el navegador la interpreta igual.
        comentario.setFecha(LocalDateTime.now().withNano(0));
        return comentarioRepository.save(comentario);
    }
}
