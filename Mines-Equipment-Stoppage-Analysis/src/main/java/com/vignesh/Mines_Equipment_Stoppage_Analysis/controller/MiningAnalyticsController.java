package com.vignesh.Mines_Equipment_Stoppage_Analysis.controller;

import com.vignesh.Mines_Equipment_Stoppage_Analysis.service.MiningAnalyticsService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/analytics")
@CrossOrigin(origins = "http://localhost:5173")
public class MiningAnalyticsController {

    private final MiningAnalyticsService analyticsService;

    public MiningAnalyticsController(MiningAnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping("/summary")
    public String getSummary() {
        return analyticsService.getSummary();
    }
}       