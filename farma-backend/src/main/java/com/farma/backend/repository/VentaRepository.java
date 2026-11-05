package com.farma.backend.repository;

import com.farma.backend.model.Venta;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface VentaRepository extends JpaRepository<Venta, Integer> {

    Optional<Venta> findByNumeroIgnoreCase(String numero);
}
