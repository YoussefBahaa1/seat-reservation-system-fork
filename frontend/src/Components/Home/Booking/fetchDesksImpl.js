import {getRequest} from '../../RequestFunctions/RequestFunctions.js';

export const fetchDesksImpl = (roomId, headers, setDesks) => {
    return getRequest(
        `${process.env.REACT_APP_BACKEND_URL}/desks/room/${roomId}`,
        headers,
        setDesks,
        () => { console.log("Failed to fetch desks in Booking.jsx"); }
    );
};