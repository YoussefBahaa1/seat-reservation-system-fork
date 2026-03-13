package com.desk_sharing.model;

import lombok.Data;

@Data
public class DeskDTO {

	private Long roomId;
	private String remark;
	private Long deskId;
	private Boolean fixed;
	private String workstationType;
	private Integer monitorsQuantity;
	private Boolean deskHeightAdjustable;
	private Boolean technologyDockingStation;
	private Boolean technologyWebcam;
	private Boolean technologyHeadset;
	private String specialFeatures;
}
