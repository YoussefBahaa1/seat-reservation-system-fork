import { formatDate_yyyymmdd_to_ddmmyyyy } from './formatDate';
import { deleteRequest, postRequest, putRequest } from '../RequestFunctions/RequestFunctions';
import { toast } from 'react-toastify';
import { confirmAlert } from 'react-confirm-alert';
import { colorVars } from '../../theme';

const modalStyles = {
    container: {
        width: 'min(560px, calc(100vw - 32px))',
        maxWidth: '100%',
        maxHeight: 'min(80vh, 720px)',
        overflowY: 'auto',
        padding: '24px',
        borderRadius: '16px',
        backgroundColor: colorVars.surface.paper,
        boxShadow: colorVars.shadow.card,
        color: colorVars.text.primary,
        textAlign: 'left',
        border: `1px solid ${colorVars.border.default}`,
        boxSizing: 'border-box',
    },
    title: {
        margin: 0,
        fontSize: 'clamp(1.15rem, 2vw, 1.6rem)',
        lineHeight: 1.2,
        fontWeight: 700,
        color: colorVars.text.primary,
        overflowWrap: 'anywhere',
    },
    detailsGrid: {
        marginTop: '18px',
        display: 'grid',
        gridTemplateColumns: 'auto 1fr',
        gap: '10px 14px',
        alignItems: 'start',
    },
    detailLabel: {
        fontWeight: 700,
        color: colorVars.text.primary,
        whiteSpace: 'nowrap',
    },
    detailValue: {
        color: colorVars.text.body,
        overflowWrap: 'anywhere',
    },
    dateList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
    },
    dateListItem: {
        padding: '6px 10px',
        borderRadius: '8px',
        backgroundColor: colorVars.surface.subtle,
        border: `1px solid ${colorVars.border.faint}`,
        color: colorVars.text.body,
    },
    warningBox: {
        marginTop: '18px',
        padding: '12px 14px',
        borderRadius: '10px',
        backgroundColor: colorVars.surface.warning,
        border: `1px solid ${colorVars.border.warning}`,
    },
    warningTitle: {
        margin: '0 0 4px 0',
        fontWeight: 700,
        color: colorVars.text.warning,
    },
    warningText: {
        margin: 0,
        color: colorVars.text.warning,
        lineHeight: 1.45,
    },
    footer: {
        marginTop: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap',
    },
    primaryActions: {
        display: 'flex',
        gap: '10px',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
    },
    primaryButton: {
        padding: '8px 12px',
        borderRadius: '8px',
        border: `1px solid ${colorVars.brand.accent}`,
        backgroundColor: colorVars.brand.accent,
        color: colorVars.text.inverse,
        fontWeight: 500,
        fontSize: '0.875rem',
        fontFamily: "'Source Sans Pro', sans-serif",
        lineHeight: 1.2,
        letterSpacing: '0.02857em',
        textTransform: 'none',
        cursor: 'pointer',
        boxShadow: 'none',
    },
    secondaryButton: {
        padding: '8px 12px',
        borderRadius: '4px',
        border: `1px solid ${colorVars.brand.accent}`,
        backgroundColor: 'transparent',
        color: colorVars.brand.accent,
        fontWeight: 500,
        fontSize: '0.875rem',
        fontFamily: "'Source Sans Pro', sans-serif",
        lineHeight: 1.2,
        letterSpacing: '0.02857em',
        textTransform: 'none',
        cursor: 'pointer',
        boxShadow: 'none',
    },
};

const trimSeconds = (timeValue) => {
    const [hours = '00', minutes = '00'] = String(timeValue || '').split(':');
    return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
};

const formatEquipmentSummary = (t, desk) => {
    if (!desk) return '';

    const hasSpecialFeatures = desk?.specialFeatures != null && String(desk.specialFeatures).trim() !== '';
    const monitorCount = desk?.monitorsQuantity ?? 1;
    const labels = [
        t(`workstationType${desk?.workstationType || 'Standard'}`),
        `${monitorCount} ${t(monitorCount === 1 ? 'monitorSingular' : 'monitors')}`,
    ];

    if (desk?.deskHeightAdjustable === true) {
        labels.push(t('adjustableHeight'));
    }
    if (desk?.technologyDockingStation === true) {
        labels.push(t('technologyDockingStation'));
    }
    if (desk?.technologyWebcam === true) {
        labels.push(t('technologyWebcam'));
    }
    if (desk?.technologyHeadset === true) {
        labels.push(t('technologyHeadset'));
    }
    if (hasSpecialFeatures) {
        labels.push(`${t('specialFeatures')}: ${String(desk.specialFeatures).trim()}`);
    }

    return labels.join(', ');
};

