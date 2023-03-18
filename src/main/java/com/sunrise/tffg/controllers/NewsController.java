package com.sunrise.tffg.controllers;

import java.util.List;
import java.util.UUID;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.sunrise.tffg.model.News;
import com.sunrise.tffg.services.NewsService;

@RestController
@RequestMapping(path = "api/v1/news")
public class NewsController {

    private final NewsService newsService;

    public NewsController(NewsService newsService) {
        this.newsService = newsService;
    }

    @GetMapping
    public List<News> getNews() {
        return newsService.getNews();
    }

    @PostMapping
    public void addNews(@RequestBody News news) {
        newsService.addNews(news);
    }

    @DeleteMapping(path = "{newsId}")
    public void deleteNews(@PathVariable("newsId") UUID newsId) {
        newsService.deleteNews(newsId);
    }

    @PutMapping(path = "{newsId}")
    public void updateNews(
            @PathVariable("newsId") UUID newsId,
            @RequestParam(required = false) String title,
            @RequestParam(required = false) String text,
            @RequestParam(required = false) String imgSrc) {
        newsService.updateNews(newsId, title, text, imgSrc);
    }
}
