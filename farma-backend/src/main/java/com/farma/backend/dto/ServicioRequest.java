package com.farma.backend.dto;

import jakarta.validation.constraints.NotBlank;

public class ServicioRequest {

    @NotBlank(message = "El título del servicio es obligatorio.")
    private String titulo;

    @NotBlank(message = "La descripción es obligatoria.")
    private String descripcion;

    private String icono;

    private Boolean activo;

    public ServicioRequest() {
    }

    public ServicioRequest(String titulo, String descripcion, String icono, Boolean activo) {
        this.titulo = titulo;
        this.descripcion = descripcion;
        this.icono = icono;
        this.activo = activo;
    }

    public String getTitulo() {
        return titulo;
    }

    public void setTitulo(String titulo) {
        this.titulo = titulo;
    }

    public String getDescripcion() {
        return descripcion;
    }

    public void setDescripcion(String descripcion) {
        this.descripcion = descripcion;
    }

    public String getIcono() {
        return icono;
    }

    public void setIcono(String icono) {
        this.icono = icono;
    }

    public Boolean getActivo() {
        return activo;
    }

    public void setActivo(Boolean activo) {
        this.activo = activo;
    }
}
