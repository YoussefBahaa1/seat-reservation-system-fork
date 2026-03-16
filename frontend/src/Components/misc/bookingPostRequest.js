import { formatDate_yyyymmdd_to_ddmmyyyy } from './formatDate';
import { postRequest, putRequest, deleteRequest, downloadRequest } from '../RequestFunctions/RequestFunctions';
import { toast } from 'react-toastify';
import { confirmAlert } from 'react-confirm-alert';
import { colorVars } from '../../theme';

const overlapWarningBoxStyles = {
    marginTop: '12px',
    padding: '12px 14px',
    borderRadius: '8px',
    backgroundColor: colorVars.surface.warning,
    border: `1px solid ${colorVars.border.warning}`,
    textAlign: 'left',
};

const overlapWarningTitleStyles = {
    margin: '0 0 4px 0',
    fontWeight: 700,
    color: colorVars.text.warning,
};

const overlapWarningTextStyles = {
    margin: 0,
    color: colorVars.text.warning,
    lineHeight: 1.4,
};

function renderOverlapWarningBox(t) {
    return (
        <div style={overlapWarningBoxStyles}>
            <p style={overlapWarningTitleStyles}>{t('warning')}</p>
            <p style={overlapWarningTextStyles}>{t('bookingOverlapOtherDeskWarning')}</p>
        </div>
    );
}

export function checkDeskBookingOverlap(headers, bookingId, ignoreBookingId, t, onSuccess, onFail) {
    postRequest(
        `${process.env.REACT_APP_BACKEND_URL}/bookings/overlap-check`,
        headers.current,
        (data) => {
            onSuccess(Boolean(data?.hasOverlap));
        },
        () => {
            toast.error(t('bookingOverlapCheckFailed'));
            if (typeof onFail === 'function') {
                onFail();
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
    bookingData,
    hasOverlap,
    onConfirm,
    onCancel,
    title,
}) {
    confirmAlert({
        customUI: ({ onClose }) => (
            <div className='react-confirm-alert-body'>
                <h1>{title || `${t('desk')} ${deskRemark}`}</h1>
                <p>
                    {t('date')} {formatDate_yyyymmdd_to_ddmmyyyy(bookingData.day)} {t('from')} {bookingData.begin} {t('to')} {bookingData.end}
                </p>
                {hasOverlap && (
                    renderOverlapWarningBox(t)
                )}
                <div className='react-confirm-alert-button-group'>
                    <button
                        type='button'
                        onClick={() => {
                            if (typeof onConfirm === 'function') {
                                onConfirm();
                            }
                            onClose();
                        }}
                    >
                        {hasOverlap ? t('continue') : t('yes')}
                    </button>
                    <button
                        type='button'
                        onClick={() => {
                            if (typeof onCancel === 'function') {
                                onCancel();
                            }
                            onClose();
                        }}
                    >
                        {hasOverlap ? t('cancel') : t('no')}
                    </button>
                </div>
            </div>
        )
    });
}

function bookingPostRequest(name, bookingData, deskRemark, headers, t, postBookingFunction, options = {}) {
    const { onStart, onFinish } = options || {};
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
        if (status === 400 && data?.error) return data.error;
        if (status === 400 && data?.message) return data.message;
        if (status === 401) return t('tokenInvalid');
        if (status === 409 && data?.error) return data.error;
        if (status === 409) return t('overlap');
        return t('httpOther');
    };

    const startAction = () => {
        if (actionInFlight) return false;
        actionInFlight = true;
        return true;
    };

    if (typeof onStart === 'function') {
        onStart();
    }

    postRequest(
        `${process.env.REACT_APP_BACKEND_URL}/bookings`,
        headers.current,
        (data) => {
            checkDeskBookingOverlap(
                headers,
                data.id,
                null,
                t,
                (hasOverlap) => {
                    confirmAlert({
                        customUI: ({ onClose }) => (
                            <div className='react-confirm-alert-body'>
                                <h1>{t('desk')} {deskRemark}</h1>
                                <p>
                                    {t('date')} {formatDate_yyyymmdd_to_ddmmyyyy(bookingData.day)} {t('from')} {bookingData.begin} {t('to')} {bookingData.end}
                                </p>
                                {hasOverlap && (
                                    renderOverlapWarningBox(t)
                                )}
                                <div className='react-confirm-alert-button-group'>
                                    <button
                                        type='button'
                                        onClick={() => {
                                            if (!startAction()) return;
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
                                                    };
                                                    try {
                                                        if (typeof postBookingFunction === 'function') {
                                                            postBookingFunction(booking);
                                                        }
                                                    } finally {
                                                        finishOnce();
                                                    }
                                                },
                                                () => {
                                                    console.log(`Failed to confirm booking in ${name}`);
                                                    finishOnce();
                                                }
                                            );
                                            onClose();
                                        }}
                                    >
                                        {hasOverlap ? t('continue') : t('yes')}
                                    </button>
                                    <button
                                        type='button'
                                        onClick={() => {
                                            if (!startAction()) return;
                                            deleteRequest(
                                                `${process.env.REACT_APP_BACKEND_URL}/bookings/${data.id}`,
                                                headers.current,
                                                (_) => {
                                                    finishOnce();
                                                },
                                                () => {
                                                    console.log('Failed to delete bookings in FreeDesks.jsx.');
                                                    finishOnce();
                                                }
                                            );
                                            onClose();
                                        }}
                                    >
                                        {hasOverlap ? t('cancel') : t('no')}
                                    </button>
                                    <button
                                        type='button'
                                        onClick={() => {
                                            downloadRequest(
                                                `${process.env.REACT_APP_BACKEND_URL}/bookings/${data.id}/ics`,
                                                headers.current,
                                                `booking-${data.id}.ics`,
                                                () => {
                                                    console.log(`Failed to export booking ICS in ${name}`);
                                                    toast.error(t('httpOther'));
                                                }
                                            );
                                        }}
                                    >
                                        {t('exportIcs')}
                                    </button>
                                </div>
                            </div>
                        )
                    });
                },
                () => {
                    if (!startAction()) return;
                    deleteRequest(
                        `${process.env.REACT_APP_BACKEND_URL}/bookings/${data.id}`,
                        headers.current,
                        () => {
                            finishOnce();
                        },
                        () => {
                            finishOnce();
                        }
                    );
                }
            );
        },
        (status, data) => {
            console.log('Failed to post booking in Booking.jsx.', status, data);
            toast.error(getErrorMessage(status, data));
            finishOnce();
        },
        JSON.stringify(bookingData)
    );
};
export default bookingPostRequest;
