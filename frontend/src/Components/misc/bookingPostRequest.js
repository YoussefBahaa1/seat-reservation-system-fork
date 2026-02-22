import { formatDate_yyyymmdd_to_ddmmyyyy } from './formatDate';
import { postRequest, putRequest, deleteRequest } from '../RequestFunctions/RequestFunctions';
import { toast } from 'react-toastify';
import { confirmAlert } from 'react-confirm-alert';
function bookingPostRequest(name, bookingData, deskRemark, headers, t, postBookingFunction) {
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

    postRequest(
        `${process.env.REACT_APP_BACKEND_URL}/bookings`,
        headers.current,
        (data) => {
            confirmAlert({
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
                                    putRequest(
                                        `${process.env.REACT_APP_BACKEND_URL}/bookings/confirm/${data.id}`,
                                        headers.current,
                                        (dat) => {
                                            toast.success(t('booked'));
                                            const booking = {
                                                id: dat.id,
                                                title: `Desk ${dat.deskId}`,
                                                start: new Date(`${dat.day}T${dat.begin}`),
                                                end: new Date(`${dat.day}T${dat.end}`)
                                            }
                                            postBookingFunction(booking);
                                        },
                                        () => {console.log(`Failed to confirm booking in ${name}`);}
                                    );
                                    onClose();
                                }}
                            >
                                {t('yes')}
                            </button>
                            <button
                                type='button'
                                onClick={() => {
                                    deleteRequest(
                                        `${process.env.REACT_APP_BACKEND_URL}/bookings/${data.id}`,
                                        headers,
                                        (_) => {},
                                        () => {console.log('Failed to delete bookings in FreeDesks.jsx.');}
                                    );
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
            })

        },
        () => {console.log('Failed to post booking in Booking.jsx.');},
        JSON.stringify(bookingData)
    );
};
export default bookingPostRequest;
