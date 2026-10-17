package com.vignesh.Mines_Equipment_Stoppage_Analysis.service;

import com.vignesh.Mines_Equipment_Stoppage_Analysis.model.StoppageData;
import com.vignesh.Mines_Equipment_Stoppage_Analysis.repository.StoppageRepository;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class MiningAnalyticsService {

    private final StoppageRepository repository;

    public MiningAnalyticsService(StoppageRepository repository) {
        this.repository = repository;
    }

    public String getSummary() {

        List<StoppageData> data = repository.findAll();

        if (data.isEmpty()) {
            return "No mining records are loaded.";
        }

        int totalDowntime = data.stream()
                .mapToInt(StoppageData::getDurationMinutes)
                .sum();

        double averageDowntime = data.stream()
                .mapToInt(StoppageData::getDurationMinutes)
                .average()
                .orElse(0);

        Map<String, Integer> equipmentDowntime =
                data.stream()
                        .collect(Collectors.groupingBy(
                                StoppageData::getEquipmentId,
                                Collectors.summingInt(
                                        StoppageData::getDurationMinutes)));

        Map<String, Long> reasonCount =
                data.stream()
                        .collect(Collectors.groupingBy(
                                StoppageData::getStoppageReason,
                                Collectors.counting()));

        Map<String, Integer> locationDowntime =
                data.stream()
                        .collect(Collectors.groupingBy(
                                StoppageData::getMineLocation,
                                Collectors.summingInt(
                                        StoppageData::getDurationMinutes)));

        Map<String, Integer> categoryDowntime =
                data.stream()
                        .collect(Collectors.groupingBy(
                                StoppageData::getStoppageCategory,
                                Collectors.summingInt(
                                        StoppageData::getDurationMinutes)));

        String topEquipment = equipmentDowntime.entrySet()
                .stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .limit(5)
                .map(e -> e.getKey() + " (" + e.getValue() + " min)")
                .collect(Collectors.joining(", "));

        String topReasons = reasonCount.entrySet()
                .stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(5)
                .map(e -> e.getKey() + " (" + e.getValue() + " occurrences)")
                .collect(Collectors.joining(", "));

        String topLocations = locationDowntime.entrySet()
                .stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .limit(5)
                .map(e -> e.getKey() + " (" + e.getValue() + " min)")
                .collect(Collectors.joining(", "));

        String categories = categoryDowntime.entrySet()
                .stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .map(e -> e.getKey() + " (" + e.getValue() + " min)")
                .collect(Collectors.joining(", "));

        return String.format(
                """
                VERIFIED MINING DATA ANALYTICS

                Total records: %d
                Total downtime: %d minutes
                Average downtime: %.2f minutes

                Top 5 equipment by downtime:
                %s

                Top 5 stoppage reasons:
                %s

                Top locations by downtime:
                %s

                Downtime by category:
                %s
                """,
                data.size(),
                totalDowntime,
                averageDowntime,
                topEquipment,
                topReasons,
                topLocations,
                categories
        );
    }
}