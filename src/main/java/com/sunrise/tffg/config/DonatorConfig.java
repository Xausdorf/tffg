package com.sunrise.tffg.config;

import java.time.LocalDate;
import java.time.Month;
import java.util.List;
import java.util.UUID;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.sunrise.tffg.model.Donator;
import com.sunrise.tffg.repositories.DonatorRepository;

@Configuration
public class DonatorConfig {

    @Bean
    CommandLineRunner commandLineRunner(DonatorRepository donatorRepository) {
        return args -> {
            Donator test1 = new Donator(
                UUID.randomUUID(),
                "test@mail.com",
                "+99999999999",
                "tester 1",
                22000L,
                LocalDate.of(2000, Month.AUGUST, 12)
            );
            Donator test2 = new Donator(
                UUID.randomUUID(),
                "test2@mail.com",
                "+99999999992",
                "tester 2",
                2000L,
                LocalDate.of(1998, Month.AUGUST, 14)
            );

            donatorRepository.saveAll(
                List.of(test1, test2)
            );
        };
    }
}
