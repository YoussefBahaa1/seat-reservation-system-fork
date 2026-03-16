package com.desk_sharing.misc;

import com.desk_sharing.entities.UserEntity;
import com.desk_sharing.entities.VisibilityMode;

public final class VisibilityDisplayHelper {
    public static final String ANONYMOUS_LABEL = "Anonymous";
    public static final String UNKNOWN_LABEL = "unknown";

    private VisibilityDisplayHelper() {
    }

    public static String formatVisibleName(final String name, final String surname, final String rawMode) {
        VisibilityMode mode = VisibilityMode.FULL_NAME;
        if (rawMode != null && !rawMode.isBlank()) {
            try {
                mode = VisibilityMode.valueOf(rawMode.trim().toUpperCase());
            } catch (IllegalArgumentException ignored) {
                mode = VisibilityMode.FULL_NAME;
            }
        }
        return formatVisibleName(name, surname, mode);
    }

    public static String formatVisibleName(final String name, final String surname, final VisibilityMode rawMode) {
        final VisibilityMode mode = rawMode == null ? VisibilityMode.FULL_NAME : rawMode;
        switch (mode) {
            case ANONYMOUS:
                return ANONYMOUS_LABEL;
            case ABBREVIATION:
                return formatAbbreviation(name, surname);
            case FULL_NAME:
            default:
                return formatFullName(name, surname);
        }
    }

    public static String formatReservedByUser(final UserEntity user, final boolean revealFullIdentity) {
        if (user == null) {
            return UNKNOWN_LABEL;
        }

        final String fullName = formatFullName(user.getName(), user.getSurname());
        final String email = normalize(user.getEmail());
        if (revealFullIdentity) {
            if (!fullName.isBlank() && !email.isBlank()) {
                return fullName + " (" + email + ")";
            }
            if (!fullName.isBlank()) {
                return fullName;
            }
            return email.isBlank() ? UNKNOWN_LABEL : email;
        }

        final String visibleName = formatVisibleName(user.getName(), user.getSurname(), user.getVisibilityMode());
        return visibleName.isBlank() ? ANONYMOUS_LABEL : visibleName;
    }

    private static String formatFullName(final String name, final String surname) {
        return (normalize(name) + " " + normalize(surname)).trim();
    }

    private static String formatAbbreviation(final String name, final String surname) {
        final String first = normalize(name);
        final String last = normalize(surname);
        final String firstInitial = first.isEmpty() ? "" : first.substring(0, 1);
        final String lastInitial = last.isEmpty() ? "" : last.substring(0, 1);
        return (firstInitial + (lastInitial.isEmpty() ? "" : "." + lastInitial)).trim();
    }

    private static String normalize(final String value) {
        return value == null ? "" : value.trim();
    }
}
