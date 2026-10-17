package com.vignesh.Mines_Equipment_Stoppage_Analysis.model;

import java.time.LocalDate;
import java.time.LocalTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "stoppages")
public class StoppageData {

    @Id
    @Column(name = "stoppage_id", nullable = false, length = 20)
    private String stoppageId;

    @Column(name = "equipment_id", nullable = false, length = 20)
    private String equipmentId;

    @Column(name = "equipment_type", nullable = false, length = 50)
    private String equipmentType;

    @Column(name = "mine_location", nullable = false, length = 100)
    private String mineLocation;

    @Column(name = "stoppage_date", nullable = false)
    private LocalDate stoppageDate;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    @Column(name = "duration_minutes", nullable = false)
    private Integer durationMinutes;

    @Column(name = "stoppage_category", nullable = false, length = 50)
    private String stoppageCategory;

    @Column(name = "stoppage_reason", nullable = false, length = 255)
    private String stoppageReason;

    @Column(name = "reported_by", nullable = false, length = 50)
    private String reportedBy;

    @Column(name = "remarks", length = 500)
    private String remarks;

    public StoppageData() {
    }

    public String getStoppageId() {
        return stoppageId;
    }

    public void setStoppageId(String stoppageId) {
        this.stoppageId = stoppageId;
    }

    public String getEquipmentId() {
        return equipmentId;
    }

    public void setEquipmentId(String equipmentId) {
        this.equipmentId = equipmentId;
    }

    public String getEquipmentType() {
        return equipmentType;
    }

    public void setEquipmentType(String equipmentType) {
        this.equipmentType = equipmentType;
    }

    public String getMineLocation() {
        return mineLocation;
    }

    public void setMineLocation(String mineLocation) {
        this.mineLocation = mineLocation;
    }

    public LocalDate getStoppageDate() {
        return stoppageDate;
    }

    public void setStoppageDate(LocalDate stoppageDate) {
        this.stoppageDate = stoppageDate;
    }

    public LocalTime getStartTime() {
        return startTime;
    }

    public void setStartTime(LocalTime startTime) {
        this.startTime = startTime;
    }

    public LocalTime getEndTime() {
        return endTime;
    }

    public void setEndTime(LocalTime endTime) {
        this.endTime = endTime;
    }

    public Integer getDurationMinutes() {
        return durationMinutes;
    }

    public void setDurationMinutes(Integer durationMinutes) {
        this.durationMinutes = durationMinutes;
    }

    public String getStoppageCategory() {
        return stoppageCategory;
    }

    public void setStoppageCategory(String stoppageCategory) {
        this.stoppageCategory = stoppageCategory;
    }

    public String getStoppageReason() {
        return stoppageReason;
    }

    public void setStoppageReason(String stoppageReason) {
        this.stoppageReason = stoppageReason;
    }

    public String getReportedBy() {
        return reportedBy;
    }

    public void setReportedBy(String reportedBy) {
        this.reportedBy = reportedBy;
    }

    public String getRemarks() {
        return remarks;
    }

    public void setRemarks(String remarks) {
        this.remarks = remarks;
    }
}