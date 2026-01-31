import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';

import LayoutPage from '../Templates/LayoutPage.jsx';
import HtmlTooltip from '../FloorImage/HtmlTooltip.jsx';
import CreateDatePicker from '../misc/CreateDatePicker.jsx';
import { getRequest } from '../RequestFunctions/RequestFunctions.js';
import { PARKING_IMAGE_SRC, PARKING_SPACES_LAYOUT } from './parkingLayout.js';
import { useNavigate } from 'react-router-dom';

const COLOR_MAP = {
  green: '#2e7d32',
  yellow: '#f9a825',
  red: '#c62828',
  grey: '#757575',
};

const typeLabelKey = (parkingType) => {
  switch (parkingType) {
    case 'ACCESSIBLE':
      return 'parkingTypeAccessible';
    case 'EV_CHARGING':
      return 'parkingTypeEvCharging';
    case 'SPECIAL':
      return 'parkingTypeSpecial';
    default:
      return 'parkingTypeStandard';
  }
};

const availabilityLabelKey = (availability) => {
  switch (availability) {
    case 'BLOCKED':
      return 'parkingBlocked';
    case 'OCCUPIED':
      return 'parkingOccupied';
    case 'PARTIAL':
      return 'parkingPartial';
    default:
      return 'parkingAvailable';
  }
};

const Parking = () => {
  const headers = useRef(JSON.parse(sessionStorage.getItem('headers')));
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [overview, setOverview] = useState(null);

  const dateString = useMemo(() => format(selectedDate, 'yyyy-MM-dd'), [selectedDate]);

  useEffect(() => {
    getRequest(
      `${process.env.REACT_APP_BACKEND_URL}/parking/overview/${dateString}`,
      headers.current,
      setOverview,
      (code) => console.log('Failed to fetch parking overview', code)
    );
  }, [dateString]);

  const byCode = useMemo(() => {
    const map = new Map();
    (overview?.spaces ?? []).forEach((s) => map.set(s.code, s));
    return map;
  }, [overview]);

  const title = i18n.language === 'de' ? 'Parkplatzreservierung' : 'Parking reservations';

  return (
    <LayoutPage title={title} helpText={''} useGenericBackButton withPaddingX>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', marginBottom: 2 }}>
        <Box sx={{ width: 280 }}>
          <CreateDatePicker
            date={selectedDate}
            setter={setSelectedDate}
            label={t('date')}
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Typography variant="body2" sx={{ color: COLOR_MAP.green }}>{t('parkingAvailable')}</Typography>
          <Typography variant="body2" sx={{ color: COLOR_MAP.yellow }}>{t('parkingPartial')}</Typography>
          <Typography variant="body2" sx={{ color: COLOR_MAP.red }}>{t('parkingOccupied')}</Typography>
          <Typography variant="body2" sx={{ color: COLOR_MAP.grey }}>{t('parkingBlocked')}</Typography>
        </Box>
      </Box>

      <Box sx={{ position: 'relative', display: 'inline-block', maxWidth: '100%' }}>
        <img
          src={PARKING_IMAGE_SRC}
          alt="parking"
          style={{ maxWidth: '100%', maxHeight: '650px', display: 'block' }}
        />

        {PARKING_SPACES_LAYOUT.map((space) => {
          const data = byCode.get(space.code);
          const color = COLOR_MAP[data?.color ?? 'grey'];
          const tooltipBookings = (data?.detailsHidden || !data?.bookings?.length) ? [] : data.bookings;

          const tooltip = (
            <Box sx={{ minWidth: 220 }}>
              <Typography variant="subtitle2">
                {space.code} · {t(typeLabelKey(data?.parkingType))}
              </Typography>
              <Typography variant="body2" sx={{ marginBottom: 1 }}>
                {t(availabilityLabelKey(data?.availability))}
              </Typography>

              {!data?.detailsHidden && (
                tooltipBookings.length ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {tooltipBookings.map((b) => {
                      const begin = (b.begin ?? '').toString().slice(0, 5);
                      const end = (b.end ?? '').toString().slice(0, 5);
                      const displayName =
                        b.userId?.toString() === localStorage.getItem('userId')
                          ? ''
                          : b.visibility
                          ? `${b.name ?? ''} ${b.surname ?? ''}`.trim()
                          : t('anonymous');
                      const pending = b.bookingInProgress ? ` · ${t('parkingPending')}` : '';
                      return (
                        <Typography key={b.bookingId} variant="body2">
                          {begin}–{end} {displayName}{pending}
                        </Typography>
                      );
                    })}
                  </Box>
                ) : (
                  <Typography variant="body2">{t('parkingNoReservations')}</Typography>
                )
              )}
            </Box>
          );

          const onClick = () => {
            if (!overview?.roomId || !data?.deskId) return;
            if (data?.availability === 'BLOCKED') return;
            navigate('/desks', {
              state: {
                roomId: overview.roomId,
                date: selectedDate,
                preselectedDeskId: data.deskId,
                preselectedDeskRemark: space.code,
                hideDeskList: true,
              },
            });
          };

          const tile = (
            <Box
              onClick={onClick}
              sx={{
                position: 'absolute',
                left: `${space.left}%`,
                top: `${space.top}%`,
                width: `${space.width}%`,
                height: `${space.height}%`,
                backgroundColor: color,
                opacity: 0.75,
                borderRadius: 1,
                border: '1px solid rgba(0,0,0,0.35)',
                cursor: data?.availability === 'BLOCKED' ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                userSelect: 'none',
                '&:hover': { opacity: 0.9 },
              }}
            >
              <Typography variant="caption" sx={{ color: '#fff', fontWeight: 700 }}>
                {space.code}
              </Typography>
            </Box>
          );

          return (
            <HtmlTooltip key={space.code} title={tooltip}>
              {tile}
            </HtmlTooltip>
          );
        })}
      </Box>
    </LayoutPage>
  );
};

export default Parking;
