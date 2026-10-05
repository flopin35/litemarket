package com.litemarket.payment;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    Optional<Payment> findByReference(String reference);

    List<Payment> findTop50ByStoreIdAndPurposeOrderByCreatedAtDesc(Long storeId, PaymentPurpose purpose);

    List<Payment> findTop200ByOrderByCreatedAtDesc();

    List<Payment> findByStoreIdAndSettlement(Long storeId, Settlement settlement);

    List<Payment> findBySettlement(Settlement settlement);

    List<Payment> findByStatusAndPurpose(PaymentStatus status, PaymentPurpose purpose);

    /**
     * Marks a payment successful only if it isn't already. Returns 1 for the one caller that wins,
     * 0 for everyone else, so a webhook and a browser redirect can't both deliver the same plan.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update Payment p set p.status = :status, p.paidAt = :paidAt where p.id = :id and p.status <> :status")
    int markStatusOnce(@Param("id") Long id, @Param("status") PaymentStatus status, @Param("paidAt") Instant paidAt);

    @Query("select sum(p.amount) from Payment p where p.status = :status and p.purpose = :purpose and p.provider <> 'demo'")
    BigDecimal sumAmount(@Param("status") PaymentStatus status, @Param("purpose") PaymentPurpose purpose);
}
