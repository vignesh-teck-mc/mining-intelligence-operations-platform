package com.vignesh.Mines_Equipment_Stoppage_Analysis.service;

import java.io.InputStream;
import java.util.Iterator;

import org.apache.poi.ss.usermodel.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.vignesh.Mines_Equipment_Stoppage_Analysis.model.StoppageData;
import com.vignesh.Mines_Equipment_Stoppage_Analysis.repository.StoppageRepository;

@Service
public class ExcelReaderService {

    private final StoppageRepository repository;

    public ExcelReaderService(StoppageRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public String readExcelFile(MultipartFile file) throws Exception {

        int added = 0;
        int skipped = 0;

        try (InputStream inputStream = file.getInputStream();
             Workbook workbook = WorkbookFactory.create(inputStream)) {

            Sheet sheet = workbook.getSheetAt(0);
            Iterator<Row> rows = sheet.iterator();
            DataFormatter formatter = new DataFormatter();

            // Skip the header row.
            if (rows.hasNext()) {
                rows.next();
            }

            while (rows.hasNext()) {

                Row row = rows.next();

                String id = getString(row.getCell(0), formatter);

                if (id.isBlank()) {
                    continue;
                }

                // Never overwrite an existing stoppage.
                if (repository.existsById(id)) {
                    skipped++;
                    continue;
                }

                StoppageData data = new StoppageData();

                data.setStoppageId(id);
                data.setEquipmentId(getString(row.getCell(1), formatter));
                data.setEquipmentType(getString(row.getCell(2), formatter));
                data.setMineLocation(getString(row.getCell(3), formatter));

                if (row.getCell(4) == null ||
                    row.getCell(5) == null ||
                    row.getCell(6) == null ||
                    row.getCell(7) == null) {
                    throw new IllegalArgumentException(
                        "Missing date, time, or duration for stoppage ID: " + id
                    );
                }

                data.setStoppageDate(
                    row.getCell(4).getLocalDateTimeCellValue().toLocalDate()
                );

                data.setStartTime(
                    row.getCell(5).getLocalDateTimeCellValue().toLocalTime()
                );

                data.setEndTime(
                    row.getCell(6).getLocalDateTimeCellValue().toLocalTime()
                );

                data.setDurationMinutes(
                    (int) row.getCell(7).getNumericCellValue()
                );

                data.setStoppageCategory(getString(row.getCell(8), formatter));
                data.setStoppageReason(getString(row.getCell(9), formatter));
                data.setReportedBy(getString(row.getCell(10), formatter));
                data.setRemarks(getString(row.getCell(11), formatter));

                repository.save(data);
                added++;
            }
        }

        long total = repository.count();

        return "Upload completed successfully! " +
               "New records added: " + added +
               ", duplicate records skipped: " + skipped +
               ", total records in database: " + total;
    }

    private String getString(Cell cell, DataFormatter formatter) {
        if (cell == null) {
            return "";
        }

        return formatter.formatCellValue(cell).trim();
    }
}