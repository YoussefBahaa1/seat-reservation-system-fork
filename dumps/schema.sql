/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19-12.1.2-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: localhost    Database: mydatabase
-- ------------------------------------------------------
-- Server version	12.1.2-MariaDB-ubu2404

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*M!100616 SET @OLD_NOTE_VERBOSITY=@@NOTE_VERBOSITY, NOTE_VERBOSITY=0 */;

--
-- Current Database: `mydatabase`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `mydatabase` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci */;

USE `mydatabase`;

--
-- Table structure for table `bookings`
--

DROP TABLE IF EXISTS `bookings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `bookings` (
  `booking_id` bigint(20) NOT NULL AUTO_INCREMENT,
  `begin` time NOT NULL,
  `booking_in_progress` bit(1) NOT NULL,
  `day` date NOT NULL,
  `end` time NOT NULL,
  `lock_expiry_time` datetime DEFAULT NULL,
  `desk_id` bigint(20) NOT NULL,
  `room_id` bigint(20) NOT NULL,
  `user_id` int(11) NOT NULL,
  `series_id` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`booking_id`),
  KEY `FKaoxaafgq2jdhblkwiutyggant` (`desk_id`),
  KEY `FKrgoycol97o21kpjodw1qox4nc` (`room_id`),
  KEY `FKeyog2oic85xg7hsu2je2lx3s6` (`user_id`),
  KEY `FKq74u26a7ba9855a1mbesjyrq2` (`series_id`),
  CONSTRAINT `FKaoxaafgq2jdhblkwiutyggant` FOREIGN KEY (`desk_id`) REFERENCES `desks` (`desk_id`),
  CONSTRAINT `FKeyog2oic85xg7hsu2je2lx3s6` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `FKq74u26a7ba9855a1mbesjyrq2` FOREIGN KEY (`series_id`) REFERENCES `series` (`series_id`),
  CONSTRAINT `FKrgoycol97o21kpjodw1qox4nc` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`room_id`)
) ENGINE=InnoDB AUTO_INCREMENT=29240 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `buildings`
--

DROP TABLE IF EXISTS `buildings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `buildings` (
  `building_id` bigint(20) NOT NULL AUTO_INCREMENT,
  `address` varchar(255) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `ordering` int(11) NOT NULL,
  `remark` varchar(255) DEFAULT NULL,
  `town` varchar(255) NOT NULL,
  `used` bit(1) NOT NULL,
  PRIMARY KEY (`building_id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `desks`
--

DROP TABLE IF EXISTS `desks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `desks` (
  `desk_id` bigint(20) NOT NULL AUTO_INCREMENT,
  `room_id` bigint(20) NOT NULL,
  `remark` varchar(255) DEFAULT NULL,
  `desk_number_in_room` bigint(20) DEFAULT NULL,
  `equipment_id` bigint(20) NOT NULL,
  PRIMARY KEY (`desk_id`),
  KEY `FK1glnwylpo1qx4k8ckyg6sd65y` (`room_id`),
  KEY `FKnj02jj3tcyb5e604r1ufb7gfi` (`equipment_id`),
  CONSTRAINT `FK1glnwylpo1qx4k8ckyg6sd65y` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`room_id`),
  CONSTRAINT `FKnj02jj3tcyb5e604r1ufb7gfi` FOREIGN KEY (`equipment_id`) REFERENCES `equipments` (`equipment_id`)
) ENGINE=InnoDB AUTO_INCREMENT=555 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `equipments`
--

DROP TABLE IF EXISTS `equipments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `equipments` (
  `equipment_id` bigint(20) NOT NULL AUTO_INCREMENT,
  `equipment_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`equipment_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `floors`
--

DROP TABLE IF EXISTS `floors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `floors` (
  `floor_id` bigint(20) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `name_of_img` varchar(255) DEFAULT NULL,
  `ordering` int(11) NOT NULL,
  `remark` varchar(255) DEFAULT NULL,
  `building_id` bigint(20) NOT NULL,
  PRIMARY KEY (`floor_id`),
  KEY `FKdhibx5frs3cwiltccr79uks37` (`building_id`),
  CONSTRAINT `FKdhibx5frs3cwiltccr79uks37` FOREIGN KEY (`building_id`) REFERENCES `buildings` (`building_id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `room_statuses`
--

DROP TABLE IF EXISTS `room_statuses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `room_statuses` (
  `room_status_id` bigint(20) NOT NULL AUTO_INCREMENT,
  `room_status_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`room_status_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `room_types`
--

DROP TABLE IF EXISTS `room_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `room_types` (
  `room_type_id` bigint(20) NOT NULL AUTO_INCREMENT,
  `room_type_name` varchar(255) NOT NULL,
  PRIMARY KEY (`room_type_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `rooms`
--

DROP TABLE IF EXISTS `rooms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `rooms` (
  `room_id` bigint(20) NOT NULL AUTO_INCREMENT,
  `remark` varchar(255) DEFAULT NULL,
  `x` int(11) NOT NULL,
  `y` int(11) NOT NULL,
  `floor_id` bigint(20) DEFAULT NULL,
  `room_status_id` bigint(20) NOT NULL,
  `room_type_id` bigint(20) NOT NULL,
  PRIMARY KEY (`room_id`),
  KEY `FK71tvfklk03awky6oydmacgcoo` (`floor_id`),
  KEY `FK86qd6bexh1bopmc0l9ahheoxn` (`room_status_id`),
  KEY `FKh9m2n1paq5hmd3u0klfl7wsfv` (`room_type_id`),
  CONSTRAINT `FK71tvfklk03awky6oydmacgcoo` FOREIGN KEY (`floor_id`) REFERENCES `floors` (`floor_id`),
  CONSTRAINT `FK86qd6bexh1bopmc0l9ahheoxn` FOREIGN KEY (`room_status_id`) REFERENCES `room_statuses` (`room_status_id`),
  CONSTRAINT `FKh9m2n1paq5hmd3u0klfl7wsfv` FOREIGN KEY (`room_type_id`) REFERENCES `room_types` (`room_type_id`)
) ENGINE=InnoDB AUTO_INCREMENT=481 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `series`
--

DROP TABLE IF EXISTS `series`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `series` (
  `series_id` bigint(20) NOT NULL AUTO_INCREMENT,
  `end_date` date DEFAULT NULL,
  `end_time` time(6) DEFAULT NULL,
  `frequency` varchar(255) DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `start_time` time(6) DEFAULT NULL,
  `desk_id` bigint(20) NOT NULL,
  `room_id` bigint(20) NOT NULL,
  `user_id` int(11) NOT NULL,
  `day_of_the_week` int(11) NOT NULL,
  PRIMARY KEY (`series_id`),
  KEY `FK1kgq750i3gghlq80uwewxmu3q` (`desk_id`),
  KEY `FKsiabx2x01o0gjmetjafvxw3u4` (`room_id`),
  KEY `FKowucb5qrpmshea8ptkmco26li` (`user_id`),
  CONSTRAINT `FK1kgq750i3gghlq80uwewxmu3q` FOREIGN KEY (`desk_id`) REFERENCES `desks` (`desk_id`),
  CONSTRAINT `FKowucb5qrpmshea8ptkmco26li` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `FKsiabx2x01o0gjmetjafvxw3u4` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`room_id`)
) ENGINE=InnoDB AUTO_INCREMENT=299 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_roles`
--

DROP TABLE IF EXISTS `user_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_roles` (
  `user_id` int(11) NOT NULL,
  `role_id` int(11) NOT NULL,
  KEY `FKh8ciramu9cc9q3qcqiv4ue8a6` (`role_id`),
  KEY `FKhfh9dx7w3ubf1co1vdev94g3f` (`user_id`),
  CONSTRAINT `FKh8ciramu9cc9q3qcqiv4ue8a6` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`),
  CONSTRAINT `FKhfh9dx7w3ubf1co1vdev94g3f` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(255) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `surname` varchar(255) DEFAULT NULL,
  `visibility` bit(1) NOT NULL,
  `visibility_mode` varchar(20) NOT NULL DEFAULT 'FULL_NAME',
  `default_floor_id` bigint(20) DEFAULT NULL,
  `default_view_mode_id` bigint(20) DEFAULT NULL,
  `mfa_enabled` tinyint(1) NOT NULL DEFAULT 0,
  `mfa_secret` varchar(255) DEFAULT NULL,
  `department` varchar(255) DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `FKgmmnwlyr2ngp088pn8f4cuvc1` (`default_floor_id`),
  KEY `FKjp6pfcd725oud9va9dp4vh4s3` (`default_view_mode_id`),
  CONSTRAINT `FKgmmnwlyr2ngp088pn8f4cuvc1` FOREIGN KEY (`default_floor_id`) REFERENCES `floors` (`floor_id`),
  CONSTRAINT `FKjp6pfcd725oud9va9dp4vh4s3` FOREIGN KEY (`default_view_mode_id`) REFERENCES `view_modes` (`view_mode_id`)
) ENGINE=InnoDB AUTO_INCREMENT=482 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `view_modes`
--

DROP TABLE IF EXISTS `view_modes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `view_modes` (
  `view_mode_id` bigint(20) NOT NULL AUTO_INCREMENT,
  `view_mode_name` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`view_mode_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

-- Dump completed on 2025-12-22 13:53:31
/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19-12.1.2-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: localhost    Database: mydatabase
-- ------------------------------------------------------
-- Server version	12.1.2-MariaDB-ubu2404

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*M!100616 SET @OLD_NOTE_VERBOSITY=@@NOTE_VERBOSITY, NOTE_VERBOSITY=0 */;

--
-- Current Database: `mydatabase`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `mydatabase` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci */;

USE `mydatabase`;

--
-- Table structure for table `bookings`
--

DROP TABLE IF EXISTS `bookings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `bookings` (
  `booking_id` bigint(20) NOT NULL AUTO_INCREMENT,
  `begin` time NOT NULL,
  `booking_in_progress` bit(1) NOT NULL,
  `day` date NOT NULL,
  `end` time NOT NULL,
  `lock_expiry_time` datetime DEFAULT NULL,
  `desk_id` bigint(20) NOT NULL,
  `room_id` bigint(20) NOT NULL,
  `user_id` int(11) NOT NULL,
  `series_id` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`booking_id`),
  KEY `FKaoxaafgq2jdhblkwiutyggant` (`desk_id`),
  KEY `FKrgoycol97o21kpjodw1qox4nc` (`room_id`),
  KEY `FKeyog2oic85xg7hsu2je2lx3s6` (`user_id`),
  KEY `FKq74u26a7ba9855a1mbesjyrq2` (`series_id`),
  CONSTRAINT `FKaoxaafgq2jdhblkwiutyggant` FOREIGN KEY (`desk_id`) REFERENCES `desks` (`desk_id`),
  CONSTRAINT `FKeyog2oic85xg7hsu2je2lx3s6` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `FKq74u26a7ba9855a1mbesjyrq2` FOREIGN KEY (`series_id`) REFERENCES `series` (`series_id`),
  CONSTRAINT `FKrgoycol97o21kpjodw1qox4nc` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`room_id`)
) ENGINE=InnoDB AUTO_INCREMENT=29240 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `buildings`
--

DROP TABLE IF EXISTS `buildings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `buildings` (
  `building_id` bigint(20) NOT NULL AUTO_INCREMENT,
  `address` varchar(255) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `ordering` int(11) NOT NULL,
  `remark` varchar(255) DEFAULT NULL,
  `town` varchar(255) NOT NULL,
  `used` bit(1) NOT NULL,
  PRIMARY KEY (`building_id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `desks`
--

DROP TABLE IF EXISTS `desks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `desks` (
  `desk_id` bigint(20) NOT NULL AUTO_INCREMENT,
  `room_id` bigint(20) NOT NULL,
  `remark` varchar(255) DEFAULT NULL,
  `desk_number_in_room` bigint(20) DEFAULT NULL,
  `equipment_id` bigint(20) NOT NULL,
  PRIMARY KEY (`desk_id`),
  KEY `FK1glnwylpo1qx4k8ckyg6sd65y` (`room_id`),
  KEY `FKnj02jj3tcyb5e604r1ufb7gfi` (`equipment_id`),
  CONSTRAINT `FK1glnwylpo1qx4k8ckyg6sd65y` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`room_id`),
  CONSTRAINT `FKnj02jj3tcyb5e604r1ufb7gfi` FOREIGN KEY (`equipment_id`) REFERENCES `equipments` (`equipment_id`)
) ENGINE=InnoDB AUTO_INCREMENT=555 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `equipments`
--

DROP TABLE IF EXISTS `equipments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `equipments` (
  `equipment_id` bigint(20) NOT NULL AUTO_INCREMENT,
  `equipment_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`equipment_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `floors`
--

DROP TABLE IF EXISTS `floors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `floors` (
  `floor_id` bigint(20) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `name_of_img` varchar(255) DEFAULT NULL,
  `ordering` int(11) NOT NULL,
  `remark` varchar(255) DEFAULT NULL,
  `building_id` bigint(20) NOT NULL,
  PRIMARY KEY (`floor_id`),
  KEY `FKdhibx5frs3cwiltccr79uks37` (`building_id`),
  CONSTRAINT `FKdhibx5frs3cwiltccr79uks37` FOREIGN KEY (`building_id`) REFERENCES `buildings` (`building_id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `room_statuses`
--

DROP TABLE IF EXISTS `room_statuses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `room_statuses` (
  `room_status_id` bigint(20) NOT NULL AUTO_INCREMENT,
  `room_status_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`room_status_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `room_types`
--

DROP TABLE IF EXISTS `room_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `room_types` (
  `room_type_id` bigint(20) NOT NULL AUTO_INCREMENT,
  `room_type_name` varchar(255) NOT NULL,
  PRIMARY KEY (`room_type_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `rooms`
--

DROP TABLE IF EXISTS `rooms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `rooms` (
  `room_id` bigint(20) NOT NULL AUTO_INCREMENT,
  `remark` varchar(255) DEFAULT NULL,
  `x` int(11) NOT NULL,
  `y` int(11) NOT NULL,
  `floor_id` bigint(20) DEFAULT NULL,
  `room_status_id` bigint(20) NOT NULL,
  `room_type_id` bigint(20) NOT NULL,
  PRIMARY KEY (`room_id`),
  KEY `FK71tvfklk03awky6oydmacgcoo` (`floor_id`),
  KEY `FK86qd6bexh1bopmc0l9ahheoxn` (`room_status_id`),
  KEY `FKh9m2n1paq5hmd3u0klfl7wsfv` (`room_type_id`),
  CONSTRAINT `FK71tvfklk03awky6oydmacgcoo` FOREIGN KEY (`floor_id`) REFERENCES `floors` (`floor_id`),
  CONSTRAINT `FK86qd6bexh1bopmc0l9ahheoxn` FOREIGN KEY (`room_status_id`) REFERENCES `room_statuses` (`room_status_id`),
  CONSTRAINT `FKh9m2n1paq5hmd3u0klfl7wsfv` FOREIGN KEY (`room_type_id`) REFERENCES `room_types` (`room_type_id`)
) ENGINE=InnoDB AUTO_INCREMENT=481 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `series`
--

DROP TABLE IF EXISTS `series`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `series` (
  `series_id` bigint(20) NOT NULL AUTO_INCREMENT,
  `end_date` date DEFAULT NULL,
  `end_time` time(6) DEFAULT NULL,
  `frequency` varchar(255) DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `start_time` time(6) DEFAULT NULL,
  `desk_id` bigint(20) NOT NULL,
  `room_id` bigint(20) NOT NULL,
  `user_id` int(11) NOT NULL,
  `day_of_the_week` int(11) NOT NULL,
  PRIMARY KEY (`series_id`),
  KEY `FK1kgq750i3gghlq80uwewxmu3q` (`desk_id`),
  KEY `FKsiabx2x01o0gjmetjafvxw3u4` (`room_id`),
  KEY `FKowucb5qrpmshea8ptkmco26li` (`user_id`),
  CONSTRAINT `FK1kgq750i3gghlq80uwewxmu3q` FOREIGN KEY (`desk_id`) REFERENCES `desks` (`desk_id`),
  CONSTRAINT `FKowucb5qrpmshea8ptkmco26li` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `FKsiabx2x01o0gjmetjafvxw3u4` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`room_id`)
) ENGINE=InnoDB AUTO_INCREMENT=299 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_roles`
--

DROP TABLE IF EXISTS `user_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_roles` (
  `user_id` int(11) NOT NULL,
  `role_id` int(11) NOT NULL,
  KEY `FKh8ciramu9cc9q3qcqiv4ue8a6` (`role_id`),
  KEY `FKhfh9dx7w3ubf1co1vdev94g3f` (`user_id`),
  CONSTRAINT `FKh8ciramu9cc9q3qcqiv4ue8a6` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`),
  CONSTRAINT `FKhfh9dx7w3ubf1co1vdev94g3f` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(255) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `surname` varchar(255) DEFAULT NULL,
  `visibility` bit(1) NOT NULL,
  `visibility_mode` varchar(20) NOT NULL DEFAULT 'FULL_NAME',
  `default_floor_id` bigint(20) DEFAULT NULL,
  `default_view_mode_id` bigint(20) DEFAULT NULL,
  `mfa_enabled` tinyint(1) NOT NULL DEFAULT 0,
  `mfa_secret` varchar(255) DEFAULT NULL,
  `department` varchar(255) DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `FKgmmnwlyr2ngp088pn8f4cuvc1` (`default_floor_id`),
  KEY `FKjp6pfcd725oud9va9dp4vh4s3` (`default_view_mode_id`),
  CONSTRAINT `FKgmmnwlyr2ngp088pn8f4cuvc1` FOREIGN KEY (`default_floor_id`) REFERENCES `floors` (`floor_id`),
  CONSTRAINT `FKjp6pfcd725oud9va9dp4vh4s3` FOREIGN KEY (`default_view_mode_id`) REFERENCES `view_modes` (`view_mode_id`)
) ENGINE=InnoDB AUTO_INCREMENT=482 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `view_modes`
--

DROP TABLE IF EXISTS `view_modes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `view_modes` (
  `view_mode_id` bigint(20) NOT NULL AUTO_INCREMENT,
  `view_mode_name` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`view_mode_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

-- Dump completed on 2025-12-22 13:54:12
