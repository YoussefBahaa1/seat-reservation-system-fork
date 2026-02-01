import { useRef, useCallback, useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from "moment";
import { useTranslation } from 'react-i18next';
import 'react-confirm-alert/src/react-confirm-alert.css';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import {getRequest, deleteRequest} from '../RequestFunctions/RequestFunctions';
import LayoutPage from '../Templates/LayoutPage';
import LayoutModal from '../Templates/LayoutModal';
import { toast } from 'react-toastify';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@mui/material';

const MyBookings = () => {
  const headers = useRef(JSON.parse(sessionStorage.getItem('headers')));
  const { t, i18n } = useTranslation();
  const [events, setEvents] = useState([]);
  const location = useLocation();
  const navigate = useNavigate();
  // Defines which view is displayed per default. Either day, week or month.
  const [defaultView, setDefaultView] = useState(''); 
  const [selectedBookingEvent, setSelectedBookingEvent] = useState(null);
  // The current booking object (with id, room, desk) 
  const [theBookingEvent, setTheBookingEvent] = useState(null);
  //const userId = localStorage.getItem('userId');
  const localizer = momentLocalizer(moment);

  const fetchBookings = useCallback(
    async () => {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        console.log('userId is null'); 
        return;
      }
      getRequest(
        `${process.env.REACT_APP_BACKEND_URL}/bookings/user/${userId}`, 
        headers.current,
        (bookings) => {
          const calendarEvents = bookings.map((booking) => ({
            id: booking.id,
            title: `${t('desk')} ${booking.desk.remark}`,
            start: new Date(booking.day + 'T' + booking.begin),
            end: new Date(booking.day + 'T' + booking.end),
            desk: booking.desk
          }));
          setEvents(calendarEvents);
        },
        () => {
          console.log('Error fetching bookings');
        }
      );
    },
    [setEvents, t]
  );

  // Fetch defauflt viewmode
  useEffect(()=>{ 
    const userId = localStorage.getItem('userId');
    if (!userId) {
        console.log('userId is null'); 
        return;
    }
    getRequest(
        `${process.env.REACT_APP_BACKEND_URL}/defaults/getDefaultViewForUserId/${userId}`,
        headers.current,
        setDefaultView,
        (errorCode) => { 
          console.log('Fehler beim Abrufen der Buchungen:', errorCode);
          toast.error(t(errorCode+''));          
        },
    );
    
    /*else {
      toast.error('Error fetching default viewmode in FloorSelector.js');
    }*/
  },[t]);

  useEffect(() => {
    moment.locale(i18n.language);
    fetchBookings();
  }, [i18n.language, fetchBookings]); // Hier keine Abhängigkeit auf selectedBookingEvent
  
  useEffect(() => {
    if (selectedBookingEvent) {
      const updatedTitle = `${t('desk')} ${selectedBookingEvent.desk.id}`;
  
      // Nur aktualisieren, wenn sich der Titel tatsächlich ändert
      if (selectedBookingEvent.title !== updatedTitle) {
        setSelectedBookingEvent(prevEvent => ({ ...prevEvent, title: updatedTitle }));
      }
    }
  }, [selectedBookingEvent, t]);

  const handleEventSelect = async (event) => {
    if (event.id !== selectedBookingEvent?.id) {
      setSelectedBookingEvent(event);
      getRequest(
        `${process.env.REACT_APP_BACKEND_URL}/bookings/${event.id}`,
        headers.current,
        setTheBookingEvent,
        () => {throw new Error('Failed to fetch booking details');}        
      );
    }
  };

  const reloadCalendar = async () => {
    fetchBookings();
    setSelectedBookingEvent(null);
  };  

  const deleteBooking = async () => {
    deleteRequest(
      `${process.env.REACT_APP_BACKEND_URL}/bookings/${theBookingEvent.id}`,
      headers.current,
      reloadCalendar,
      () => {console.log('Error deleting booking:');}
    );
  };
  
  function create_helpText() {
    return i18n.language === 'de' ? 'Die Übersicht zu all Ihren getätigten Buchungen, inklusive der Möglichkeit diese zu löschen.' : 'An overview of all your bookings, including the option to delete them.';
  }

  // Get selected date and view from location state
  const selectedDate = location.state?.date ? new Date(location.state.date) : null;
  const initialView = location.state?.view || defaultView.viewModeName;
  const [currentDate, setCurrentDate] = useState(selectedDate || new Date());

  return (
    <LayoutPage
      title={t('myBookings')}
      helpText={create_helpText()}
    >       
      <>
        <LayoutModal
          isOpen={selectedBookingEvent !== null}
          onClose={()=>{setSelectedBookingEvent(null);}}
          submit={deleteBooking}
          submitTxt={t('delete')}
          title={i18n.language === 'de' ? 'Diese Buchung entfernen' : 'Delete this booking'}
        >
          <div>
            {selectedBookingEvent && 
              <div style={{ margin: '20px' }}>
                <p>{t('day')}: {moment(selectedBookingEvent.start).format('DD.MM.YYYY')}</p>
                <p>{t('start')}: {moment(selectedBookingEvent.start).format('HH:mm')}</p>
                <p>{t('end')}: {moment(selectedBookingEvent.end).format('HH:mm')}</p>
                
                {theBookingEvent && theBookingEvent.room && <p>{t('room')}: {theBookingEvent.room.remark}</p> }
                {theBookingEvent && theBookingEvent.desk && <p>{t('desk')}: {/*theBookingEvent.desk.id + ' ' + */theBookingEvent.desk.remark}</p> }
              </div>
            } 
          </div>
        </LayoutModal>
          {initialView && (
            <>
              <Button
                id="mybookings_add_booking_btn"
                sx={{
                  marginBottom: '10px',
                  marginLeft: '30px',
                  padding: '10px 7px',
                  backgroundColor: '#0b5f2a',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '14px',
                  textTransform: 'none',
                  alignSelf: 'flex-start',
                  '&:hover': { backgroundColor: '#b7e0c8' }
                }}
                onClick={() => navigate('/freeDesks', { state: { date: currentDate } })}
              >
                {t('addBooking')}
              </Button>
              <Calendar
                localizer={localizer}
                style={{ height: '100vh' }}
                eventPropGetter={(event) => ({
                  style: {
                    backgroundColor: "#3174ad",
                  },
                })}
                events={events}
                startAccessor='start'
                endAccessor='end'
                //defaultView='week'
                defaultView={initialView}
                defaultDate={selectedDate || new Date()}
                min={new Date(0, 0, 0, 6, 0, 0)} // 6 am
                max={new Date(0, 0, 0, 22, 0, 0)} // 10 pm
                popup={true}
                onSelectEvent={handleEventSelect}
                onNavigate={(date) => setCurrentDate(date)}
                messages={{
                  next: t('next'),
                  previous: t('back'),
                  today: t('today'),
                  month: t('month'),
                  week: t('week'),
                  day: t("day"),
                  agenda: t("agenda"),
                  date: t("date"),
                  time: t("time"),
                  event: t("event"),
                  noEventsInRange: t("noEventsInRange")
              }}
              />
            </>
          )}
          </>
    </LayoutPage>
  );
};

export default MyBookings;
