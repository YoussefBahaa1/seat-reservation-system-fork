import { formatDate_yyyymmdd_to_ddmmyyyy } from './formatDate';
import { postRequest } from '../RequestFunctions/RequestFunctions';
import { toast } from 'react-toastify';
import { confirmAlert } from 'react-confirm-alert';

function bookingPostRequest(name, bookingData, deskRemark, headers, t, postBookingFunction, options = {}) {
    const { onStart, onFinish, onCancel, onError } = options || {};
    let finished = false;
    let actionInFlight = false;

    const finishOnce = () => {
        if (finished) return;
        finished = true;
        if (typeof onFinish === 'function') {
            onFinish();
        }
    };

    const getErrorMessage = (status, data) => {
        if (status === 409 && typeof data?.error === 'string' && data.error.toLowerCase().includes('currently being booked')) {
            return t('currentlyBeingBooked');
        }
        if (data?.error) return data.error;
        if (data?.message) return data.message;
        if (status === 401) return t('tokenInvalid');
        if (status === 409) return t('overlap');
        return t('httpOther');
    };

    const startAction = () => {
        if (actionInFlight) return false;
        actionInFlight = true;
        return true;
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

    const submitBooking = () => {
        postRequest(
            `${process.env.REACT_APP_BACKEND_URL}/bookings`,
            headers.current,
            (dat) => {
                toast.success(t('booked'));
                const booking = {
                    id: dat.id,
                    title: `Desk ${dat.deskId}`,
                    start: new Date(`${dat.day}T${dat.begin}`),
                    end: new Date(`${dat.day}T${dat.end}`)
                };
                try {
                    if (typeof postBookingFunction === 'function') {
                        postBookingFunction(booking);
                    }
                } finally {
                    finishOnce();
                }
            },
            (status, data) => {
                console.log(`Failed to post booking in ${name}.`, status, data);
                toast.error(getErrorMessage(status, data));
                if (typeof onError === 'function') {
                    onError(status, data);
                }
                finishOnce();
            },
            JSON.stringify(bookingData)
        );
    };

    if (typeof onStart === 'function') {
        onStart();
    }

    const exportIcs = () => {
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

    confirmAlert({
        closeOnEscape: false,
        closeOnClickOutside: false,
        customUI: ({ onClose }) => (
            <div className='react-confirm-alert-body'>
                <h1>{t('desk')} {deskRemark}</h1>
                <p>
                    {t('date')} {formatDate_yyyymmdd_to_ddmmyyyy(bookingData.day)} {t('from')} {bookingData.begin} {t('to')} {bookingData.end}
                </p>
                <div className='react-confirm-alert-button-group'>
                    <button
                        type='button'
                        onClick={() => {
                            if (!startAction()) return;
                            submitBooking();
                            onClose();
                        }}
                    >
                        {t('yes')}
                    </button>
                    <button
                        type='button'
                        onClick={() => {
                            if (!startAction()) return;
                            if (typeof onCancel === 'function') {
                                onCancel();
                            }
                            finishOnce();
                            onClose();
                        }}
                    >
                        {t('no')}
                    </button>
                    <button
                        type='button'
                        onClick={() => exportIcs()}
                    >
                        {t('exportIcs')}
                    </button>
                </div>
            </div>
        )
    });
};
export default bookingPostRequest;