const normalizeBookingForCalendar = (bookingData, bookingId, deskRemark) => ({
    id: bookingId,
    title: `${deskRemark ? `Desk ${deskRemark}` : `Desk ${bookingData.deskId}`}`.trim(),
    start: new Date(`${bookingData.day}T${bookingData.begin}`),
    end: new Date(`${bookingData.day}T${bookingData.end}`),
});

const renderBookingDetails = ({ t, bookingData, deskRemark, deskDetails, bookingDates = [] }) => {
    const equipment = formatEquipmentSummary(t, deskDetails);
    const roomRemark = deskDetails?.room?.remark || '';
    const buildingName = deskDetails?.room?.floor?.building?.name || '';
    const normalizedDates = Array.isArray(bookingDates)
        ? bookingDates.filter(Boolean).map((date) => formatDate_yyyymmdd_to_ddmmyyyy(date))
        : [];
    const hasMultipleDates = normalizedDates.length > 0;

    return (
        <div style={modalStyles.detailsGrid}>
            <span style={modalStyles.detailLabel}>{t(hasMultipleDates ? 'dates' : 'date')}:</span>
            {hasMultipleDates ? (
                <div style={modalStyles.dateList}>
                    {normalizedDates.map((dateValue) => (
                        <span key={dateValue} style={modalStyles.dateListItem}>{dateValue}</span>
                    ))}
                </div>
            ) : (
                <span style={modalStyles.detailValue}>{formatDate_yyyymmdd_to_ddmmyyyy(bookingData.day)}</span>
            )}
            <span style={modalStyles.detailLabel}>{t('time')}:</span>
            <span style={modalStyles.detailValue}>
                {trimSeconds(bookingData.begin)} {t('to')} {trimSeconds(bookingData.end)}
            </span>
            <span style={modalStyles.detailLabel}>{t('building')}:</span>
            <span style={modalStyles.detailValue}>{buildingName || '-'}</span>
            <span style={modalStyles.detailLabel}>{t('room')}:</span>
            <span style={modalStyles.detailValue}>{roomRemark || '-'}</span>
            <span style={modalStyles.detailLabel}>{t('equipment')}:</span>
            <span style={modalStyles.detailValue}>{equipment || '-'}</span>
        </div>
    );
};

const renderOverlapWarningDetails = (t, conflictingDates = []) => {
    const normalizedDates = Array.isArray(conflictingDates)
        ? conflictingDates.filter(Boolean).map((date) => formatDate_yyyymmdd_to_ddmmyyyy(date))
        : [];

    return (
        <div style={modalStyles.warningBox}>
            <p style={modalStyles.warningTitle}>{t('warning')}</p>
            <p style={modalStyles.warningText}>{t('bookingOverlapOtherDeskWarning')}</p>
            {normalizedDates.length > 0 ? (
                <div style={{ ...modalStyles.dateList, marginTop: '10px' }}>
                    <span style={modalStyles.detailLabel}>{t('conflictingDates')}:</span>
                    {normalizedDates.map((dateValue) => (
                        <span key={dateValue} style={modalStyles.dateListItem}>{dateValue}</span>
                    ))}
                </div>
            ) : null}
        </div>
    );
};

const escapeIcsText = (text) => {
    if (!text) return '';
    return String(text)
        .replace(/\\/g, '\\\\')
        .replace(/\n/g, '\\n')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,');
};

const normalizeTime = (timeValue) => {
    if (!timeValue) return '000000';
    const parts = String(timeValue).split(':');
    const hours = (parts[0] || '00').padStart(2, '0');
    const minutes = (parts[1] || '00').padStart(2, '0');
    const seconds = (parts[2] || '00').padStart(2, '0');
    return `${hours}${minutes}${seconds}`;
};

