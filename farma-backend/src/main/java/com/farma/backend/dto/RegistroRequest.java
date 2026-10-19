package com.farma.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class RegistroRequest {

    @NotBlank(message = "El nombre es obligatorio.")
    @Size(max = 100, message = "El nombre no puede exceder 100 caracteres.")
    private String nombre;

    @NotBlank(message = "El apellido es obligatorio.")
    @Size(max = 100, message = "El apellido no puede exceder 100 caracteres.")
    private String apellido;

    @NotBlank(message = "El correo electrónico es obligatorio.")
    @Email(message = "El formato de correo no es válido.")
    @Size(max = 150, message = "El correo no puede exceder 150 caracteres.")
    private String correo;

    @NotBlank(message = "La contraseña es obligatoria.")
    @Size(min = 6, message = "La contraseña debe tener al menos 6 caracteres.")
    private String contrasena;

    @Size(max = 20, message = "El teléfono no puede exceder 20 caracteres.")
    private String telefono;

    public RegistroRequest() {
    }

    public RegistroRequest(String nombre, String apellido, String correo, String contrasena, String telefono) {
        this.nombre = nombre;
        this.apellido = apellido;
        this.correo = correo;
        this.contrasena = contrasena;
        this.telefono = telefono;
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

    public String getContrasena() {
        return contrasena;
    }

    public void setContrasena(String contrasena) {
        this.contrasena = contrasena;
    }

    public String getTelefono() {
        return telefono;
    }

    public void setTelefono(String telefono) {
        this.telefono = telefono;
    }
}