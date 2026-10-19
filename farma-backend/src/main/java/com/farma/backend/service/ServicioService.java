package com.farma.backend.service;

import com.farma.backend.dto.ServicioRequest;
import com.farma.backend.model.Servicio;

import java.util.List;

public interface ServicioService {
    List<Servicio> listar(boolean todos);
    Servicio obtenerPorId(Integer id);
    Servicio crear(ServicioRequest request);
    Servicio actualizar(Integer id, ServicioRequest request);
    void eliminar(Integer id);
    Servicio cambiarEstado(Integer id, Boolean activo);
}
