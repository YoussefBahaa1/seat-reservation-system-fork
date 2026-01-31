import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/de';
import './Home.css';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useTranslation } from 'react-i18next';
import { postRequest } from '../RequestFunctions/RequestFunctions';
import LayoutPage from '../Templates/LayoutPage';
import { toast } from 'react-toastify';

const Home = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [now, setNow] = useState(moment());
  const headers = useRef(JSON.parse(sessionStorage.getItem('headers')));

  const handleSelectSlot = ({ start }) => {
    navigate("/floor", { state: { date: start } });
  };

  // Generate days of the month and fetch bookings
  const generateMonthDays = useCallback(
    async (date) => {
      const currentMonth = moment(date).startOf('month');
      const daysInMonth = [];
      const eventsForMonth = [];
  
      // Erstellen der Tage des Monats
      for (let i = 0; i < currentMonth.daysInMonth(); i++) {
        const day = currentMonth.clone().add(i, 'days');
        daysInMonth.push(day.format('YYYY-MM-DD'));
      }
  
      // Load bookings for the month
      postRequest(
        `${process.env.REACT_APP_BACKEND_URL}/bookings/getAllBookingsForDate`,
        headers.current,
        (data) => {
          for (const day in data) {
            const newEvent = {
              start: moment(day).startOf('day').toDate(),
              end: moment(day).endOf('day').toDate(),
              title: `${t('bookingsSum')}: ${data[day]}`,
              allDay: true,
              resource: { count: data[day] }
            };
            eventsForMonth.push(newEvent);
          }
          setEvents(eventsForMonth);  // Ereignisse für den Monat setzen
          setNow(date);  // Aktuelles Datum setzen
        },
        (errorCode) => { 
          console.log('Fehler beim Abrufen der Buchungen:', errorCode);
          toast.error(t(errorCode+''));          
        },
        JSON.stringify(daysInMonth)  // Tage des Monats an den Server senden
      );
    },
    [headers, t, setEvents, setNow]  // Abhängigkeiten, die sich ändern könnten
  );

  // Call generateMonthDays when changes occur
  useEffect(() => {
    generateMonthDays(now);
  }, [t, generateMonthDays, now]);

  // Handle different month navigation
  const handleNavigate = (newDate, view) => {
    if (view === 'month') {
      generateMonthDays(newDate);
    }
  };

  const localizer = momentLocalizer(moment);

  useEffect(() => {
    // Change moment locale whenever language changes
    moment.locale(i18n.language);
  }, [i18n.language]);

  const BookingEvent = ({ event }) => {
    const count = event?.resource?.count ?? 0;
    const date = event?.start;

    const handleAddBookingClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      navigate("/floor", { state: { date } });
    };

    return (
      <div className="home-booking-event">
        <button
          type="button"
          className="home-add-booking-btn"
          onClick={handleAddBookingClick}
        >
          {t('addBooking')}
        </button>
        <div className="home-bookings-sum">
          {t('bookingsSum')}: {count}
        </div>
      </div>
    );
  };

  return (
    <LayoutPage
      title={t('chooseDate')}
      helpText={''}
    >
      <Calendar
        data-testid='abc'
        localizer={localizer}
        events={events}
        startAccessor='start'
        endAccessor='end'
        views={['month']}
        style={{ height: 500 }}
        onSelectSlot={handleSelectSlot}
        selectable={true}
        onKeyPressEvent={(data) => console.log(data)}
        messages={{
          next: t('next'),
          previous: t('back'),
          today: t('today'),
          month: t('month'),
          week: t('week'),
          day: t('day'),
          agenda: t('agenda'),
          noEventsInRange: t('noEventsInRange')
        }}
        onNavigate={handleNavigate}
        components={{ event: BookingEvent }}
      />
    </LayoutPage>
  );


  /*return (
    <Box sx={{
      width: '100vw',
      height: '100vh',
      backgroundColor: 'aliceblue',
      display: 'flex'
    }}>
      <div>
        <SidebarComponent />
      </div>
      <Box sx={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#ffffff'
      }}>
        <Box sx={{display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: '15px',
          paddingBottom: '15px'}}
        >
          <h1>{t("chooseDate")}</h1>
        </Box>
        <hr className="gradient" />
        <div data-testid='Home_Calendar'>
          <Calendar
            
            data-testid='abc'
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            views={["month"]}
            style={{ height: 500 }}
            onSelectSlot={handleSelectSlot}
            selectable={true}
            onKeyPressEvent={(data) => console.log(data)}
            messages={{
              next: t("next"),
              previous: t("back"),
              today: t("today"),
              month: t("month"),
              week: t("week"),
              day: t("day"),
              agenda: t("agenda"),
              noEventsInRange: t("noEventsInRange")
           }}
           onNavigate={handleNavigate}
          />
        </div>
      </Box>
    </Box>
  );*/
};

export default Home;