const formatIcsDateTime = (day, timeValue) => {
    const dayPart = String(day || '').replace(/-/g, '');
    return `${dayPart}T${normalizeTime(timeValue)}`;
};

export const exportIcsFile = ({ bookingData, deskRemark, t }) => {
    const dtstamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    const dtstart = formatIcsDateTime(bookingData.day, bookingData.begin);
    const dtend = formatIcsDateTime(bookingData.day, bookingData.end);
    const summary = `${t('desk')} ${deskRemark}`.trim();

    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Desk Sharing Tool//Booking//EN',
        'CALSCALE:GREGORIAN',
        'BEGIN:VEVENT',
        `UID:booking-${bookingData.userId}-${dtstart}@desksharing`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART:${dtstart}`,
        `DTEND:${dtend}`,
        `SUMMARY:${escapeIcsText(summary)}`,
        `DESCRIPTION:${escapeIcsText(`${t('desk')}: ${deskRemark}`)}`,
        'END:VEVENT',
        'END:VCALENDAR',
    ];

    const icsContent = lines.join('\r\n');
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const filename = `booking_${bookingData.day}.ics`;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
};

export const exportSeriesIcsFiles = ({ bookingDates, bookingData, deskRemark, t }) => {
    const normalizedDates = Array.isArray(bookingDates) ? bookingDates.filter(Boolean) : [];
    normalizedDates.forEach((dateValue, index) => {
        window.setTimeout(() => {
            exportIcsFile({
                bookingData: {
                    ...bookingData,
                    day: dateValue,
                },
                deskRemark,
                t,
            });
        }, index * 150);
    });
};

const getErrorMessage = (t, status, data) => {
    if (status === 409 && typeof data?.error === 'string' && data.error.toLowerCase().includes('currently being booked')) {
        return t('currentlyBeingBooked');
    }
    if (data?.error) return data.error;
    if (data?.message) return data.message;
    if (status === 401) return t('tokenInvalid');
    if (status === 409) return t('overlap');
    return t('httpOther');
};

const createDraftBooking = (headers, bookingData, onSuccess, onFail) => {
    postRequest(
        `${process.env.REACT_APP_BACKEND_URL}/bookings`,
        headers.current,
        onSuccess,
        onFail,
        JSON.stringify({
            ...bookingData,
            bookingInProgress: true,
        })
    );
};

const confirmDraftBooking = (headers, draftBookingId, onSuccess, onFail) => {
    putRequest(
        `${process.env.REACT_APP_BACKEND_URL}/bookings/confirm/${draftBookingId}`,
        headers.current,
        onSuccess,
        onFail
    );
};

const deleteDraftBooking = (headers, draftBookingId, onDone) => {
    deleteRequest(
        `${process.env.REACT_APP_BACKEND_URL}/bookings/${draftBookingId}`,
        headers.current,
        () => {
            if (typeof onDone === 'function') onDone();
        },
        () => {
            if (typeof onDone === 'function') onDone();
        }
    );
};

export function checkDeskBookingOverlap(headers, bookingId, ignoreBookingId, t, onSuccess, onFail) {
    postRequest(
        `${process.env.REACT_APP_BACKEND_URL}/bookings/overlap-check`,
        headers.current,
        (data) => {
            if (typeof onSuccess === 'function') {
                onSuccess(Boolean(data?.hasOverlap));
            }
        },
        (status, data) => {
            if (typeof onFail === 'function') {
                onFail(status, data);
            }
        },
        JSON.stringify({
            bookingId,
            ignoreBookingId: ignoreBookingId ?? null,
        })
    );
}

export function showDeskBookingConfirmation({
    t,
    deskRemark,
    deskDetails,
    bookingData,
    hasOverlap = false,
    onConfirm,
    onCancel,
    onExportIcs,
    title,
    confirmLabel,
    cancelLabel,
    exportLabel,
    showExportIcs = false,
    bookingDates = [],
    conflictingDates = [],
}) {
    confirmAlert({
        closeOnEscape: false,
        closeOnClickOutside: false,
        customUI: ({ onClose }) => (
            <div style={modalStyles.container}>
                <h1 style={modalStyles.title}>{title || t('bookingConfirmationTitle', { desk: deskRemark })}</h1>
                {renderBookingDetails({ t, bookingData, deskRemark, deskDetails, bookingDates })}
                {hasOverlap ? renderOverlapWarningDetails(t, conflictingDates) : null}
                <div style={modalStyles.footer}>
                    <div style={modalStyles.primaryActions}>
                        <button
                            type='button'
                            style={modalStyles.primaryButton}
                            onClick={() => {
                                if (typeof onConfirm === 'function') {
                                    onConfirm();
                                }
                                onClose();
                            }}
                        >
                            {confirmLabel || t('confirm')}
                        </button>
                        {showExportIcs ? (
                            <button
                                type='button'
                                style={modalStyles.primaryButton}
                                onClick={() => {
                                    if (typeof onExportIcs === 'function') {
                                        onExportIcs();
                                    }
                                }}
                            >
                                {exportLabel || t('exportIcs')}
                            </button>
                        ) : null}
                    </div>
                    <button
                        type='button'
                        style={modalStyles.secondaryButton}
                        onClick={() => {
                            if (typeof onCancel === 'function') {
                                onCancel();
                            }
                            onClose();
                        }}
                    >
                        {cancelLabel || t('cancel')}
                    </button>
                </div>
            </div>
        ),
    });
}

function bookingPostRequest(name, bookingData, deskRemark, headers, t, postBookingFunction, options = {}) {
    const { onStart, onFinish, onCancel, onError, deskDetails } = options || {};
    let finished = false;
    let actionInFlight = false;

    const finishOnce = () => {
        if (finished) return;
        finished = true;
        if (typeof onFinish === 'function') {
            onFinish();
        }
    };

    const startAction = () => {
        if (actionInFlight) return false;
        actionInFlight = true;
        return true;
    };

    const finalizeCancel = (draftBookingId) => {
        deleteDraftBooking(headers, draftBookingId, () => {
            if (typeof onCancel === 'function') {
                onCancel();
            }
            finishOnce();
        });
    };

    const finalizeConfirm = (draftBookingId) => {
        confirmDraftBooking(
            headers,
            draftBookingId,
            (confirmedBooking) => {
                toast.success(t('booked'));
                const booking = normalizeBookingForCalendar(
                    bookingData,
                    confirmedBooking?.id ?? draftBookingId,
                    deskRemark
                );
                try {
                    if (typeof postBookingFunction === 'function') {
                        postBookingFunction(booking);
                    }
                } finally {
                    finishOnce();
                }
            },
            (status, data) => {
                console.log(`Failed to confirm booking in ${name}.`, status, data);
                toast.error(getErrorMessage(t, status, data));
                deleteDraftBooking(headers, draftBookingId, () => {
                    if (typeof onError === 'function') {
                        onError(status, data);
                    }
                    finishOnce();
                });
            }
        );
    };

    const openConfirmationModal = (draftBookingId, hasOverlap) => {
        showDeskBookingConfirmation({
            t,
            deskRemark,
            deskDetails,
            bookingData,
            hasOverlap,
            showExportIcs: true,
            onExportIcs: () => exportIcsFile({ bookingData, deskRemark, t }),
            onConfirm: () => {
                if (!startAction()) return;
                finalizeConfirm(draftBookingId);
            },
            onCancel: () => {
                if (!startAction()) return;
                finalizeCancel(draftBookingId);
            },
        });
    };

    if (typeof onStart === 'function') {
        onStart();
    }

    createDraftBooking(
        headers,
        bookingData,
        (draftBooking) => {
            checkDeskBookingOverlap(
                headers,
                draftBooking.id,
                null,
                t,
                (hasOverlap) => {
                    openConfirmationModal(draftBooking.id, hasOverlap);
                },
                () => {
                    openConfirmationModal(draftBooking.id, false);
                }
            );
        },
        (status, data) => {
            console.log(`Failed to create draft booking in ${name}.`, status, data);
            toast.error(getErrorMessage(t, status, data));
            if (typeof onError === 'function') {
                onError(status, data);
            }
            finishOnce();
        }
    );
}

export default bookingPostRequest;
