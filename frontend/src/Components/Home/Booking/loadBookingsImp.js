import { getRequest } from "../../RequestFunctions/RequestFunctions";
/**
 * Lädt die Bookings für einen Desk und parsed sie zu Events.
 */
export const loadBookingsImpl = async (
  clickedDeskId,
  headers,
  t,
  setDeskEvents,
  setEvents
) => {
    console.log('loadBookingsImpl');
  getRequest(
    `${process.env.REACT_APP_BACKEND_URL}/bookings/bookingsForDesk/${clickedDeskId}`,
    headers,
    (bookingsForDeskDTOs) => {
      const bookingEvents = bookingsForDeskDTOs.map((dto) => ({
        start: new Date(dto.day + "T" + dto.begin),
        end: new Date(dto.day + "T" + dto.end),
        title:
            dto.user_id.toString() === localStorage.getItem("userId")
            ? ""
            : dto.visibility
            ? dto.name + " " + dto.surname
            : t("anonymous"),
        id: dto.booking_id,
      }));

      //setDeskEvents(bookingEvents);
      setEvents(prev => {
        if (prev.length === bookingEvents.length) return prev; // keine Änderung
        return bookingEvents;
      });
    },
    () => {
      console.log("Failed to fetch desks in Booking.jsx");
    }
  );
};