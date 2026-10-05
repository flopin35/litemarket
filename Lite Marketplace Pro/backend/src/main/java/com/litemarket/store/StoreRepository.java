package com.litemarket.store;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface StoreRepository extends JpaRepository<Store, Long> {

    Optional<Store> findByOwnerId(Long ownerId);

    Optional<Store> findBySlug(String slug);

    boolean existsBySlug(String slug);

    List<Store> findAllByOrderByCreatedAtDesc();

    List<Store> findByPlanCodeNotAndPlanExpiresAtBefore(String planCode, Instant time);
}
