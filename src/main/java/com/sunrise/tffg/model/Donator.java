package com.sunrise.tffg.model;

import java.time.LocalDate;
import java.util.UUID;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table
public class Donator {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;
    private String email;
    private String phone;
    private String name;
    private Integer level;
    private LocalDate joinDate;

    public Donator() {
    }

    public Donator(String email, String phone, String name, Integer level) {
        this.email = email;
        this.phone = phone;
        this.name = name;
        this.level = level;
    }

    public Donator(UUID id, String email, String phone, String name, Integer level, LocalDate joinDate) {
        this.id = id;
        this.email = email;
        this.phone = phone;
        this.name = name;
        this.level = level;
        this.joinDate = joinDate;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public LocalDate getJoinDate() {
        return joinDate;
    }

    public void setJoinDate(LocalDate joinDate) {
        this.joinDate = joinDate;
    }

    @Override
    public String toString() {
        return "Donator [id=" + id + ", email=" + email + ", phone=" + phone + ", name=" + name + ", level=" + level
                + ", joinDate=" + joinDate + "]";
    }

    public Integer getLevel() {
        return level;
    }

    public void setLevel(Integer level) {
        this.level = level;
    }

}
