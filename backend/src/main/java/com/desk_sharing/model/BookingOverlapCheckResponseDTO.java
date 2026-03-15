package com.desk_sharing.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BookingOverlapCheckResponseDTO {
    private boolean hasOverlap;
}
