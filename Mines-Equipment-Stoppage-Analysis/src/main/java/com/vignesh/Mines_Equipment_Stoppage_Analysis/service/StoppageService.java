package com.vignesh.Mines_Equipment_Stoppage_Analysis.service;

import java.util.List;
import org.springframework.stereotype.Service;
import com.vignesh.Mines_Equipment_Stoppage_Analysis.model.StoppageData;
import com.vignesh.Mines_Equipment_Stoppage_Analysis.repository.StoppageRepository;

@Service
public class StoppageService {

    private final StoppageRepository repository;

    public StoppageService(StoppageRepository repository) {
        this.repository = repository;
    }

    public List<StoppageData> getAllStoppages() {
        return repository.findAll();
    }

    public StoppageData getStoppageById(String id) {
        return repository.findById(id).orElse(null);
    }

    public StoppageData saveStoppage(StoppageData stoppage) {
        return repository.save(stoppage);
    }

    public void deleteStoppage(String id) {
        repository.deleteById(id);
    }
}