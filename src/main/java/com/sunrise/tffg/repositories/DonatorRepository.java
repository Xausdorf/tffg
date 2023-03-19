package com.sunrise.tffg.repositories;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.sunrise.tffg.model.Donator;

public interface DonatorRepository extends JpaRepository<Donator, UUID> {

    @Query("SELECT d FROM Donator d WHERE d.email = ?1 OR d.phone = ?2")
    Optional<Donator> findDonatorByEmailOrPhone(String email, String phone);
    
    @Query("SELECT d FROM Donator d WHERE d.email = ?1")
    Optional<Donator> findDonatorByEmail(String email);
    
    @Query("SELECT d FROM Donator d WHERE d.phone = ?1")
    Optional<Donator> findDonatorByPhone(String phone);

    @Query("SELECT d FROM Donator d WHERE d.level = ?1")
    List<Donator> findAllByLevel(Integer level);
}
