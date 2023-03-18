package com.sunrise.tffg.model;

import jakarta.persistence.*;

import java.util.Objects;
import java.util.UUID;
import java.time.LocalDate;

@Entity
@Table
public class News {

    @Id
    @GeneratedValue(strategy= GenerationType.AUTO)
    private UUID id;
    private String title;
    private String text;
    private String imgSrc;
    private LocalDate releaseDate;

    public News() {
    }

    public News(UUID id, String title, String text, String imgSrc, LocalDate releaseDate) {
        this.id = id;
        this.title = title;
        this.text = text;
        this.imgSrc = imgSrc;
        this.releaseDate = releaseDate;
    }

    public News(String title, String text, String imgSrc, LocalDate releaseDate) {
        this.title = title;
        this.text = text;
        this.imgSrc = imgSrc;
        this.releaseDate = releaseDate;
    }

    public UUID getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public String getText() {
        return text;
    }

    public String getImgSrc() {
        return imgSrc;
    }

    public LocalDate getReleaseDate() {
        return releaseDate;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public void setText(String text) {
        this.text = text;
    }

    public void setImgSrc(String imgSrc) {
        this.imgSrc = imgSrc;
    }

    public void setReleaseDate(LocalDate releaseDate) {
        this.releaseDate = releaseDate;
    }

    @Override
    public String toString() {
        return "News{" +
                "id=" + id +
                ", title='" + title + '\'' +
                ", text='" + text + '\'' +
                ", imgSrc='" + imgSrc + '\'' +
                ", releaseDate=" + releaseDate +
                '}';
    }
}
