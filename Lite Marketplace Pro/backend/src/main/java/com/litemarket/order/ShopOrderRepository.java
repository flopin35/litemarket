package com.litemarket.order;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface ShopOrderRepository extends JpaRepository<ShopOrder, Long> {

    List<ShopOrder> findByStoreIdOrderByCreatedAtDesc(Long storeId);

    List<ShopOrder> findByStoreIdAndStatusOrderByCreatedAtDesc(Long storeId, OrderStatus status);

    List<ShopOrder> findByStoreIdAndCreatedAtAfter(Long storeId, Instant after);

    Optional<ShopOrder> findByIdAndStoreId(Long id, Long storeId);

    Optional<ShopOrder> findByNumber(String number);

    boolean existsByNumber(String number);
}
