package com.vignesh.Mines_Equipment_Stoppage_Analysis.repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Repository;

import com.vignesh.Mines_Equipment_Stoppage_Analysis.model.Equipment;

@Repository
public class EquipmentRepository {

    private final List<Equipment> equipmentList = new ArrayList<>();

    public List<Equipment> findAll() {
        return equipmentList;
    }

    public Optional<Equipment> findById(Long id) {
        return equipmentList.stream()
                .filter(equipment -> equipment.getId().equals(id))
                .findFirst();
    }

    public Equipment save(Equipment equipment) {

        if (equipment.getId() == null) {
            long newId = equipmentList.stream()
                    .mapToLong(e -> e.getId() == null ? 0 : e.getId())
                    .max()
                    .orElse(0) + 1;

            equipment.setId(newId);
        }

        findById(equipment.getId()).ifPresent(equipmentList::remove);
        equipmentList.add(equipment);

        return equipment;
    }

    public void deleteById(Long id) {
        equipmentList.removeIf(equipment ->
                equipment.getId() != null && equipment.getId().equals(id));
    }
}