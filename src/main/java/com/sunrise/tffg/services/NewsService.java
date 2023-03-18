package com.sunrise.tffg.services;

import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Service;

import com.sunrise.tffg.model.News;
import com.sunrise.tffg.repositories.NewsRepository;

import jakarta.transaction.Transactional;

@Service
public class NewsService {

    private final NewsRepository newsRepository;

    public NewsService(NewsRepository newsRepository) {
        this.newsRepository = newsRepository;
    }

    public List<News> getNews() {
        return newsRepository.findAll();
    }

    public void addNews(News news) {
        Optional<News> newsOptional = newsRepository.findNewsByTitle(news.getTitle());
        if (newsOptional.isPresent()) {
            throw new IllegalStateException("title taken");
        }

        newsRepository.save(news);
    }

    public void deleteNews(UUID newsId) {
        boolean exists = newsRepository.existsById(newsId);
        if (!exists) {
            throw new IllegalStateException("News with id " + newsId + " does not exist");
        }

        newsRepository.deleteById(newsId);
    }

    @Transactional
    public void updateNews(UUID newsId, String title, String text, String imgSrc) {
        News news = newsRepository.findById(newsId)
                .orElseThrow(() -> new IllegalStateException("News with id " + newsId + " does not exist"));

        if (title != null && title.length() > 0 && !Objects.equals(news.getTitle(), title)) {
            Optional<News> newsOptional = newsRepository.findNewsByTitle(title);
            if (newsOptional.isPresent()) {
                throw new IllegalStateException("title taken");
            }
            news.setTitle(title);
        }

        if (text != null && text.length() > 0 && !Objects.equals(news.getText(), text)) {
            news.setText(text);
        }

        if (imgSrc != null && imgSrc.length() > 0 && !Objects.equals(news.getImgSrc(), imgSrc)) {
            news.setImgSrc(imgSrc);
        }
    }
}
