package com.vignesh.Mines_Equipment_Stoppage_Analysis.service;

import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import com.vignesh.Mines_Equipment_Stoppage_Analysis.model.Equipment;
import com.vignesh.Mines_Equipment_Stoppage_Analysis.repository.EquipmentRepository;

@Service
public class EquipmentService {

    private final EquipmentRepository repository;

    public EquipmentService(EquipmentRepository repository) {
        this.repository = repository;
    }

    public List<Equipment> getAllEquipment() {
        return repository.findAll();
    }

    public Optional<Equipment> getEquipmentById(Long id) {
        return repository.findById(id);
    }

    public Equipment saveEquipment(Equipment equipment) {
        return repository.save(equipment);
    }

    public void deleteEquipment(Long id) {
        repository.deleteById(id);
    }
}