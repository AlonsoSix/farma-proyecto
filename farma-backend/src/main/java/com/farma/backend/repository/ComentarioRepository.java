package com.farma.backend.repository;

import com.farma.backend.model.Comentario;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ComentarioRepository extends JpaRepository<Comentario, Integer> {

    // Las opiniones más recientes aparecen primero en la página de Contacto
    List<Comentario> findAllByOrderByFechaDescIdDesc();
}
