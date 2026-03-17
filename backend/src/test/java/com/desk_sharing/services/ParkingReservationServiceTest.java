package com.desk_sharing.services;

import com.desk_sharing.entities.ParkingReservation;
import com.desk_sharing.entities.ParkingReservationStatus;
import com.desk_sharing.entities.ParkingSpot;
import com.desk_sharing.entities.ParkingSpotType;
import com.desk_sharing.entities.Role;
import com.desk_sharing.entities.UserEntity;
import com.desk_sharing.model.BookingDayEventDTO;
import com.desk_sharing.model.AdminParkingReservationEditRequestDTO;
import com.desk_sharing.model.AdminEditCandidateRequestDTO;
import com.desk_sharing.model.ParkingReservationRequestDTO;
import com.desk_sharing.model.ParkingSpotUpdateDTO;
import com.desk_sharing.repositories.ParkingReservationRepository;
import com.desk_sharing.repositories.ParkingSpotRepository;
import com.desk_sharing.repositories.UserRepository;
import com.desk_sharing.services.ParkingNotificationService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;

import java.sql.Date;
import java.sql.Time;
import java.time.LocalDate;
import java.util.Dictionary;
import java.util.List;
import java.util.Locale;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ParkingReservationServiceTest {

    @Mock ParkingReservationRepository parkingReservationRepository;
    @Mock ParkingSpotRepository parkingSpotRepository;
    @Mock UserRepository userRepository;
    @Mock ParkingNotificationService parkingNotificationService;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
        LocaleContextHolder.resetLocaleContext();
    }

    @Test
    void createReservation_savesWithTrimmedLabelAndCurrentUser() {
        ParkingReservationService service = new ParkingReservationService(
            parkingReservationRepository, parkingSpotRepository, userRepository, parkingNotificationService);
        authenticateAs(42, "me@example.com", false);

        LocalDate day = LocalDate.now().plusDays(1);
        ParkingReservationRequestDTO request = new ParkingReservationRequestDTO();
        request.setSpotLabel("  1  ");
        request.setDay(day.toString());
        request.setBegin("10:00");
        request.setEnd("11:00");

        when(parkingSpotRepository.findById("1")).thenReturn(java.util.Optional.of(activeSpot("1")));
        when(parkingReservationRepository.findOverlapsForSpot(any(Date.class), eq("1"), any(Time.class), any(Time.class)))
                .thenReturn(List.of());
        when(parkingReservationRepository.save(any(ParkingReservation.class)))
                .thenAnswer(inv -> {
                    ParkingReservation res = inv.getArgument(0);
                    res.setId(123L);
                    return res;
                });

        ParkingReservation saved = service.createReservation(request);

        assertThat(saved.getId()).isEqualTo(123L);
        ArgumentCaptor<ParkingReservation> captor = ArgumentCaptor.forClass(ParkingReservation.class);
        verify(parkingReservationRepository).save(captor.capture());
        ParkingReservation toSave = captor.getValue();
        assertThat(toSave.getSpotLabel()).isEqualTo("1");
        assertThat(toSave.getUserId()).isEqualTo(42);
        assertThat(toSave.getDay()).isEqualTo(Date.valueOf(day));
        assertThat(toSave.getBegin()).isEqualTo(Time.valueOf("10:00:00"));
        assertThat(toSave.getEnd()).isEqualTo(Time.valueOf("11:00:00"));
        assertThat(toSave.getStatus()).isEqualTo(ParkingReservationStatus.PENDING);
        assertThat(toSave.getCreatedAt()).isNotNull();
    }

    @Test
    void createReservation_forAdminIsApprovedImmediately() {
        ParkingReservationService service = new ParkingReservationService(
            parkingReservationRepository, parkingSpotRepository, userRepository, parkingNotificationService);
        authenticateAs(7, "admin@example.com", true);

        LocalDate day = LocalDate.now().plusDays(1);
        ParkingReservationRequestDTO request = new ParkingReservationRequestDTO();
        request.setSpotLabel("2");
        request.setDay(day.toString());
        request.setBegin("10:00");
        request.setEnd("11:00");

        when(parkingSpotRepository.findById("2")).thenReturn(java.util.Optional.of(activeSpot("2")));
        when(parkingReservationRepository.findOverlapsForSpot(any(Date.class), eq("2"), any(Time.class), any(Time.class)))
            .thenReturn(List.of());
        when(parkingReservationRepository.save(any(ParkingReservation.class)))
            .thenAnswer(inv -> inv.getArgument(0));

        ParkingReservation saved = service.createReservation(request);

        assertThat(saved.getStatus()).isEqualTo(ParkingReservationStatus.APPROVED);
    }

    @Test
    void createReservation_rejectsWhenBufferedOverlapIsReportedByRepository() {
        ParkingReservationService service = new ParkingReservationService(
            parkingReservationRepository, parkingSpotRepository, userRepository, parkingNotificationService);
        authenticateAs(42, "me@example.com", false);

        LocalDate day = LocalDate.now().plusDays(1);
        ParkingReservationRequestDTO request = new ParkingReservationRequestDTO();
        request.setSpotLabel("2");
        request.setDay(day.toString());
        // This interval is only in the 30-minute post-buffer of an existing 10:00-12:00 booking.
        request.setBegin("12:00");
        request.setEnd("12:30");

        ParkingReservation existing = new ParkingReservation();
        existing.setId(900L);
        existing.setSpotLabel("2");
        existing.setUserId(99);
        existing.setDay(Date.valueOf(day));
        existing.setBegin(Time.valueOf("10:00:00"));
        existing.setEnd(Time.valueOf("12:00:00"));
        existing.setStatus(ParkingReservationStatus.APPROVED);

        when(parkingSpotRepository.findById("2")).thenReturn(java.util.Optional.of(activeSpot("2")));
        when(parkingReservationRepository.findOverlapsForSpot(any(Date.class), eq("2"), any(Time.class), any(Time.class)))
            .thenReturn(List.of(existing));

        assertThatThrownBy(() -> service.createReservation(request))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("already reserved for this time range");
    }

    @Test
    void deleteReservation_forbidsDeletingAnotherUsersReservation() {
        ParkingReservationService service = new ParkingReservationService(
            parkingReservationRepository, parkingSpotRepository, userRepository, parkingNotificationService);
        authenticateAs(1, "me@example.com", false);

        ParkingReservation otherUsers = new ParkingReservation();
        otherUsers.setId(77L);
        otherUsers.setUserId(999);
        when(parkingReservationRepository.findById(77L)).thenReturn(java.util.Optional.of(otherUsers));

        assertThatThrownBy(() -> service.deleteReservation(77L))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Cannot delete other user's reservation");
    }

    @Test
    void approveReservation_allowsAdminToApprovePending() {
        ParkingReservationService service = new ParkingReservationService(
            parkingReservationRepository, parkingSpotRepository, userRepository, parkingNotificationService);
        authenticateAs(9, "admin@example.com", true);

        ParkingReservation pending = new ParkingReservation();
        pending.setId(5L);
        pending.setSpotLabel("1");
        pending.setDay(Date.valueOf(LocalDate.now().plusDays(1)));
        pending.setBegin(Time.valueOf("10:00:00"));
        pending.setEnd(Time.valueOf("10:30:00"));
        pending.setStatus(ParkingReservationStatus.PENDING);

        when(parkingReservationRepository.findById(5L)).thenReturn(java.util.Optional.of(pending));
        when(parkingReservationRepository.findApprovedOverlapsForSpot(any(Date.class), eq("1"), any(Time.class), any(Time.class)))
            .thenReturn(List.of());
        when(parkingReservationRepository.save(any(ParkingReservation.class))).thenAnswer(inv -> inv.getArgument(0));

        ParkingReservation approved = service.approveReservation(5L);

        assertThat(approved.getStatus()).isEqualTo(ParkingReservationStatus.APPROVED);
    }

    @Test
    void approveReservation_rejectsWhenBufferedOverlapIsReportedByRepository() {
        ParkingReservationService service = new ParkingReservationService(
            parkingReservationRepository, parkingSpotRepository, userRepository, parkingNotificationService);
        authenticateAs(9, "admin@example.com", true);

        LocalDate day = LocalDate.now().plusDays(1);

        ParkingReservation pending = new ParkingReservation();
        pending.setId(15L);
        pending.setSpotLabel("1");
        pending.setDay(Date.valueOf(day));
        // Candidate booking is within 30-minute post-buffer of an existing approved reservation.
        pending.setBegin(Time.valueOf("12:00:00"));
        pending.setEnd(Time.valueOf("12:30:00"));
        pending.setStatus(ParkingReservationStatus.PENDING);

        ParkingReservation approvedExisting = new ParkingReservation();
        approvedExisting.setId(16L);
        approvedExisting.setSpotLabel("1");
        approvedExisting.setDay(Date.valueOf(day));
        approvedExisting.setBegin(Time.valueOf("10:00:00"));
        approvedExisting.setEnd(Time.valueOf("12:00:00"));
        approvedExisting.setStatus(ParkingReservationStatus.APPROVED);

        when(parkingReservationRepository.findById(15L)).thenReturn(java.util.Optional.of(pending));
        when(parkingReservationRepository.findApprovedOverlapsForSpot(any(Date.class), eq("1"), any(Time.class), any(Time.class)))
            .thenReturn(List.of(approvedExisting));

        assertThatThrownBy(() -> service.approveReservation(15L))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("no longer available for approval");
    }

    @Test
    void rejectReservation_marksPendingRejectedForAdmin() {
        ParkingReservationService service = new ParkingReservationService(
            parkingReservationRepository, parkingSpotRepository, userRepository, parkingNotificationService);
        authenticateAs(9, "admin@example.com", true);

        ParkingReservation pending = new ParkingReservation();
        pending.setId(6L);
        pending.setStatus(ParkingReservationStatus.PENDING);

        when(parkingReservationRepository.findById(6L)).thenReturn(java.util.Optional.of(pending));
        when(parkingReservationRepository.save(any(ParkingReservation.class))).thenAnswer(inv -> inv.getArgument(0));

        service.rejectReservation(6L);

        ArgumentCaptor<ParkingReservation> captor = ArgumentCaptor.forClass(ParkingReservation.class);
        verify(parkingReservationRepository).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo(ParkingReservationStatus.REJECTED);
    }

    @Test
    void editReservationByAdmin_updatesPeriodAndSpotAndNotifies() {
        ParkingReservationService service = new ParkingReservationService(
            parkingReservationRepository, parkingSpotRepository, userRepository, parkingNotificationService);
        authenticateAs(9, "admin@example.com", true);

        ParkingReservation approved = new ParkingReservation();
        approved.setId(5L);
        approved.setSpotLabel("1");
        approved.setUserId(42);
        approved.setDay(Date.valueOf(LocalDate.now().plusDays(1)));
        approved.setBegin(Time.valueOf("10:00:00"));
        approved.setEnd(Time.valueOf("12:00:00"));
        approved.setStatus(ParkingReservationStatus.APPROVED);

        ParkingSpot targetSpot = activeSpot("2");

        AdminParkingReservationEditRequestDTO request = new AdminParkingReservationEditRequestDTO();
        request.setDay(LocalDate.now().plusDays(2).toString());
        request.setBegin("11:00");
        request.setEnd("13:00");
        request.setSpotLabel("2");
        request.setJustification("Operational adjustment");

        when(parkingReservationRepository.findById(5L)).thenReturn(java.util.Optional.of(approved));
        when(parkingSpotRepository.findById("2")).thenReturn(java.util.Optional.of(targetSpot));
        when(parkingReservationRepository.findApprovedOverlapsForSpot(
            eq(Date.valueOf(request.getDay())),
            eq("2"),
            eq(Time.valueOf("11:00:00")),
            eq(Time.valueOf("13:00:00"))
        )).thenReturn(List.of());
        when(parkingReservationRepository.save(any(ParkingReservation.class))).thenAnswer(inv -> inv.getArgument(0));

        ParkingReservation updated = service.editReservationByAdmin(5L, request);

        assertThat(updated.getDay()).isEqualTo(Date.valueOf(request.getDay()));
        assertThat(updated.getBegin()).isEqualTo(Time.valueOf("11:00:00"));
        assertThat(updated.getEnd()).isEqualTo(Time.valueOf("13:00:00"));
        assertThat(updated.getSpotLabel()).isEqualTo("2");
        assertThat(updated.getStatus()).isEqualTo(ParkingReservationStatus.APPROVED);
        verify(parkingNotificationService).notifyUpdatedByAdmin(any(ParkingReservation.class), eq(updated), eq("Operational adjustment"));
    }

    @Test
    void editReservationByAdmin_rejectsPendingReservation() {
        ParkingReservationService service = new ParkingReservationService(
            parkingReservationRepository, parkingSpotRepository, userRepository, parkingNotificationService);
        authenticateAs(9, "admin@example.com", true);

        ParkingReservation pending = new ParkingReservation();
        pending.setId(7L);
        pending.setSpotLabel("1");
        pending.setStatus(ParkingReservationStatus.PENDING);

        AdminParkingReservationEditRequestDTO request = new AdminParkingReservationEditRequestDTO();
        request.setDay(LocalDate.now().plusDays(2).toString());
        request.setBegin("11:00");
        request.setEnd("13:00");
        request.setSpotLabel("1");
        request.setJustification("Operational adjustment");

        when(parkingReservationRepository.findById(7L)).thenReturn(java.util.Optional.of(pending));

        assertThatThrownBy(() -> service.editReservationByAdmin(7L, request))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("Only approved reservations can be edited");
    }

    @Test
    void editReservationByAdmin_rejectsUnchangedSubmission() {
        ParkingReservationService service = new ParkingReservationService(
            parkingReservationRepository, parkingSpotRepository, userRepository, parkingNotificationService);
        authenticateAs(9, "admin@example.com", true);

        ParkingReservation approved = new ParkingReservation();
        approved.setId(5L);
        approved.setSpotLabel("1");
        approved.setUserId(42);
        approved.setDay(Date.valueOf(LocalDate.now().plusDays(1)));
        approved.setBegin(Time.valueOf("10:00:00"));
        approved.setEnd(Time.valueOf("12:00:00"));
        approved.setStatus(ParkingReservationStatus.APPROVED);

        AdminParkingReservationEditRequestDTO request = new AdminParkingReservationEditRequestDTO();
        request.setDay(approved.getDay().toString());
        request.setBegin("10:00");
        request.setEnd("12:00");
        request.setSpotLabel("1");
        request.setJustification("Operational adjustment");

        when(parkingReservationRepository.findById(5L)).thenReturn(java.util.Optional.of(approved));
        when(parkingSpotRepository.findById("1")).thenReturn(java.util.Optional.of(activeSpot("1")));

        assertThatThrownBy(() -> service.editReservationByAdmin(5L, request))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("No changes submitted");
    }

    @Test
    void getCandidateSpotsForAdminEdit_returnsCurrentSpotWhenStillValid() {
        ParkingReservationService service = new ParkingReservationService(
            parkingReservationRepository, parkingSpotRepository, userRepository, parkingNotificationService);
        authenticateAs(9, "admin@example.com", true);

        ParkingReservation approved = new ParkingReservation();
        approved.setId(5L);
        approved.setSpotLabel("1");
        approved.setUserId(42);
        approved.setDay(Date.valueOf(LocalDate.now().plusDays(1)));
        approved.setBegin(Time.valueOf("10:00:00"));
        approved.setEnd(Time.valueOf("12:00:00"));
        approved.setStatus(ParkingReservationStatus.APPROVED);

        AdminEditCandidateRequestDTO request = new AdminEditCandidateRequestDTO();
        request.setDay(approved.getDay().toString());
        request.setBegin("10:00");
        request.setEnd("12:00");

        when(parkingReservationRepository.findById(5L)).thenReturn(java.util.Optional.of(approved));
        when(parkingSpotRepository.findByActiveTrueOrderBySpotLabelAsc()).thenReturn(List.of(activeSpot("1")));
        when(parkingReservationRepository.findApprovedOverlapsForSpot(
            eq(approved.getDay()),
            eq("1"),
            eq(approved.getBegin()),
            eq(approved.getEnd())
        )).thenReturn(List.of(approved));

        assertThat(service.getCandidateSpotsForAdminEdit(5L, request))
            .extracting(candidate -> candidate.getSpotLabel())
            .containsExactly("1");
    }

    @Test
    void getCandidateSpotsForAdminEdit_omitsCurrentSpotWhenEditedPeriodConflicts() {
        ParkingReservationService service = new ParkingReservationService(
            parkingReservationRepository, parkingSpotRepository, userRepository, parkingNotificationService);
        authenticateAs(9, "admin@example.com", true);

        ParkingReservation approved = new ParkingReservation();
        approved.setId(5L);
        approved.setSpotLabel("1");
        approved.setUserId(42);
        approved.setDay(Date.valueOf(LocalDate.now().plusDays(1)));
        approved.setBegin(Time.valueOf("10:00:00"));
        approved.setEnd(Time.valueOf("12:00:00"));
        approved.setStatus(ParkingReservationStatus.APPROVED);

        ParkingReservation otherReservation = new ParkingReservation();
        otherReservation.setId(6L);

        AdminEditCandidateRequestDTO request = new AdminEditCandidateRequestDTO();
        request.setDay(approved.getDay().toString());
        request.setBegin("11:00");
        request.setEnd("13:00");

        when(parkingReservationRepository.findById(5L)).thenReturn(java.util.Optional.of(approved));
        when(parkingSpotRepository.findByActiveTrueOrderBySpotLabelAsc()).thenReturn(List.of(activeSpot("1")));
        when(parkingReservationRepository.findApprovedOverlapsForSpot(
            eq(approved.getDay()),
            eq("1"),
            eq(Time.valueOf("11:00:00")),
            eq(Time.valueOf("13:00:00"))
        )).thenReturn(List.of(otherReservation));

        assertThat(service.getCandidateSpotsForAdminEdit(5L, request)).isEmpty();
    }

    @Test
    void getAllApprovedReservationsForAdmin_includesLegacyNullStatusReservations() {
        ParkingReservationService service = new ParkingReservationService(
            parkingReservationRepository, parkingSpotRepository, userRepository, parkingNotificationService);
        authenticateAs(9, "admin@example.com", true);

        ParkingReservation legacyApproved = new ParkingReservation();
        legacyApproved.setId(11L);
        legacyApproved.setUserId(42);
        legacyApproved.setSpotLabel("12");
        legacyApproved.setDay(Date.valueOf(LocalDate.now().plusDays(1)));
        legacyApproved.setBegin(Time.valueOf("09:00:00"));
        legacyApproved.setEnd(Time.valueOf("10:00:00"));
        legacyApproved.setStatus(null);

        UserEntity bookingUser = new UserEntity();
        bookingUser.setId(42);
        bookingUser.setEmail("user@example.com");
        bookingUser.setName("Ada");
        bookingUser.setSurname("Lovelace");
        bookingUser.setDepartment("Engineering");
        Role role = new Role();
        role.setName("ROLE_USER");
        bookingUser.setRoles(List.of(role));

        when(parkingReservationRepository.findApprovedIncludingLegacyNullOrderByCreatedAtAsc())
            .thenReturn(List.of(legacyApproved));
        when(userRepository.findById(42)).thenReturn(java.util.Optional.of(bookingUser));

        assertThat(service.getAllApprovedReservationsForAdmin())
            .hasSize(1)
            .first()
            .satisfies(dto -> {
                assertThat(dto.getId()).isEqualTo(11L);
                assertThat(dto.getSpotLabel()).isEqualTo("12");
                assertThat(dto.getEmail()).isEqualTo("user@example.com");
            });
    }

    @Test
    void getReservationsForDate_throwsBadRequestOnNullDay() {
        ParkingReservationService service = new ParkingReservationService(
            parkingReservationRepository, parkingSpotRepository, userRepository, parkingNotificationService);

        assertThatThrownBy(() -> service.getReservationsForDate(null))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("Missing day");
    }

    @Test
    void getReservationsForDate_mapsParkingReservationToDayEvent() {
        ParkingReservationService service = new ParkingReservationService(
            parkingReservationRepository, parkingSpotRepository, userRepository, parkingNotificationService);

        Date day = Date.valueOf(LocalDate.now().plusDays(1));
        ParkingReservation reservation = new ParkingReservation();
        reservation.setId(8L);
        reservation.setUserId(21);
        reservation.setSpotLabel("32");
        reservation.setDay(day);
        reservation.setBegin(Time.valueOf("08:00:00"));
        reservation.setEnd(Time.valueOf("10:00:00"));
        reservation.setStatus(ParkingReservationStatus.PENDING);
        ParkingSpot spot = new ParkingSpot();
        spot.setSpotLabel("32");
        spot.setSpotType(ParkingSpotType.E_CHARGING_STATION);
        spot.setCovered(true);
        when(parkingReservationRepository.findByDay(day)).thenReturn(List.of(reservation));
        when(parkingSpotRepository.findBySpotLabelIn(List.of("32"))).thenReturn(List.of(spot));

        List<BookingDayEventDTO> result = service.getReservationsForDate(day);

        assertThat(result).hasSize(1);
        BookingDayEventDTO dto = result.get(0);
        assertThat(dto.getId()).isEqualTo(8L);
        assertThat(dto.getUserId()).isEqualTo(21);
        assertThat(dto.getParkingId()).isEqualTo(32L);
        assertThat(dto.getParkingType()).isEqualTo("E_CHARGING_STATION");
        assertThat(dto.getParkingCovered()).isTrue();
        assertThat(dto.getParkingStatus()).isEqualTo("PENDING");
        assertThat(dto.getMode()).isEqualTo("parking");
    }

    @Test
    void getAllReservationsForDates_returnsCountForEachDay() {
        ParkingReservationService service = new ParkingReservationService(
            parkingReservationRepository, parkingSpotRepository, userRepository, parkingNotificationService);

        Date day1 = Date.valueOf(LocalDate.now().plusDays(1));
        Date day2 = Date.valueOf(LocalDate.now().plusDays(2));
        when(parkingReservationRepository.countByDay(day1)).thenReturn(3L);
        when(parkingReservationRepository.countByDay(day2)).thenReturn(0L);

        Dictionary<Date, Integer> counts = service.getAllReservationsForDates(List.of(day1, day2));

        assertThat(counts.get(day1)).isEqualTo(3);
        assertThat(counts.get(day2)).isEqualTo(0);
        verify(parkingReservationRepository).countByDay(day1);
        verify(parkingReservationRepository).countByDay(day2);
    }

    @Test
    void setSpotManualBlocked_blocksSpotForAdmin() {
        ParkingReservationService service = new ParkingReservationService(
            parkingReservationRepository, parkingSpotRepository, userRepository, parkingNotificationService);
        authenticateAs(9, "admin@example.com", true);

        ParkingSpot spot = new ParkingSpot();
        spot.setSpotLabel("32");
        spot.setSpotType(ParkingSpotType.STANDARD);
        spot.setManuallyBlocked(false);
        when(parkingSpotRepository.findById("32")).thenReturn(java.util.Optional.of(spot));
        when(parkingSpotRepository.save(any(ParkingSpot.class))).thenAnswer(inv -> inv.getArgument(0));

        ParkingSpot saved = service.setSpotManualBlocked("32", true);

        assertThat(saved.isManuallyBlocked()).isTrue();
        verify(parkingSpotRepository).save(spot);
    }

    @Test
    void setSpotManualBlocked_rejectsNonAdmin() {
        ParkingReservationService service = new ParkingReservationService(
            parkingReservationRepository, parkingSpotRepository, userRepository, parkingNotificationService);
        authenticateAs(3, "user@example.com", false);

        assertThatThrownBy(() -> service.setSpotManualBlocked("32", true))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("Admin role required");
    }

    @Test
    void setSpotManualBlocked_rejectsSpecialCaseSpot() {
        ParkingReservationService service = new ParkingReservationService(
            parkingReservationRepository, parkingSpotRepository, userRepository, parkingNotificationService);
        authenticateAs(9, "admin@example.com", true);

        ParkingSpot special = new ParkingSpot();
        special.setSpotLabel("23");
        special.setSpotType(ParkingSpotType.SPECIAL_CASE);
        when(parkingSpotRepository.findById("23")).thenReturn(java.util.Optional.of(special));

        assertThatThrownBy(() -> service.setSpotManualBlocked("23", true))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("Special-case spots cannot be manually blocked/unblocked");
        verify(parkingSpotRepository, never()).save(any(ParkingSpot.class));
    }

    @Test
    void createReservation_rejectsUnknownSpot() {
        ParkingReservationService service = new ParkingReservationService(
            parkingReservationRepository, parkingSpotRepository, userRepository, parkingNotificationService);

        ParkingReservationRequestDTO request = new ParkingReservationRequestDTO();
        request.setSpotLabel("404");
        request.setDay(LocalDate.now().plusDays(1).toString());
        request.setBegin("10:00");
        request.setEnd("11:00");

        when(parkingSpotRepository.findById("404")).thenReturn(java.util.Optional.empty());

        assertThatThrownBy(() -> service.createReservation(request))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("Parking spot not found");
    }

    @Test
    void createReservation_rejectsInactiveSpot() {
        ParkingReservationService service = new ParkingReservationService(
            parkingReservationRepository, parkingSpotRepository, userRepository, parkingNotificationService);

        ParkingSpot inactiveSpot = activeSpot("15");
        inactiveSpot.setActive(false);
        when(parkingSpotRepository.findById("15")).thenReturn(java.util.Optional.of(inactiveSpot));

        ParkingReservationRequestDTO request = new ParkingReservationRequestDTO();
        request.setSpotLabel("15");
        request.setDay(LocalDate.now().plusDays(1).toString());
        request.setBegin("10:00");
        request.setEnd("11:00");

        assertThatThrownBy(() -> service.createReservation(request))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("Parking spot is not active");
    }

    @Test
    void createReservation_rejectsWhenSpotIsManuallyBlocked() {
        ParkingReservationService service = new ParkingReservationService(
            parkingReservationRepository, parkingSpotRepository, userRepository, parkingNotificationService);

        ParkingSpot blockedSpot = new ParkingSpot();
        blockedSpot.setSpotLabel("7");
        blockedSpot.setSpotType(ParkingSpotType.STANDARD);
        blockedSpot.setActive(true);
        blockedSpot.setManuallyBlocked(true);
        when(parkingSpotRepository.findById("7")).thenReturn(java.util.Optional.of(blockedSpot));

        ParkingReservationRequestDTO request = new ParkingReservationRequestDTO();
        request.setSpotLabel("7");
        request.setDay(LocalDate.now().plusDays(1).toString());
        request.setBegin("10:00");
        request.setEnd("11:00");

        assertThatThrownBy(() -> service.createReservation(request))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("This spot is blocked");
    }

    @Test
    void createReservation_keepsProvidedRequestLocale() {
        ParkingReservationService service = new ParkingReservationService(
            parkingReservationRepository, parkingSpotRepository, userRepository, parkingNotificationService);
        authenticateAs(42, "me@example.com", false);

        LocalDate day = LocalDate.now().plusDays(1);
        ParkingReservationRequestDTO request = new ParkingReservationRequestDTO();
        request.setSpotLabel("2");
        request.setDay(day.toString());
        request.setBegin("10:00");
        request.setEnd("11:00");
        request.setLocale("de-DE");

        when(parkingSpotRepository.findById("2")).thenReturn(java.util.Optional.of(activeSpot("2")));
        when(parkingReservationRepository.findOverlapsForSpot(any(Date.class), eq("2"), any(Time.class), any(Time.class)))
            .thenReturn(List.of());
        when(parkingReservationRepository.save(any(ParkingReservation.class)))
            .thenAnswer(inv -> inv.getArgument(0));

        ParkingReservation saved = service.createReservation(request);
        assertThat(saved.getRequestLocale()).isEqualTo("de-DE");
    }

    @Test
    void createReservation_usesLocaleContextFallbackWhenRequestLocaleMissing() {
        ParkingReservationService service = new ParkingReservationService(
            parkingReservationRepository, parkingSpotRepository, userRepository, parkingNotificationService);
        authenticateAs(42, "me@example.com", false);
        LocaleContextHolder.setLocale(Locale.forLanguageTag("es-ES"));

        LocalDate day = LocalDate.now().plusDays(1);
        ParkingReservationRequestDTO request = new ParkingReservationRequestDTO();
        request.setSpotLabel("2");
        request.setDay(day.toString());
        request.setBegin("10:00");
        request.setEnd("11:00");
        request.setLocale(" ");

        when(parkingSpotRepository.findById("2")).thenReturn(java.util.Optional.of(activeSpot("2")));
        when(parkingReservationRepository.findOverlapsForSpot(any(Date.class), eq("2"), any(Time.class), any(Time.class)))
            .thenReturn(List.of());
        when(parkingReservationRepository.save(any(ParkingReservation.class)))
            .thenAnswer(inv -> inv.getArgument(0));

        ParkingReservation saved = service.createReservation(request);
        assertThat(saved.getRequestLocale()).isEqualTo("es-ES");
    }

    @Test
    void approveReservation_notifiesOnApproval() {
        ParkingReservationService service = new ParkingReservationService(
            parkingReservationRepository, parkingSpotRepository, userRepository, parkingNotificationService);
        authenticateAs(9, "admin@example.com", true);

        ParkingReservation pending = new ParkingReservation();
        pending.setId(12L);
        pending.setSpotLabel("1");
        pending.setDay(Date.valueOf(LocalDate.now().plusDays(1)));
        pending.setBegin(Time.valueOf("10:00:00"));
        pending.setEnd(Time.valueOf("10:30:00"));
        pending.setStatus(ParkingReservationStatus.PENDING);

        when(parkingReservationRepository.findById(12L)).thenReturn(java.util.Optional.of(pending));
        when(parkingReservationRepository.findApprovedOverlapsForSpot(any(Date.class), eq("1"), any(Time.class), any(Time.class)))
            .thenReturn(List.of());
        when(parkingReservationRepository.save(any(ParkingReservation.class))).thenAnswer(inv -> inv.getArgument(0));

        ParkingReservation approved = service.approveReservation(12L);

        assertThat(approved.getStatus()).isEqualTo(ParkingReservationStatus.APPROVED);
        verify(parkingNotificationService).notifyDecision(approved, true);
    }

    @Test
    void saveParkingSpot_createsNewCatalogEntry() {
        ParkingReservationService service = new ParkingReservationService(
            parkingReservationRepository, parkingSpotRepository, userRepository, parkingNotificationService);
        authenticateAs(9, "admin@example.com", true);

        ParkingSpotUpdateDTO request = new ParkingSpotUpdateDTO();
        request.setSpotLabel("W1");
        request.setDisplayLabel("41");
        request.setSpotType("STANDARD");
        request.setActive(true);
        request.setCovered(true);
        request.setManuallyBlocked(false);

        when(parkingSpotRepository.findById("W1")).thenReturn(java.util.Optional.empty());
        when(parkingSpotRepository.save(any(ParkingSpot.class))).thenAnswer(inv -> inv.getArgument(0));

        ParkingSpot saved = service.saveParkingSpot(request);

        assertThat(saved.getSpotLabel()).isEqualTo("W1");
        assertThat(saved.getDisplayLabel()).isEqualTo("41");
        assertThat(saved.isActive()).isTrue();
        assertThat(saved.isCovered()).isTrue();
        assertThat(saved.getSpotType()).isEqualTo(ParkingSpotType.STANDARD);
    }

    @Test
    void setSpotActive_deactivatesExistingSpot() {
        ParkingReservationService service = new ParkingReservationService(
            parkingReservationRepository, parkingSpotRepository, userRepository, parkingNotificationService);
        authenticateAs(9, "admin@example.com", true);

        ParkingSpot spot = activeSpot("32");
        spot.setManuallyBlocked(true);
        when(parkingSpotRepository.findById("32")).thenReturn(java.util.Optional.of(spot));
        when(parkingSpotRepository.save(any(ParkingSpot.class))).thenAnswer(inv -> inv.getArgument(0));

        ParkingSpot saved = service.setSpotActive("32", false);

        assertThat(saved.isActive()).isFalse();
        assertThat(saved.isManuallyBlocked()).isFalse();
    }

    private void authenticateAs(int userId, String email, boolean admin) {
        Authentication auth = mock(Authentication.class);
        when(auth.getName()).thenReturn(email);
        var ctx = SecurityContextHolder.createEmptyContext();
        ctx.setAuthentication(auth);
        SecurityContextHolder.setContext(ctx);

        UserEntity user = new UserEntity();
        user.setId(userId);
        user.setEmail(email);
        if (admin) {
            Role role = new Role();
            role.setName("ROLE_ADMIN");
            user.setRoles(java.util.List.of(role));
        }
        when(userRepository.findByEmail(anyString())).thenReturn(user);
    }

    private ParkingSpot activeSpot(final String label) {
        ParkingSpot spot = new ParkingSpot();
        spot.setSpotLabel(label);
        spot.setDisplayLabel(label);
        spot.setSpotType(ParkingSpotType.STANDARD);
        spot.setActive(true);
        return spot;
    }
}
