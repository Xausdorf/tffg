package com.sunrise.tffg.services;

import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Service;

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

    public void addDonator(Donator donator) {
        Optional<Donator> donatorOptional = donatorRepository.findDonatorByEmailOrPhone(donator.getEmail(),
                donator.getPhone());
        if (donatorOptional.isPresent()) {
            throw new IllegalStateException("email or phone taken");
        }

        donatorRepository.save(donator);
    }

    public void deleteDonator(UUID donatorId) {
        boolean exists = donatorRepository.existsById(donatorId);
        if (!exists) {
            throw new IllegalStateException("donator with id " + donatorId + " does not exist");
        }

        donatorRepository.deleteById(donatorId);
    }

    @Transactional
    public void updateDonator(UUID donatorId, String email, String phone, String name, Long sum) {
        Donator donator = donatorRepository.findById(donatorId)
                .orElseThrow(() -> new IllegalStateException("donator with id " + donatorId + " does not exist"));

        if (email != null && email.length() > 0 && !Objects.equals(donator.getEmail(), email)) {
            Optional<Donator> donatorOptional = donatorRepository.findDonatorByEmail(email);
            if (donatorOptional.isPresent()) {
                throw new IllegalStateException("email taken");
            }
            donator.setEmail(email);
        }

        if (phone != null && phone.length() > 0 && !Objects.equals(donator.getPhone(), phone)) {
            Optional<Donator> donatorOptional = donatorRepository.findDonatorByPhone(phone);
            if (donatorOptional.isPresent()) {
                throw new IllegalStateException("phone taken");
            }
            donator.setPhone(phone);
        }

        if (name != null && name.length() > 0 && !Objects.equals(donator.getName(), name)) {
            donator.setName(name);
        }

        if (sum != null && sum > 0L && !Objects.equals(donator.getSum(), sum)) {
            donator.setSum(sum);
        }
    }
}
