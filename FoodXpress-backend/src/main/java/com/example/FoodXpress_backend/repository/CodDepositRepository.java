package com.example.FoodXpress_backend.repository;

import com.example.FoodXpress_backend.entity.CodDeposit;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface CodDepositRepository extends JpaRepository<CodDeposit, Long> {

    List<CodDeposit> findByDeliveryPartner_IdOrderBySubmittedAtDesc(
            Long partnerId
    );

    List<CodDeposit> findByStatusOrderBySubmittedAtAsc(String status);

    Optional<CodDeposit> findByIdAndDeliveryPartner_Id(
            Long depositId,
            Long partnerId
    );

    List<CodDeposit> findByEarning_IdOrderBySubmittedAtDesc(Long earningId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT d FROM CodDeposit d WHERE d.id = :depositId")
    Optional<CodDeposit> findByIdForUpdate(
            @Param("depositId") Long depositId
    );

    @Query("""
            SELECT COALESCE(SUM(d.amount), 0)
            FROM CodDeposit d
            WHERE d.earning.id = :earningId
              AND d.status = 'VERIFIED'
            """)
    BigDecimal getVerifiedAmountForEarning(
            @Param("earningId") Long earningId
    );

    @Query("""
            SELECT COALESCE(SUM(d.amount), 0)
            FROM CodDeposit d
            WHERE d.earning.id = :earningId
              AND d.status = 'PENDING'
            """)
    BigDecimal getPendingAmountForEarning(
            @Param("earningId") Long earningId
    );

    @Query("""
            SELECT COALESCE(SUM(d.amount), 0)
            FROM CodDeposit d
            WHERE d.deliveryPartner.id = :partnerId
              AND d.status = 'PENDING'
            """)
    BigDecimal getPendingDepositAmount(
            @Param("partnerId") Long partnerId
    );

    @Query("""
            SELECT COALESCE(SUM(d.amount), 0)
            FROM CodDeposit d
            WHERE d.deliveryPartner.id = :partnerId
              AND d.status = 'VERIFIED'
            """)
    BigDecimal getVerifiedDepositAmount(
            @Param("partnerId") Long partnerId
    );
}