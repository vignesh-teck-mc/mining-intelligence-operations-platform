package com.vignesh.Mines_Equipment_Stoppage_Analysis.controller;

import com.vignesh.Mines_Equipment_Stoppage_Analysis.model.Equipment;
import com.vignesh.Mines_Equipment_Stoppage_Analysis.model.StoppageData;
import com.vignesh.Mines_Equipment_Stoppage_Analysis.service.EquipmentService;
import com.vignesh.Mines_Equipment_Stoppage_Analysis.service.StoppageService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/equipment")
@CrossOrigin(origins = "http://localhost:5173")
public class EquipmentController {

    private final EquipmentService equipmentService;       
    private final StoppageService stoppageService;      

    public EquipmentController(
            EquipmentService equipmentService,
            StoppageService stoppageService) {

        this.equipmentService = equipmentService;
        this.stoppageService = stoppageService;
    }

    // Get all equipment
    @GetMapping
    public List<Equipment> getAllEquipment() {
        return equipmentService.getAllEquipment();
    }

    // Get equipment by ID
    @GetMapping("/{id}")
    public ResponseEntity<Equipment> getEquipmentById(
            @PathVariable Long id) {

        return equipmentService.getEquipmentById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // Create equipment
    @PostMapping
    public Equipment createEquipment(
            @RequestBody Equipment equipment) {

        return equipmentService.saveEquipment(equipment);
    }

    // Update equipment
    @PutMapping("/{id}")
    public ResponseEntity<Equipment> updateEquipment(
            @PathVariable Long id,
            @RequestBody Equipment equipment) {

        return equipmentService.getEquipmentById(id)
                .map(existingEquipment -> {

                    equipment.setId(id);

                    return ResponseEntity.ok(
                            equipmentService.saveEquipment(equipment)
                    );
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // Delete equipment
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEquipment(
            @PathVariable Long id) {

        if (equipmentService.getEquipmentById(id).isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        equipmentService.deleteEquipment(id);

        return ResponseEntity.noContent().build();
    }

    // Equipment analytics
    @GetMapping("/analytics")
    public List<Map<String, Object>> getEquipmentAnalytics() {

        List<Equipment> equipmentList =
                equipmentService.getAllEquipment();

        List<StoppageData> stoppages =
                stoppageService.getAllStoppages();

        List<Map<String, Object>> result = new ArrayList<>();

        for (Equipment equipment : equipmentList) {

            int stoppageCount = 0;
            int totalDowntime = 0;

            for (StoppageData stoppage : stoppages) {

                if (equipment.getName()
                        .equalsIgnoreCase(stoppage.getEquipmentId())) {

                    stoppageCount++;

                    if (stoppage.getDurationMinutes() != null) {
                        totalDowntime +=
                                stoppage.getDurationMinutes();
                    }
                }
            }

            Map<String, Object> data =
                    new LinkedHashMap<>();

            data.put("id", equipment.getId());
            data.put("name", equipment.getName());
            data.put("type", equipment.getType());
            data.put("status", equipment.getStatus());
            data.put("location", equipment.getLocation());
            data.put("stoppageCount", stoppageCount);
            data.put("totalDowntimeMinutes", totalDowntime);

            result.add(data);
        }

        result.sort(
                Comparator.comparing(
                        item -> (Integer)
                                item.get("totalDowntimeMinutes"),
                        Comparator.reverseOrder()
                )
        );

        return result;
    }
}   