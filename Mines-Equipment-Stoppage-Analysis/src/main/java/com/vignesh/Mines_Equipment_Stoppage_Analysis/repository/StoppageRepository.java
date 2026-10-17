package com.vignesh.Mines_Equipment_Stoppage_Analysis.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.vignesh.Mines_Equipment_Stoppage_Analysis.model.StoppageData;

@Repository
public interface StoppageRepository extends JpaRepository<StoppageData, String> {
}
