package com.sunrise.tffg.repositories;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.sunrise.tffg.model.News;

public interface NewsRepository extends JpaRepository<News, UUID> {

    @Query("SELECT d FROM News d WHERE d.title = ?1")
    Optional<News> findNewsByTitle(String title);
}
