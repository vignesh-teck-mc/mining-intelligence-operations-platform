package com.vignesh.Mines_Equipment_Stoppage_Analysis.service;

import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import com.vignesh.Mines_Equipment_Stoppage_Analysis.model.StoppageData;
import com.vignesh.Mines_Equipment_Stoppage_Analysis.repository.StoppageRepository;

@Service
public class PythonAIService {

    private final RestTemplate restTemplate = new RestTemplate();

    private final MiningAnalyticsService analyticsService;

    private final StoppageRepository repository;

    private final String ollamaUrl =
            "http://localhost:11434/api/generate";

    public PythonAIService(
            MiningAnalyticsService analyticsService,
            StoppageRepository repository) {

        this.analyticsService = analyticsService;
        this.repository = repository;
    }

    public String askAI(String question) {

        String normalizedQuestion =
                question.trim().toUpperCase();

        List<StoppageData> allData =
                repository.findAll();

        /*
         * FIND EQUIPMENT
         */
        String detectedEquipmentId = null;

        for (StoppageData data : allData) {

            if (data.getEquipmentId() == null) {
                continue;
            }

            String id =
                    data.getEquipmentId()
                            .trim()
                            .toUpperCase();

            if (normalizedQuestion.contains(id)) {
                detectedEquipmentId = id;
                break;
            }
        }

        final String equipmentId =
                detectedEquipmentId;

        /*
         * FIND EXACT RECORD
         */
        String stoppageId = null;

        for (StoppageData data : allData) {

            if (data.getStoppageId() == null) {
                continue;
            }

            String id =
                    data.getStoppageId()
                            .trim()
                            .toUpperCase();

            if (normalizedQuestion.contains(id)) {
                stoppageId = id;
                break;
            }
        }

        /*
         * EXACT RECORD QUESTIONS
         */
        if (stoppageId != null) {

            for (StoppageData record : allData) {

                if (record.getStoppageId() == null) {
                    continue;
                }

                if (!record.getStoppageId()
                        .trim()
                        .equalsIgnoreCase(stoppageId)) {
                    continue;
                }

                StringBuilder result =
                        new StringBuilder();

                result.append("Verified data for ")
                        .append(stoppageId)
                        .append(":\n");

                result.append("Equipment ID: ")
                        .append(record.getEquipmentId())
                        .append("\n");

                result.append("Equipment Type: ")
                        .append(record.getEquipmentType())
                        .append("\n");

                result.append("Mine Location: ")
                        .append(record.getMineLocation())
                        .append("\n");

                result.append("Stoppage Date: ")
                        .append(record.getStoppageDate())
                        .append("\n");

                result.append("Start Time: ")
                        .append(record.getStartTime())
                        .append("\n");

                result.append("End Time: ")
                        .append(record.getEndTime())
                        .append("\n");

                result.append("Duration Minutes: ")
                        .append(record.getDurationMinutes())
                        .append("\n");

                result.append("Stoppage Reason: ")
                        .append(record.getStoppageReason())
                        .append("\n");

                result.append("Stoppage Category: ")
                        .append(record.getStoppageCategory())
                        .append("\n");

                result.append("Reported By: ")
                        .append(record.getReportedBy())
                        .append("\n");

                result.append("Remarks: ")
                        .append(record.getRemarks());

                return result.toString();
            }

            return "No verified record found for "
                    + stoppageId + ".";
        }

        /*
         * EQUIPMENT DATA
         */
        String equipmentData =
                "No matching equipment found.";

        List<StoppageData> matches =
                List.of();

        if (equipmentId != null) {

            matches =
                    allData.stream()
                            .filter(x ->
                                    x.getEquipmentId() != null)
                            .filter(x ->
                                    x.getEquipmentId()
                                            .trim()
                                            .equalsIgnoreCase(equipmentId))
                            .toList();

            if (!matches.isEmpty()) {

                int totalDowntime =
                        matches.stream()
                                .map(StoppageData::getDurationMinutes)
                                .filter(x -> x != null)
                                .mapToInt(Integer::intValue)
                                .sum();

                String equipmentType =
                        matches.stream()
                                .map(StoppageData::getEquipmentType)
                                .filter(x ->
                                        x != null &&
                                        !x.isBlank())
                                .findFirst()
                                .orElse("Not available");

                String location =
                        matches.stream()
                                .map(StoppageData::getMineLocation)
                                .filter(x ->
                                        x != null &&
                                        !x.isBlank())
                                .findFirst()
                                .orElse("Not available");

                String reasons =
                        matches.stream()
                                .filter(x ->
                                        x.getStoppageReason() != null)
                                .collect(Collectors.groupingBy(
                                        x -> x.getStoppageReason().trim(),
                                        Collectors.counting()))
                                .entrySet()
                                .stream()
                                .sorted(
                                        Map.Entry
                                                .<String, Long>
                                                comparingByValue()
                                                .reversed())
                                .map(e ->
                                        e.getKey() +
                                        " (" +
                                        e.getValue() +
                                        " occurrences)")
                                .collect(Collectors.joining(", "));

                StringBuilder records =
                        new StringBuilder();

                for (StoppageData record : matches) {

                    records.append("\n");

                    records.append("Stoppage_ID: ")
                            .append(record.getStoppageId())
                            .append("\n");

                    records.append("Equipment_ID: ")
                            .append(record.getEquipmentId())
                            .append("\n");

                    records.append("Equipment_Type: ")
                            .append(record.getEquipmentType())
                            .append("\n");

                    records.append("Mine_Location: ")
                            .append(record.getMineLocation())
                            .append("\n");

                    records.append("Stoppage_Date: ")
                            .append(record.getStoppageDate())
                            .append("\n");

                    records.append("Start_Time: ")
                            .append(record.getStartTime())
                            .append("\n");

                    records.append("End_Time: ")
                            .append(record.getEndTime())
                            .append("\n");

                    records.append("Duration_Minutes: ")
                            .append(record.getDurationMinutes())
                            .append("\n");

                    records.append("Stoppage_Category: ")
                            .append(record.getStoppageCategory())
                            .append("\n");

                    records.append("Stoppage_Reason: ")
                            .append(record.getStoppageReason())
                            .append("\n");

                    records.append("Reported_By: ")
                            .append(record.getReportedBy())
                            .append("\n");

                    records.append("Remarks: ")
                            .append(record.getRemarks())
                            .append("\n");
                }

                equipmentData =
                        "Equipment ID: " +
                        equipmentId +
                        "\nEquipment Type: " +
                        equipmentType +
                        "\nMine Location: " +
                        location +
                        "\nRecord Count: " +
                        matches.size() +
                        "\nTotal Downtime: " +
                        totalDowntime +
                        " minutes" +
                        "\nStoppage Reasons: " +
                        reasons +
                        "\n\nINDIVIDUAL STOPPAGE RECORDS:" +
                        records;
            }
        }

        /*
         * VERIFIED STOPPAGE CATEGORY ANALYTICS
         */
        String detectedCategory = null;

        for (StoppageData data : allData) {

            if (data.getStoppageCategory() == null) {
                continue;
            }

            String category =
                    data.getStoppageCategory().trim();

            if (category.isBlank()) {
                continue;
            }

            if (normalizedQuestion.contains(
                    category.toUpperCase())) {

                detectedCategory = category;
                break;
            }
        }

        if (detectedCategory != null) {

            final String category =
                    detectedCategory;

            List<StoppageData> categoryMatches =
                    allData.stream()
                            .filter(x ->
                                    x.getStoppageCategory() != null)
                            .filter(x ->
                                    x.getStoppageCategory()
                                            .trim()
                                            .equalsIgnoreCase(category))
                            .toList();

            if (!categoryMatches.isEmpty()) {

                int categoryCount =
                        categoryMatches.size();

                int categoryTotalDowntime =
                        categoryMatches.stream()
                                .map(StoppageData::getDurationMinutes)
                                .filter(x -> x != null)
                                .mapToInt(Integer::intValue)
                                .sum();

                double categoryAverageDowntime =
                        categoryMatches.stream()
                                .map(StoppageData::getDurationMinutes)
                                .filter(x -> x != null)
                                .mapToInt(Integer::intValue)
                                .average()
                                .orElse(0.0);

                /*
                 * RECORD COUNT BY LOCATION
                 */
                Map<String, Long> locationRecordCount =
                        categoryMatches.stream()
                                .filter(x ->
                                        x.getMineLocation() != null)
                                .filter(x ->
                                        !x.getMineLocation()
                                                .trim()
                                                .isBlank())
                                .collect(Collectors.groupingBy(
                                        x -> x.getMineLocation().trim(),
                                        Collectors.counting()));

                String recordsByLocation =
                        locationRecordCount.entrySet()
                                .stream()
                                .sorted(
                                        Map.Entry
                                                .<String, Long>
                                                comparingByValue()
                                                .reversed())
                                .map(e ->
                                        e.getKey() +
                                        ": " +
                                        e.getValue() +
                                        " records")
                                .collect(Collectors.joining("\n"));

                /*
                 * DOWNTIME BY LOCATION
                 */
                Map<String, Integer> locationDowntime =
                        categoryMatches.stream()
                                .filter(x ->
                                        x.getMineLocation() != null)
                                .filter(x ->
                                        x.getDurationMinutes() != null)
                                .collect(Collectors.groupingBy(
                                        x -> x.getMineLocation().trim(),
                                        Collectors.summingInt(
                                                StoppageData::getDurationMinutes)));

                String topLocations =
                        locationDowntime.entrySet()
                                .stream()
                                .sorted(
                                        Map.Entry
                                                .<String, Integer>
                                                comparingByValue()
                                                .reversed())
                                .map(e ->
                                        e.getKey() +
                                        ": " +
                                        e.getValue() +
                                        " minutes")
                                .collect(Collectors.joining("\n"));

                /*
                 * REASON COUNTS
                 */
                Map<String, Long> reasonCounts =
                        categoryMatches.stream()
                                .filter(x ->
                                        x.getStoppageReason() != null)
                                .filter(x ->
                                        !x.getStoppageReason()
                                                .trim()
                                                .isBlank())
                                .collect(Collectors.groupingBy(
                                        x -> x.getStoppageReason().trim(),
                                        Collectors.counting()));

                /*
                 * FIND REASON MENTIONED IN QUESTION
                 */
                String detectedReason = null;

                for (String reason : reasonCounts.keySet()) {

                    if (normalizedQuestion.contains(
                            reason.toUpperCase())) {

                        detectedReason = reason;
                        break;
                    }
                }

                /*
                 * REASON COUNT QUESTION
                 */
                boolean asksReasonCount =
                        detectedReason != null &&
                        (
                                normalizedQuestion.contains("HOW MANY") ||
                                normalizedQuestion.contains("NUMBER OF") ||
                                normalizedQuestion.contains("COUNT") ||
                                normalizedQuestion.contains("OCCURRENCES") ||
                                normalizedQuestion.contains("TIMES") ||
                                normalizedQuestion.contains("CAUSED BY") ||
                                normalizedQuestion.contains("DUE TO") ||
                                normalizedQuestion.contains("HAD")
                        );

                if (asksReasonCount) {

                    long count =
                            reasonCounts.get(detectedReason);

                    return "Verified " +
                            category +
                            " stoppage reason data:\n" +
                            detectedReason +
                            ": " +
                            count +
                            " occurrences";
                }

                /*
                 * MOST COMMON REASONS
                 */
                boolean asksMostCommonReason =
                        normalizedQuestion.contains("MOST COMMON") &&
                        (
                                normalizedQuestion.contains("REASON") ||
                                normalizedQuestion.contains("REASONS")
                        );

                if (asksMostCommonReason) {

                    long maximum =
                            reasonCounts.values()
                                    .stream()
                                    .mapToLong(Long::longValue)
                                    .max()
                                    .orElse(0);

                    String mostCommonReasons =
                            reasonCounts.entrySet()
                                    .stream()
                                    .filter(e ->
                                            e.getValue() == maximum)
                                    .sorted(
                                            Map.Entry
                                                    .<String, Long>
                                                    comparingByKey())
                                    .map(e ->
                                            e.getKey() +
                                            " (" +
                                            e.getValue() +
                                            " occurrences)")
                                    .collect(Collectors.joining("\n"));

                    return "Verified " +
                            category +
                            " stoppage reason data:\n" +
                            "Most common reason(s):\n" +
                            mostCommonReasons;
                }

                /*
                 * CATEGORY QUESTIONS
                 */
                boolean asksCount =
                        normalizedQuestion.contains("HOW MANY") ||
                        normalizedQuestion.contains("NUMBER OF") ||
                        normalizedQuestion.contains("COUNT");

                boolean asksTotal =
                        normalizedQuestion.contains("TOTAL DOWNTIME") ||
                        normalizedQuestion.contains("TOTAL DOWN TIME") ||
                        normalizedQuestion.contains("DOWNTIME") ||
                        normalizedQuestion.contains("DOWN TIME") ||
                        normalizedQuestion.contains("SUM");

                boolean asksAverage =
                        normalizedQuestion.contains("AVERAGE") ||
                        normalizedQuestion.contains("AVG");

                boolean asksLocation =
                        normalizedQuestion.contains("LOCATION") ||
                        normalizedQuestion.contains("LOCATIONS") ||
                        normalizedQuestion.contains("TOP LOCATIONS");

                /*
                 * DIRECT VERIFIED CATEGORY ANSWER
                 */
                if (asksCount ||
                        asksTotal ||
                        asksAverage ||
                        asksLocation) {

                    StringBuilder result =
                            new StringBuilder();

                    result.append("Verified ")
                            .append(category)
                            .append(" category data:\n");

                    /*
                     * OVERALL RECORD COUNT
                     */
                    if (asksCount) {

                        result.append("Record count: ")
                                .append(categoryCount)
                                .append("\n");
                    }

                    /*
                     * RECORD COUNT BY LOCATION
                     */
                    boolean asksRecordCountByLocation =
                            asksCount &&
                            (
                                    normalizedQuestion.contains("EACH LOCATION") ||
                                    normalizedQuestion.contains("BY LOCATION") ||
                                    normalizedQuestion.contains("PER LOCATION") ||
                                    normalizedQuestion.contains("AT EACH")
                            );

                    if (asksRecordCountByLocation) {

                        result.append("Record count by location:\n")
                                .append(recordsByLocation)
                                .append("\n");
                    }

                    /*
                     * TOTAL DOWNTIME
                     */
                    if (asksTotal) {

                        result.append("Total downtime: ")
                                .append(categoryTotalDowntime)
                                .append(" minutes\n");
                    }

                    /*
                     * AVERAGE DOWNTIME
                     */
                    if (asksAverage) {

                        result.append("Average downtime: ")
                                .append(
                                        String.format(
                                                "%.2f",
                                                categoryAverageDowntime))
                                .append(" minutes\n");
                    }

                    /*
                     * DOWNTIME BY LOCATION
                     */
                    if (asksLocation) {

                        result.append("Downtime by location:\n")
                                .append(topLocations)
                                .append("\n");
                    }

                    return result.toString().trim();
                }
            }
        }

        /*
         * EXACT TOTAL CALCULATION
         */
        boolean asksOnlyForTotalDowntime =
                (
                        normalizedQuestion.contains("TOTAL DOWNTIME") ||
                        normalizedQuestion.contains("TOTAL DOWN TIME") ||
                        normalizedQuestion.contains("SUM OF DURATION") ||
                        normalizedQuestion.contains("SUM THE DURATION") ||
                        normalizedQuestion.contains("CALCULATE THE TOTAL")
                )
                &&
                !normalizedQuestion.contains("TYPE")
                &&
                !normalizedQuestion.contains("LOCATION")
                &&
                !normalizedQuestion.contains("REASON")
                &&
                !normalizedQuestion.contains("DATE")
                &&
                !normalizedQuestion.contains("TIME")
                &&
                !normalizedQuestion.contains("RECORD");

        if (asksOnlyForTotalDowntime &&
                !matches.isEmpty()) {

            int totalDowntime =
                    matches.stream()
                            .map(StoppageData::getDurationMinutes)
                            .filter(x -> x != null)
                            .mapToInt(Integer::intValue)
                            .sum();

            return "Verified calculation for " +
                    equipmentId +
                    ":\n" +
                    "Record count: " +
                    matches.size() +
                    "\n" +
                    "Total downtime: " +
                    totalDowntime +
                    " minutes.";
        }

        /*
         * OVERALL ANALYTICS
         */
        String analytics =
                analyticsService.getSummary();

        /*
         * OLLAMA PROMPT
         */
        String prompt =
                "You are a mining equipment data analyst.\n\n" +

                "IMPORTANT RULES:\n" +

                "1. Answer ONLY from the VERIFIED DATA.\n" +

                "2. Never invent or guess values.\n" +

                "3. Never change any ID, date, duration, count, " +
                "location, reason, or equipment type.\n" +

                "4. For equipment questions, use VERIFIED EQUIPMENT DATA.\n" +

                "5. For record questions, use the INDIVIDUAL STOPPAGE RECORDS.\n" +

                "6. If the requested field exists in the verified data, " +
                "return that field.\n" +

                "7. If multiple things are requested, answer ALL of them.\n" +

                "8. Do not omit a requested field.\n" +

                "9. Do not perform arithmetic yourself when a verified " +
                "calculated value is already provided.\n" +

                "10. If the requested information truly does not exist, " +
                "say it is not available.\n" +

                "11. Give a short, professional answer.\n\n" +

                "VERIFIED EQUIPMENT DATA:\n" +
                equipmentData +

                "\n\nVERIFIED OVERALL ANALYTICS:\n" +
                analytics +

                "\n\nUSER QUESTION:\n" +
                question;

        Map<String, Object> request =
                Map.of(
                        "model",
                        "llama3.2:3b",

                        "prompt",
                        prompt,

                        "stream",
                        false
                );

        Map<?, ?> response =
                restTemplate.postForObject(
                        ollamaUrl,
                        request,
                        Map.class
                );

        if (response == null ||
                response.get("response") == null) {

            return "No response received from Ollama.";
        }

        return response
                .get("response")
                .toString();
    }
}       