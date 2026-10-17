package com.vignesh.Mines_Equipment_Stoppage_Analysis.controller;

import com.vignesh.Mines_Equipment_Stoppage_Analysis.model.StoppageData;
import com.vignesh.Mines_Equipment_Stoppage_Analysis.service.StoppageService;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/analysis")
@CrossOrigin(origins = "http://localhost:5173")
public class AnalysisController {

    private final StoppageService stoppageService;

    public AnalysisController(StoppageService stoppageService) {
        this.stoppageService = stoppageService;
    }

    // 1. Overall summary
    @GetMapping("/summary")
    public Map<String, Object> getSummary() {

        List<StoppageData> stoppages = stoppageService.getAllStoppages();

        int totalDowntime = stoppages.stream()
                .mapToInt(StoppageData::getDurationMinutes)
                .sum();

        double averageDowntime = stoppages.isEmpty()
                ? 0
                : (double) totalDowntime / stoppages.size();

        Map<String, Object> summary = new LinkedHashMap<>();

        summary.put("totalStoppages", stoppages.size());
        summary.put("totalDowntimeMinutes", totalDowntime);
        summary.put("averageDowntimeMinutes", averageDowntime);

        return summary;
    }

    // 2. Downtime by equipment
    @GetMapping("/equipment-downtime")
    public Map<String, Integer> getEquipmentDowntime() {

        return stoppageService.getAllStoppages()
                .stream()
                .collect(Collectors.groupingBy(
                        StoppageData::getEquipmentId,
                        Collectors.summingInt(StoppageData::getDurationMinutes)
                ))
                .entrySet()
                .stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        Map.Entry::getValue,
                        (a, b) -> a,
                        LinkedHashMap::new
                ));
    }

    // 3. Stoppage reasons
    @GetMapping("/reasons")
    public Map<String, Long> getStoppageReasons() {

        return stoppageService.getAllStoppages()
                .stream()
                .collect(Collectors.groupingBy(
                        StoppageData::getStoppageReason,
                        Collectors.counting()
                ))
                .entrySet()
                .stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        Map.Entry::getValue,
                        (a, b) -> a,
                        LinkedHashMap::new
                ));
    }

    // 4. Stoppage categories
    @GetMapping("/categories")
    public Map<String, Long> getStoppageCategories() {

        return stoppageService.getAllStoppages()
                .stream()
                .collect(Collectors.groupingBy(
                        StoppageData::getStoppageCategory,
                        Collectors.counting()
                ))
                .entrySet()
                .stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        Map.Entry::getValue,
                        (a, b) -> a,
                        LinkedHashMap::new
                ));
    }

    // 5. Downtime by equipment type
    @GetMapping("/equipment-types")
    public Map<String, Integer> getEquipmentTypes() {

        return stoppageService.getAllStoppages()
                .stream()
                .collect(Collectors.groupingBy(
                        StoppageData::getEquipmentType,
                        Collectors.summingInt(StoppageData::getDurationMinutes)
                ))
                .entrySet()
                .stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        Map.Entry::getValue,
                        (a, b) -> a,
                        LinkedHashMap::new
                ));
    }

    // 6. Downtime by mine location
    @GetMapping("/locations")
    public Map<String, Integer> getLocations() {

        return stoppageService.getAllStoppages()
                .stream()
                .collect(Collectors.groupingBy(
                        StoppageData::getMineLocation,
                        Collectors.summingInt(StoppageData::getDurationMinutes)
                ))
                .entrySet()
                .stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        Map.Entry::getValue,
                        (a, b) -> a,
                        LinkedHashMap::new
                ));
    }

    // 7. Top 10 equipment by downtime
    @GetMapping("/top-equipment")
    public Map<String, Integer> getTopEquipment() {

        return getEquipmentDowntime()
                .entrySet()
                .stream()
                .limit(10)
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        Map.Entry::getValue,
                        (a, b) -> a,
                        LinkedHashMap::new
                ));
    }

    // 8. Top 10 stoppage reasons
    @GetMapping("/top-reasons")
    public Map<String, Long> getTopReasons() {

        return getStoppageReasons()
                .entrySet()
                .stream()
                .limit(10)
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        Map.Entry::getValue,
                        (a, b) -> a,
                        LinkedHashMap::new
                ));
    }
}