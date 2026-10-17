package com.vignesh.Mines_Equipment_Stoppage_Analysis.controller;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.vignesh.Mines_Equipment_Stoppage_Analysis.model.AIQuestionRequest;
import com.vignesh.Mines_Equipment_Stoppage_Analysis.service.PythonAIService;

@RestController
@RequestMapping("/api/ai")
@CrossOrigin(origins = "http://localhost:5173")
public class AIController {

    private final PythonAIService pythonAIService;

    public AIController(PythonAIService pythonAIService) {
        this.pythonAIService = pythonAIService;
    }

    @PostMapping("/ask")
    public String askAI(@RequestBody AIQuestionRequest request) {
        return pythonAIService.askAI(request.getQuestion());
    }
}