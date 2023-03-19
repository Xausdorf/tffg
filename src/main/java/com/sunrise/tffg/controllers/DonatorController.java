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

import com.sunrise.tffg.model.Donator;
import com.sunrise.tffg.services.DonatorService;

@RestController
@RequestMapping(path = "api/v1/donator")
public class DonatorController {

    private final DonatorService donatorService;

    public DonatorController(DonatorService donatorService) {
        this.donatorService = donatorService;
    }

    @GetMapping
    public List<Donator> getDonators() {
        return donatorService.getDonators();
    }
    
    @GetMapping(path = "{level}")
    public List<Donator> getDonatorsByLevel(@PathVariable("level") Integer level) {
        return donatorService.getDonatorsByLevel(level);
    }

    @PostMapping
    public void addDonator(@RequestBody Donator donator) {
        donatorService.addDonator(donator);
    }

    @DeleteMapping(path = "{donatorId}")
    public void deleteDonator(@PathVariable("donatorId") UUID donatorId) {
        donatorService.deleteDonator(donatorId);
    }

    @PutMapping(path = "{donatorId}")
    public void updateDonator(
            @PathVariable("donatorId") UUID donatorId,
            @RequestParam(required = false) String email,
            @RequestParam(required = false) String phone,
            @RequestParam(required = false) String name,
            @RequestParam(required = false) Integer level) {
        donatorService.updateDonator(donatorId, email, phone, name, level);
    }
}
