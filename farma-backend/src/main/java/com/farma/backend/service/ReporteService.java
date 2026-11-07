package com.farma.backend.service;

import com.farma.backend.model.Producto;
import com.farma.backend.repository.ProductoRepository;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;

/**
 * Servicio encargado de generar las métricas y los 6 reportes analíticos del panel de administración:
 *   1. Ventas por mes
 *   2. Productos más vendidos (Top 10)
 *   3. Ventas por categoría
 *   4. Ventas por método de pago
 *   5. Estado del inventario (Stock bajo, sin stock, valorizado)
 *   6. Productos por vencer (Próximos 60 días)
 * Cumple con SRP y DIP (inyección por constructor).
 */
@Service
public class ReporteService {

    private final EntityManager em;
    private final ProductoRepository productoRepository;
    private final ProductoService productoService;

    public ReporteService(EntityManager em,
                          ProductoRepository productoRepository,
                          ProductoService productoService) {
        this.em = em;
        this.productoRepository = productoRepository;
        this.productoService = productoService;
    }

    public Map<String, Object> generar(LocalDate desde, LocalDate hasta, Integer idUsuario) {
        productoService.verificarAdmin(idUsuario);
        LocalDateTime inicio = (desde != null ? desde : LocalDate.of(2000, 1, 1)).atStartOfDay();
        LocalDateTime fin = (hasta != null ? hasta : LocalDate.of(2100, 1, 1)).plusDays(1).atStartOfDay();
        if (!fin.isAfter(inicio)) {
            throw new IllegalArgumentException("La fecha 'desde' no puede ser mayor que la fecha 'hasta'.");
        }

        Map<String, Object> r = new LinkedHashMap<>();
        r.put("desde", desde);
        r.put("hasta", hasta);
        r.put("generado", LocalDateTime.now());
        r.put("resumen", resumen(inicio, fin));
        r.put("ventasPorMes", ventasPorMes(inicio, fin));
        r.put("productosMasVendidos", productosMasVendidos(inicio, fin));
        r.put("ventasPorCategoria", ventasPorCategoria(inicio, fin));
        r.put("metodosPago", metodosPago(inicio, fin));

        List<Producto> productos = productoRepository.findAllByOrderByCodigoAsc();
        r.put("inventario", inventario(productos));
        r.put("vencimientos", vencimientos(productos));
        return r;
    }

    /* ---------- Resumen general (tarjetas de métricas superiores) ---------- */
    private Map<String, Object> resumen(LocalDateTime inicio, LocalDateTime fin) {
        Object[] v = em.createQuery("""
                SELECT COUNT(v), COALESCE(SUM(v.total), 0), COALESCE(SUM(v.descuentoTotal), 0)
                FROM Venta v WHERE v.fecha >= :inicio AND v.fecha < :fin
                """, Object[].class)
                .setParameter("inicio", inicio).setParameter("fin", fin).getSingleResult();
        Long unidades = em.createQuery("""
                SELECT COALESCE(SUM(d.cantidad), 0) FROM DetalleVenta d
                WHERE d.venta.fecha >= :inicio AND d.venta.fecha < :fin
                """, Long.class)
                .setParameter("inicio", inicio).setParameter("fin", fin).getSingleResult();

        long cantidad = ((Number) v[0]).longValue();
        BigDecimal total = dinero(v[1]);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("ventas", cantidad);
        m.put("ingresos", total);
        m.put("ahorroOfertas", dinero(v[2]));
        m.put("unidades", unidades);
        m.put("ticketPromedio", cantidad == 0 ? BigDecimal.ZERO
                : total.divide(BigDecimal.valueOf(cantidad), 2, RoundingMode.HALF_UP));
        return m;
    }

