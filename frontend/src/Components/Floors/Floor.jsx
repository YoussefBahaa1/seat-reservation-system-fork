import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import FloorImage from '../FloorImage/FloorImage.jsx';
import { useTranslation } from 'react-i18next';
import LayoutPage from '../Templates/LayoutPage.jsx';

const FLOOR_CONTEXT_KEY = 'floorNavigationContext';
const BOOKING_CONTEXT_KEY = 'bookingNavigationContext';

const toValidDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
};

const getStoredFloorContext = () => {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(FLOOR_CONTEXT_KEY) || 'null');
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

const Floor = () => {
  const { t, i18n } = useTranslation();
  const [room, setRoom] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const storedFloorContext = getStoredFloorContext();
  const stateDate = toValidDate(location.state?.date);
  const storedFloorDate = toValidDate(storedFloorContext?.date);
  const storedHomeDate = toValidDate(sessionStorage.getItem('homeSelectedDate'));
  const date = stateDate || storedFloorDate || storedHomeDate || new Date();
  const dateIso = date.toISOString();

  useEffect(() => {
    sessionStorage.setItem(FLOOR_CONTEXT_KEY, JSON.stringify({
      date: dateIso,
    }));
  }, [dateIso]);

  /**
   * Set the floor on which we want to create an new room with x- and y-coords.
   * @param {*} data Object with properties floor, room, x, y. 
   */
  const handleChildData = (data) => {
    if (!data || data.room === '' || data.room.id === room.id) 
      return;
    setRoom(data.room);
    const roomId = data.room.id;
    sessionStorage.setItem(FLOOR_CONTEXT_KEY, JSON.stringify({
      date: dateIso,
      roomId,
      floorId: data.floor?.floor_id || null,
      buildingId: data.floor?.building?.id || null,
    }));
    sessionStorage.setItem(BOOKING_CONTEXT_KEY, JSON.stringify({
      roomId,
      date: dateIso,
    }));
    navigate('/desks', {
      state: {
        roomId,
        date,
      },
    });
  };

  return (
    <LayoutPage
      title={i18n.language === 'de' ? 'Raumauswahl' : 'Selection of rooms'}
      helpText={t('helpChooseRoom')}
      useGenericBackButton={true}
      withPaddingX={true}
    >
      <FloorImage
        sendDataToParent={handleChildData}
        click_freely={false}
      />
    </LayoutPage>
  );
};

export default Floor;
