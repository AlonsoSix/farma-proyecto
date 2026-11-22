package com.farma.backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Opinión publicada por un cliente en la sección "Opiniones" de Contacto.
 * La calificación va de 1 a 5 estrellas y el texto se muestra tal como se escribió.
 */
@Entity
@Table(name = "comentarios")
public class Comentario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_comentario")
    private Integer id;

    @Column(nullable = false, length = 100)
    private String nombre;

    @Column(nullable = false)
    private Integer calificacion;

    @Column(nullable = false, length = 500)
    private String comentario;

    @Column(nullable = false)
    private LocalDateTime fecha = LocalDateTime.now();

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public Integer getCalificacion() { return calificacion; }
    public void setCalificacion(Integer calificacion) { this.calificacion = calificacion; }
    public String getComentario() { return comentario; }
    public void setComentario(String comentario) { this.comentario = comentario; }
    public LocalDateTime getFecha() { return fecha; }
    public void setFecha(LocalDateTime fecha) { this.fecha = fecha; }
}
