-- Defect management tables and desk blocking columns
-- Run after the base schema is in place.

CREATE TABLE IF NOT EXISTS `defects` (
  `defect_id` bigint(20) NOT NULL AUTO_INCREMENT,
  `ticket_number` varchar(20) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'NEW',
  `category` varchar(30) NOT NULL,
  `urgency` varchar(20) NOT NULL,
  `description` text NOT NULL,
  `reported_at` datetime NOT NULL,
  `reporter_id` int(11) NOT NULL,
  `desk_id` bigint(20) NOT NULL,
  `room_id` bigint(20) NOT NULL,
  `assigned_to_id` int(11) DEFAULT NULL,
  `assigned_at` datetime DEFAULT NULL,
  PRIMARY KEY (`defect_id`),
  UNIQUE KEY `uk_ticket_number` (`ticket_number`),
  KEY `fk_defect_reporter` (`reporter_id`),
  KEY `fk_defect_desk` (`desk_id`),
  KEY `fk_defect_room` (`room_id`),
  KEY `fk_defect_assigned` (`assigned_to_id`),
  CONSTRAINT `fk_defect_reporter` FOREIGN KEY (`reporter_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_defect_desk` FOREIGN KEY (`desk_id`) REFERENCES `desks` (`desk_id`),
  CONSTRAINT `fk_defect_room` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`room_id`),
  CONSTRAINT `fk_defect_assigned` FOREIGN KEY (`assigned_to_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `defect_internal_notes` (
  `note_id` bigint(20) NOT NULL AUTO_INCREMENT,
  `defect_id` bigint(20) NOT NULL,
  `author_id` int(11) NOT NULL,
  `content` text NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`note_id`),
  KEY `fk_note_defect` (`defect_id`),
  KEY `fk_note_author` (`author_id`),
  CONSTRAINT `fk_note_defect` FOREIGN KEY (`defect_id`) REFERENCES `defects` (`defect_id`),
  CONSTRAINT `fk_note_author` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Desk blocking columns
ALTER TABLE `desks` ADD COLUMN IF NOT EXISTS `is_blocked` tinyint(1) NOT NULL DEFAULT 0;
ALTER TABLE `desks` ADD COLUMN IF NOT EXISTS `blocked_reason_category` varchar(30) DEFAULT NULL;
ALTER TABLE `desks` ADD COLUMN IF NOT EXISTS `blocked_estimated_end_date` date DEFAULT NULL;
ALTER TABLE `desks` ADD COLUMN IF NOT EXISTS `blocked_by_defect_id` bigint(20) DEFAULT NULL;
