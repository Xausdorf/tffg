package com.sunrise.tffg.services;

import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Service;

import com.sunrise.tffg.InternalException;
import com.sunrise.tffg.model.Donator;
import com.sunrise.tffg.repositories.DonatorRepository;

import jakarta.transaction.Transactional;

@Service
public class DonatorService {

    private final DonatorRepository donatorRepository;

    public DonatorService(DonatorRepository donatorRepository) {
        this.donatorRepository = donatorRepository;
    }

    public List<Donator> getDonators() {
        return donatorRepository.findAll();
    }
    
    public List<Donator> getDonatorsByLevel(Integer level) {
        return donatorRepository.findAllByLevel(level);
    }

    public void addDonator(Donator donator) {
        Optional<Donator> donatorOptional = donatorRepository.findDonatorByEmailOrPhone(donator.getEmail(),
                donator.getPhone());
        if (donatorOptional.isPresent()) {
            throw new InternalException("email or phone taken");
        }

        donator.setJoinDate(LocalDate.now());

        donatorRepository.save(donator);
    }

    public void deleteDonator(UUID donatorId) {
        boolean exists = donatorRepository.existsById(donatorId);
        if (!exists) {
            throw new InternalException("donator with id " + donatorId + " does not exist");
        }

        donatorRepository.deleteById(donatorId);
    }

    @Transactional
    public void updateDonator(UUID donatorId, String email, String phone, String name, Integer level) {
        Donator donator = donatorRepository.findById(donatorId)
                .orElseThrow(() -> new IllegalStateException("donator with id " + donatorId + " does not exist"));

        if (email != null && email.length() > 0 && !Objects.equals(donator.getEmail(), email)) {
            Optional<Donator> donatorOptional = donatorRepository.findDonatorByEmail(email);
            if (donatorOptional.isPresent()) {
                throw new InternalException("email taken");
            }
            donator.setEmail(email);
        }

        if (phone != null && phone.length() > 0 && !Objects.equals(donator.getPhone(), phone)) {
            Optional<Donator> donatorOptional = donatorRepository.findDonatorByPhone(phone);
            if (donatorOptional.isPresent()) {
                throw new InternalException("phone taken");
            }
            donator.setPhone(phone);
        }

        if (name != null && name.length() > 0 && !Objects.equals(donator.getName(), name)) {
            donator.setName(name);
        }

        if (level != null && level > 0 && !Objects.equals(donator.getLevel(), level)) {
            donator.setLevel(level);
        }
    }
}
