package com.desk_sharing.model;

import java.util.ArrayList;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorkstationSearchFiltersDTO {
    private List<String> types = new ArrayList<>();
    private List<Integer> monitorCounts = new ArrayList<>();
    private List<Boolean> deskHeightAdjustable = new ArrayList<>();
    private List<String> technologySelections = new ArrayList<>();
    private List<Boolean> specialFeatures = new ArrayList<>();
}
