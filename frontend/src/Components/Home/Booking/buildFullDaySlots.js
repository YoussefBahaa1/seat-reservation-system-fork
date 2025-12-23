export function buildFullDaySlots(date, minStartTime, maxEndTime) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
  
    return {
      start: new Date(year, month, day, minStartTime, 0, 0),
      end: new Date(year, month, day, maxEndTime, 0, 0),
      action: 'select',
      slots: Array.from(
        { length: maxEndTime - minStartTime + 1 }, // Bugfix: richtige Länge
        (_, i) => new Date(year, month, day, minStartTime + i, 0, 0)
      ),
    };
  }