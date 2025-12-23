import {getRequest} from '../../RequestFunctions/RequestFunctions.js';

export const fetchRoomImpl = (roomId, headers, setRoom) => {
    return getRequest(
        `${process.env.REACT_APP_BACKEND_URL}/rooms/${roomId}`,
        headers,
        setRoom, 
        () => {console.log('Failed to fetch desks in Booking.jsx');}
    );
};