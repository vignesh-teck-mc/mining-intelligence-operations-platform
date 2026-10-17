package com.vignesh.Mines_Equipment_Stoppage_Analysis.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.vignesh.Mines_Equipment_Stoppage_Analysis.service.ExcelReaderService;

@RestController
@RequestMapping("/api/upload")
@CrossOrigin(origins = "http://localhost:5173")
public class XlsxUploadController {

    private final ExcelReaderService excelReaderService;

    public XlsxUploadController(ExcelReaderService excelReaderService) {
        this.excelReaderService = excelReaderService;
    }

    @PostMapping("/xlsx")
    public ResponseEntity<String> uploadXlsx(
            @RequestParam("file") MultipartFile file) {

        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body("Please select a non-empty Excel file.");
        }

        try {
            String result = excelReaderService.readExcelFile(file);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body("Excel upload failed: " + e.getMessage());
        }
    }
}