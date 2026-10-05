package com.litemarket.product;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, Long> {

    List<Product> findByStoreIdOrderByCreatedAtDesc(Long storeId);

    Optional<Product> findByIdAndStoreId(Long id, Long storeId);

    List<Product> findByStoreIdAndIdIn(Long storeId, Collection<Long> ids);

    long countByStoreId(Long storeId);
}
