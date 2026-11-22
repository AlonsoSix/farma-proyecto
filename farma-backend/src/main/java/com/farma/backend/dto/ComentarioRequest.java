package com.farma.backend.dto;

/**
 * Datos que envía un cliente al registrar una opinión.
 * El id y la fecha los asigna el sistema.
 */
public class ComentarioRequest {

    private String nombre;
    private Integer calificacion;   // 1 a 5 estrellas
    private String comentario;

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public Integer getCalificacion() { return calificacion; }
    public void setCalificacion(Integer calificacion) { this.calificacion = calificacion; }
    public String getComentario() { return comentario; }
    public void setComentario(String comentario) { this.comentario = comentario; }
}
