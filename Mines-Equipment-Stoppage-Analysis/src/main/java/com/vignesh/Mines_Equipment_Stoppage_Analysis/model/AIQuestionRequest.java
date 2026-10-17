package com.vignesh.Mines_Equipment_Stoppage_Analysis.model;

public class AIQuestionRequest {

    private String question;

    public AIQuestionRequest() {
    }

    public AIQuestionRequest(String question) {
        this.question = question;
    }

    public String getQuestion() {
        return question;
    }

    public void setQuestion(String question) {
        this.question = question;
    }
}