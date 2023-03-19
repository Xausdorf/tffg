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
            donatorRepository.saveAll(List.of(
                new Donator(
                    UUID.randomUUID(),
                    "test3@mail.com",
                    "+99999999993",
                    "Кулаковский Даниил Семёнович",
                    1,
                    LocalDate.of(2000, Month.AUGUST, 12)
                ), new Donator(
                    UUID.randomUUID(),
                    "test5@mail.com",
                    "+99999999994",
                    "Багардынов Айтал Прокопьевич",
                    2,
                    LocalDate.of(2000, Month.AUGUST, 12)
                ), new Donator(
                    UUID.randomUUID(),
                    "test4@mail.com",
                    "+99999999995",
                    "Яковлев Иван Борисович",
                    3,
                    LocalDate.of(2000, Month.AUGUST, 12)
                ), new Donator(
                    UUID.randomUUID(),
                    "test6@mail.com",
                    "+99999999996",
                    "Кинаев Фома Артёмович",
                    1,
                    LocalDate.of(2000, Month.AUGUST, 12)
                )
            ));
        };
    }
}
