import { useEffect, useRef, useState, useCallback } from 'react';
import { Box, Card, CardActions, CardContent, Button, Typography, Stack, IconButton, Tooltip, Divider } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { FaStar, FaRegStar } from 'react-icons/fa';

import LayoutPage from '../Templates/LayoutPage.jsx';
import { getRequest, deleteRequest } from '../RequestFunctions/RequestFunctions';

/**
 * Full-screen page listing the current user's favourites.
 * Currently supports rooms; parking can be added later without changing the shape.
 */
const Favourites = () => {
  const { t } = useTranslation();
  const headers = useRef(JSON.parse(sessionStorage.getItem('headers')));
  const navigate = useNavigate();
  const userId = localStorage.getItem('userId');

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadFavourites = useCallback(() => {
    if (!userId) return;
    setLoading(true);
    getRequest(
      `${process.env.REACT_APP_BACKEND_URL}/favourites/${userId}`,
      headers.current,
      (data) => {
        setRooms(Array.isArray(data) ? data : []);
        setLoading(false);
      },
      () => {
        setRooms([]);
        setLoading(false);
      }
    );
  }, [userId]);

  useEffect(() => {
    loadFavourites();
  }, [loadFavourites]);

  const goToBooking = (room) => {
    navigate('/desks', { state: { roomId: room.roomId, date: new Date() } });
  };

  const removeFavourite = (roomId) => {
    if (!userId) return;
    deleteRequest(
      `${process.env.REACT_APP_BACKEND_URL}/favourites/${userId}/room/${roomId}`,
      headers.current,
      () => {
        toast.success(t('removeFavourite'));
        setRooms((prev) => prev.filter((r) => r.roomId !== roomId));
      },
      () => toast.error(t('favouriteToggleError'))
    );
  };

  const renderRooms = () => {
    if (loading) return <Typography>{t('loading')}...</Typography>;
    if (!rooms.length) {
      return (
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          {t('favouritesEmpty')}
        </Typography>
      );
    }

    return (
      <Stack spacing={2}>
        {rooms.map((room) => (
          <Card key={room.roomId} variant="outlined" sx={{ borderRadius: 2, boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }}>
            <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
              <Box>
                <Typography variant="h6">{room.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {room.building}{room.building && room.floor ? ' · ' : ''}{room.floor}
                </Typography>
              </Box>
              <CardActions sx={{ gap: 1 }}>
                <Button
                  variant="contained"
                  onClick={() => goToBooking(room)}
                  sx={{
                    backgroundColor: '#008444',
                    borderRadius: '8px',
                    color: '#fff',
                    px: 2.5,
                    '&:hover': { backgroundColor: '#006f38' },
                  }}
                >
                  {t('book')}
                </Button>
                <Tooltip title={t('removeFavourite')}>
                  <IconButton color="warning" onClick={() => removeFavourite(room.roomId)}>
                    <FaStar />
                  </IconButton>
                </Tooltip>
              </CardActions>
            </CardContent>
          </Card>
        ))}
      </Stack>
    );
  };

  return (
    <LayoutPage
      title={t('favourites')}
      helpText={t('favouritesHelper')}
      withPaddingX
      useGenericBackButton
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, px: 2 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
            {t('rooms')}
          </Typography>
          {renderRooms()}
        </Box>
        <Divider />
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
            {t('parking')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t('parkingComingSoon')}
          </Typography>
        </Box>
      </Box>
    </LayoutPage>
  );
};

export default Favourites;
