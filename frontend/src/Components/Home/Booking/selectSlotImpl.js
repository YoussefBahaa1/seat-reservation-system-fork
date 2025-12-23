import { toast } from "react-toastify";

export const selectSlotImpl = (data, deskEvents, events, currentEvent, setEvents, setEvent, t) => {
  if (!data) return;
    
  const startTime = new Date(data.start);
  const endTime = new Date(data.end);

  // Dauer in ms
  const duration = endTime - startTime;

  // Mindestdauer prüfen (hier: 2 Stunden)
  if (duration < 2 * 60 * 60 * 1000) {
    toast.warning(t("minimum"));
    return;
  }

  // Aktuelles Event aus der Liste filtern
  const updatedEvents = events.filter(
    (existingEvent) => existingEvent.id !== currentEvent?.id
  );

  // Überschneidungen prüfen
  const isOverlap = updatedEvents.some(
    (existingEvent) =>
      (existingEvent.start <= startTime && startTime < existingEvent.end) ||
      (existingEvent.start < endTime && endTime <= existingEvent.end) ||
      (startTime <= existingEvent.start && existingEvent.end <= endTime)
  );

  if (isOverlap) {
    toast.warning(t("overlap"));
    return;
  }

  const newEvent = {
    start: data.start,
    end: data.end,
    id: 1, // evtl. später dynamisch vergeben?
  };

  setEvents([...deskEvents, newEvent]);
  setEvent(newEvent);
};