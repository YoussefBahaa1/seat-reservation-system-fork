import { formatDate_yyyymmdd_to_ddmmyyyy } from './formatDate';
import { postRequest, putRequest, deleteRequest } from '../RequestFunctions/RequestFunctions';
import { toast } from 'react-toastify';
import { confirmAlert } from 'react-confirm-alert';
function bookingPostRequest(name, bookingData, deskRemark, headers, t, postBookingFunction) {
    postRequest(
        `${process.env.REACT_APP_BACKEND_URL}/bookings`,
        headers.current,
        (data) => {
            confirmAlert({
                title: t('desk') + " " + deskRemark,
                message: t('date') + " " + formatDate_yyyymmdd_to_ddmmyyyy(bookingData.day) + " " + t("from") + " " + bookingData.begin.slice(0,5) + " " + t("to") + " " + bookingData.end.slice(0,5),
                buttons: [
                    {
                        label: t('yes'),
                        onClick: async () => {
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
                        }
                    },
                    {
                        label: t('no'),
                        onClick: async () => {
                            deleteRequest(
                                `${process.env.REACT_APP_BACKEND_URL}/bookings/${data.id}`,
                                headers,
                                (_) => {},
                                () => {console.log('Failed to delete bookings in FreeDesks.jsx.');}
                            )
                            },
                        },
                    ],
                    
                })

        },
        () => {console.log('Failed to post booking in Booking.jsx.');},
        JSON.stringify(bookingData)
    );
};
export default bookingPostRequest;
