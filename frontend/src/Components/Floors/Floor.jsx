import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import FloorImage from '../FloorImage/FloorImage.jsx';
import { useTranslation } from 'react-i18next';
import LayoutPage from '../Templates/LayoutPage.jsx';

const Floor = () => {
  const { t, i18n } = useTranslation();
  const [room, setRoom] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { date } = location.state || {};

  /**
   * Set the floor on which we want to create an new room with x- and y-coords.
   * @param {*} data Object with properties floor, room, x, y. 
   */
  const handleChildData = (data) => {
    if (!data || data.room === '' || data.room.id === room.id) 
      return;
    setRoom(data.room);
    const roomId = data.room.id;
    navigate('/desks', { state: { roomId, date } });
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
