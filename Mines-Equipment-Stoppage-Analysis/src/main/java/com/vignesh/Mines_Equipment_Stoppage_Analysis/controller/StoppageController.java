package com.vignesh.Mines_Equipment_Stoppage_Analysis.controller;

import java.util.List;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.vignesh.Mines_Equipment_Stoppage_Analysis.model.StoppageData;
import com.vignesh.Mines_Equipment_Stoppage_Analysis.service.StoppageService;

@RestController
@RequestMapping("/api/stoppages")
@CrossOrigin
public class StoppageController {

    private final StoppageService service;

    public StoppageController(StoppageService service) {
        this.service = service;
    }

    @GetMapping
    public List<StoppageData> getAllStoppages() {
        return service.getAllStoppages();
    }

    @GetMapping("/{id}")
    public StoppageData getStoppageById(@PathVariable String id) {
        return service.getStoppageById(id);
    }

    @PostMapping
    public StoppageData saveStoppage(@RequestBody StoppageData stoppage) {
        return service.saveStoppage(stoppage);
    }

    @DeleteMapping("/{id}")
    public void deleteStoppage(@PathVariable String id) {
        service.deleteStoppage(id);
    }
}