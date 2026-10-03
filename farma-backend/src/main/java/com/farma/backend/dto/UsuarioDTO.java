package com.farma.backend.dto;

import com.farma.backend.model.Usuario;

import java.time.LocalDateTime;

public class UsuarioDTO {

    private Integer id;
    private String nombre;
    private String apellido;
    private String correo;
    private String telefono;
    private String rol;
    private LocalDateTime fechaRegistro;

    public UsuarioDTO() {
    }

    public UsuarioDTO(Integer id, String nombre, String apellido, String correo, String telefono, String rol, LocalDateTime fechaRegistro) {
        this.id = id;
        this.nombre = nombre;
        this.apellido = apellido;
        this.correo = correo;
        this.telefono = telefono;
        this.rol = rol;
        this.fechaRegistro = fechaRegistro;
    }

    public static UsuarioDTO fromEntity(Usuario u) {
        if (u == null) return null;
        return new UsuarioDTO(
                u.getId(),
                u.getNombre(),
                u.getApellido(),
                u.getCorreo(),
                u.getTelefono(),
                u.getRol(),
                u.getFechaRegistro()
        );
    }

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public String getApellido() {
        return apellido;
    }

    public void setApellido(String apellido) {
        this.apellido = apellido;
    }

    public String getCorreo() {
        return correo;
    }

    public void setCorreo(String correo) {
        this.correo = correo;
    }

    public String getTelefono() {
        return telefono;
    }

    public void setTelefono(String telefono) {
        this.telefono = telefono;
    }

    public String getRol() {
        return rol;
    }

    public void setRol(String rol) {
        this.rol = rol;
    }

    public LocalDateTime getFechaRegistro() {
        return fechaRegistro;
    }

    public void setFechaRegistro(LocalDateTime fechaRegistro) {
        this.fechaRegistro = fechaRegistro;
    }
}