    /* ---------- 1. Ventas por mes ---------- */
    private List<Map<String, Object>> ventasPorMes(LocalDateTime inicio, LocalDateTime fin) {
        List<Object[]> filas = em.createQuery("""
                SELECT YEAR(v.fecha), MONTH(v.fecha), COUNT(v), SUM(v.total), SUM(v.descuentoTotal)
                FROM Venta v WHERE v.fecha >= :inicio AND v.fecha < :fin
                GROUP BY YEAR(v.fecha), MONTH(v.fecha)
                ORDER BY YEAR(v.fecha), MONTH(v.fecha)
                """, Object[].class)
                .setParameter("inicio", inicio).setParameter("fin", fin).getResultList();
        List<Map<String, Object>> lista = new ArrayList<>();
        for (Object[] f : filas) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("anio", ((Number) f[0]).intValue());
            m.put("mes", ((Number) f[1]).intValue());
            m.put("ventas", ((Number) f[2]).longValue());
            m.put("ingresos", dinero(f[3]));
            m.put("descuentos", dinero(f[4]));
            lista.add(m);
        }
        return lista;
    }

    /* ---------- 2. Top 10 más vendidos ---------- */
    private List<Map<String, Object>> productosMasVendidos(LocalDateTime inicio, LocalDateTime fin) {
        List<Object[]> filas = em.createQuery("""
                SELECT d.codigo, d.nombre, d.categoria, SUM(d.cantidad), SUM(d.importe)
                FROM DetalleVenta d
                WHERE d.venta.fecha >= :inicio AND d.venta.fecha < :fin
                GROUP BY d.codigo, d.nombre, d.categoria
                ORDER BY SUM(d.cantidad) DESC
                """, Object[].class)
                .setParameter("inicio", inicio).setParameter("fin", fin)
                .setMaxResults(10).getResultList();
        List<Map<String, Object>> lista = new ArrayList<>();
        for (Object[] f : filas) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("codigo", f[0]);
            m.put("nombre", f[1]);
            m.put("categoria", f[2]);
            m.put("unidades", ((Number) f[3]).longValue());
            m.put("ingresos", dinero(f[4]));
            lista.add(m);
        }
        return lista;
    }

    /* ---------- 3. Ventas por categoría ---------- */
    private List<Map<String, Object>> ventasPorCategoria(LocalDateTime inicio, LocalDateTime fin) {
        List<Object[]> filas = em.createQuery("""
                SELECT d.categoria, SUM(d.cantidad), SUM(d.importe)
                FROM DetalleVenta d
                WHERE d.venta.fecha >= :inicio AND d.venta.fecha < :fin
                GROUP BY d.categoria
                ORDER BY SUM(d.importe) DESC
                """, Object[].class)
                .setParameter("inicio", inicio).setParameter("fin", fin).getResultList();
        List<Map<String, Object>> lista = new ArrayList<>();
        for (Object[] f : filas) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("categoria", f[0]);
            m.put("unidades", ((Number) f[1]).longValue());
            m.put("ingresos", dinero(f[2]));
            lista.add(m);
        }
        return lista;
    }

    /* ---------- 4. Métodos de pago ---------- */
    private List<Map<String, Object>> metodosPago(LocalDateTime inicio, LocalDateTime fin) {
        List<Object[]> filas = em.createQuery("""
                SELECT v.metodoPago, COUNT(v), SUM(v.total)
                FROM Venta v
                WHERE v.fecha >= :inicio AND v.fecha < :fin
                GROUP BY v.metodoPago
                ORDER BY COUNT(v) DESC
                """, Object[].class)
                .setParameter("inicio", inicio).setParameter("fin", fin).getResultList();
        List<Map<String, Object>> lista = new ArrayList<>();
        for (Object[] f : filas) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("metodo", f[0]);
            m.put("operaciones", ((Number) f[1]).longValue());
            m.put("ingresos", dinero(f[2]));
            lista.add(m);
        }
        return lista;
    }

    /* ---------- 5. Inventario ---------- */
    private Map<String, Object> inventario(List<Producto> productos) {
        int activos = 0;
        int inactivos = 0;
        int agotados = 0;
        int stockBajo = 0;
        int conOferta = 0;
        BigDecimal valorizadoCosto = BigDecimal.ZERO;
        List<Map<String, Object>> listaBajoStock = new ArrayList<>();

        for (Producto p : productos) {
            int st = p.getStock() != null ? p.getStock() : 0;
            boolean activo = Boolean.TRUE.equals(p.getActivo());
            if (activo) activos++; else inactivos++;
            if (p.getDescuento() != null && p.getDescuento() > 0) conOferta++;

            if (st == 0) {
                agotados++;
            } else if (st <= 10) {
                stockBajo++;
            }

            if (p.getPrecio() != null) {
                valorizadoCosto = valorizadoCosto.add(p.getPrecioFinal().multiply(BigDecimal.valueOf(st)));
            }

            if (st <= 10) {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("codigo", p.getCodigo());
                item.put("nombre", p.getNombre());
                item.put("categoria", p.getCategoria());
                item.put("stock", st);
                item.put("estado", st == 0 ? "AGOTADO" : "STOCK_BAJO");
                item.put("activo", activo);
                listaBajoStock.add(item);
            }
        }

        Map<String, Object> inv = new LinkedHashMap<>();
        inv.put("totalProductos", productos.size());
        inv.put("activos", activos);
        inv.put("inactivos", inactivos);
        inv.put("agotados", agotados);
        inv.put("stockBajo", stockBajo);
        inv.put("conOferta", conOferta);
        inv.put("valorizado", valorizadoCosto.setScale(2, RoundingMode.HALF_UP));
        inv.put("alertas", listaBajoStock);
        return inv;
    }

    /* ---------- 6. Vencimientos ---------- */
    private Map<String, Object> vencimientos(List<Producto> productos) {
        LocalDate hoy = LocalDate.now();
        List<Map<String, Object>> vencidos = new ArrayList<>();
        List<Map<String, Object>> porVencer = new ArrayList<>();

        for (Producto p : productos) {
            LocalDate fv = p.getFechaVencimiento();
            if (fv == null) continue;
            long dias = ChronoUnit.DAYS.between(hoy, fv);

            Map<String, Object> item = new LinkedHashMap<>();
            item.put("codigo", p.getCodigo());
            item.put("nombre", p.getNombre());
            item.put("categoria", p.getCategoria());
            item.put("stock", p.getStock());
            item.put("fechaVencimiento", fv);
            item.put("diasRestantes", dias);

            if (dias < 0) {
                item.put("estado", "VENCIDO");
                vencidos.add(item);
            } else if (dias <= 60) {
                item.put("estado", dias <= 30 ? "URGENTE" : "PROXIMO");
                porVencer.add(item);
            }
        }

        porVencer.sort(Comparator.comparingLong(a -> (Long) a.get("diasRestantes")));
        vencidos.sort(Comparator.comparingLong(a -> (Long) a.get("diasRestantes")));

        Map<String, Object> ven = new LinkedHashMap<>();
        ven.put("totalVencidos", vencidos.size());
        ven.put("totalPorVencer", porVencer.size());
        ven.put("porVencer", porVencer);
        ven.put("vencidos", vencidos);
        return ven;
    }

    private BigDecimal dinero(Object val) {
        if (val == null) return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        if (val instanceof BigDecimal b) return b.setScale(2, RoundingMode.HALF_UP);
        if (val instanceof Number n) return BigDecimal.valueOf(n.doubleValue()).setScale(2, RoundingMode.HALF_UP);
        return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
    }
}
