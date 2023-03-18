package com.sunrise.tffg.config;

import java.time.LocalDate;
import java.time.Month;
import java.util.List;
import java.util.UUID;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.sunrise.tffg.model.News;
import com.sunrise.tffg.repositories.NewsRepository;

@Configuration
public class NewsConfig {

    @Bean
    CommandLineRunner commandLineRunner(NewsRepository newsRepository) {
        return args -> {
            News test1 = new News(
                    UUID.randomUUID(),
                    "Test title",
                    "Test text.",
                    "https://static01.nyt.com/images/2019/02/05/world/05egg/15xp-egg-promo-superJumbo-v2.jpg?quality=75&auto=webp",
                    LocalDate.of(2000, Month.AUGUST, 12)
            );

            News test2 = new News(
                    UUID.randomUUID(),
                    "Test title 2",
                    "Test text 2.",
                    "https://images.immediate.co.uk/production/volatile/sites/30/2020/02/Avocados-3d84a3a.jpg",
                    LocalDate.of(1998, Month.AUGUST, 14)
            );

            newsRepository.saveAll(
                    List.of(test1, test2)
            );
        };
    }
}
