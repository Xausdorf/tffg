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
    @GeneratedValue(strategy=GenerationType.AUTO)
    private UUID id;
    private String email;
    private String phone;
    private String name;
    private Long sum;
    private LocalDate joinDate;

    public Donator() {
    }

    public Donator(UUID id, String email, String phone, String name, Long sum, LocalDate joinDate) {
        this.id = id;
        this.email = email;
        this.phone = phone;
        this.name = name;
        this.sum = sum;
        this.joinDate = joinDate;
    }

    public Donator(String email, String phone, String name, Long sum, LocalDate joinDate) {
        this.email = email;
        this.phone = phone;
        this.name = name;
        this.sum = sum;
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

    public Long getSum() {
        return sum;
    }

    public void setSum(Long sum) {
        this.sum = sum;
    }

    public LocalDate getJoinDate() {
        return joinDate;
    }

    public void setJoinDate(LocalDate joinDate) {
        this.joinDate = joinDate;
    }

    @Override
    public String toString() {
        return "Donator [id=" + id + ", email=" + email + ", phone=" + phone + ", name=" + name + ", sum=" + sum
                + ", joinDate=" + joinDate + "]";
    }

}
