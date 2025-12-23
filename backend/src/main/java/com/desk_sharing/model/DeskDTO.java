package com.desk_sharing.model;

import lombok.Data;

@Data
public class DeskDTO {

	private Long roomId;
	private String equipment;
	private String remark;
	private Long deskId;
}
