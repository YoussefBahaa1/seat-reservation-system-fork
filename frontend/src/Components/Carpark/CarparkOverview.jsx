import { Box, Button, Divider, Paper, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import LayoutPage from '../Templates/LayoutPage';

const CARPARK_SVG_URL = '/Assets/carpark_overview_ready.svg';

const parseFloatAttr = (el, name, fallback = 0) => {
  const raw = el.getAttribute(name);
  const parsed = raw == null ? NaN : Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getClosestNumericLabel = (labels, x, y) => {
  let best = null;
  let bestDistSq = Infinity;

  for (const label of labels) {
    const dx = label.x - x;
    const dy = label.y - y;
    const distSq = dx * dx + dy * dy;
    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      best = label;
    }
  }

  if (!best) return null;

  // The current SVG layout keeps labels reasonably close to their spots.
  const maxDistSq = 160 * 160;
  return bestDistSq <= maxDistSq ? best : null;
};

const getSpotMetaFromDataset = (rect) => ({
  label: rect.dataset.spotLabel ?? '?',
  type: rect.dataset.spotType ?? 'unknown',
  lit: rect.dataset.spotLit === 'true',
  accessible: rect.dataset.spotAccessible === 'true',
});

const CarparkOverview = () => {
  const { t, i18n } = useTranslation();
  const containerRef = useRef(null);
  const cleanupRef = useRef([]);
  const selectedRectRef = useRef(null);
  const svgRef = useRef(null);

  const [selectedSpot, setSelectedSpot] = useState(null);
  const [hoveredSpot, setHoveredSpot] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    let cancelled = false;

    const cleanupCurrent = () => {
      for (const fn of cleanupRef.current) fn();
      cleanupRef.current = [];
      selectedRectRef.current = null;
      svgRef.current = null;
      if (containerRef.current) containerRef.current.replaceChildren();
    };

    const load = async () => {
      setLoadError('');
      setSelectedSpot(null);
      setHoveredSpot(null);
      cleanupCurrent();

      const resp = await fetch(CARPARK_SVG_URL, { cache: 'no-cache' });
      if (!resp.ok) {
        throw new Error(`Failed to load SVG (${resp.status})`);
      }
      const svgText = await resp.text();

      const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
      const svg = doc.documentElement;
      if (!svg || svg.localName !== 'svg') {
        throw new Error('Invalid SVG document');
      }

      svg.removeAttribute('width');
      svg.removeAttribute('height');
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      svg.style.width = '100%';
      svg.style.height = 'auto';
      svg.style.display = 'block';

      const defs = svg.querySelector('defs') ?? svg.insertBefore(doc.createElementNS(svg.namespaceURI, 'defs'), svg.firstChild);
      const style = doc.createElementNS(svg.namespaceURI, 'style');
      style.textContent = `
        .carpark-spot { cursor: pointer; }
        .carpark-spot.carpark-hover { fill: #90caf9 !important; }
        .carpark-spot.carpark-selected { fill: #1976d2 !important; }
        .carpark-spot:focus { outline: none; }
      `;
      defs.appendChild(style);

      const localCleanup = [];
      const labelTexts = Array.from(svg.querySelectorAll('text'))
        .map((el) => {
          const value = (el.textContent ?? '').trim();
          if (!/^\d+$/.test(value)) return null;
          return {
            value,
            x: parseFloatAttr(el, 'x', NaN),
            y: parseFloatAttr(el, 'y', NaN),
          };
        })
        .filter((v) => v && Number.isFinite(v.x) && Number.isFinite(v.y));

      const spotRects = Array.from(svg.querySelectorAll('rect.stall, rect.empty')).filter((rect) => {
        const w = parseFloatAttr(rect, 'width');
        const h = parseFloatAttr(rect, 'height');
        return w >= 40 && h >= 40;
      });
      for (let idx = 0; idx < spotRects.length; idx += 1) {
        const rect = spotRects[idx];
        rect.classList.add('carpark-spot');

        const x = parseFloatAttr(rect, 'x');
        const y = parseFloatAttr(rect, 'y');
        const w = parseFloatAttr(rect, 'width');
        const h = parseFloatAttr(rect, 'height');
        const cx = x + w / 2;
        const cy = y + h / 2;

        const closest = getClosestNumericLabel(labelTexts, cx, cy);
        const spotLabel = closest?.value ?? `${idx + 1}`;

        const group = rect.closest('g') ?? rect.parentElement;
        const groupTexts = group ? Array.from(group.querySelectorAll('text')) : [];

        const isLit = groupTexts.some((tEl) => (tEl.textContent ?? '').trim().toUpperCase() === 'LIT');
        const isAccessible = groupTexts.some((tEl) => (tEl.textContent ?? '').includes('♿'));

        rect.dataset.spotLabel = spotLabel;
        rect.dataset.spotType = rect.classList.contains('stall') ? 'stall' : 'empty';
        rect.dataset.spotLit = isLit ? 'true' : 'false';
        rect.dataset.spotAccessible = isAccessible ? 'true' : 'false';

        rect.setAttribute('tabindex', '0');
        rect.setAttribute('role', 'button');
        rect.setAttribute(
          'aria-label',
          `Parking spot ${spotLabel}${isAccessible ? ', accessible' : ''}${isLit ? ', LIT' : ''}`
        );

        const setSelectedRect = () => {
          if (selectedRectRef.current && selectedRectRef.current !== rect) {
            selectedRectRef.current.classList.remove('carpark-selected');
          }
          selectedRectRef.current = rect;
          rect.classList.add('carpark-selected');
          setSelectedSpot(getSpotMetaFromDataset(rect));
        };

        const onMouseEnter = () => {
          rect.classList.add('carpark-hover');
          setHoveredSpot(getSpotMetaFromDataset(rect));
        };
        const onMouseLeave = () => {
          rect.classList.remove('carpark-hover');
          setHoveredSpot(null);
        };
        const onClick = (e) => {
          e.stopPropagation();
          setSelectedRect();
        };
        const onKeyDown = (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setSelectedRect();
          }
        };

        rect.addEventListener('mouseenter', onMouseEnter);
        rect.addEventListener('mouseleave', onMouseLeave);
        rect.addEventListener('click', onClick);
        rect.addEventListener('keydown', onKeyDown);

        localCleanup.push(() => {
          rect.removeEventListener('mouseenter', onMouseEnter);
          rect.removeEventListener('mouseleave', onMouseLeave);
          rect.removeEventListener('click', onClick);
          rect.removeEventListener('keydown', onKeyDown);
        });
      }

      const onSvgClick = () => {
        if (selectedRectRef.current) {
          selectedRectRef.current.classList.remove('carpark-selected');
        }
        selectedRectRef.current = null;
        setSelectedSpot(null);
      };
      svg.addEventListener('click', onSvgClick);
      localCleanup.push(() => svg.removeEventListener('click', onSvgClick));

      if (cancelled) {
        for (const fn of localCleanup) fn();
        return;
      }

      svgRef.current = svg;
      cleanupRef.current = localCleanup;
      containerRef.current?.appendChild(svg);
    };

    load().catch((err) => {
      if (cancelled) return;
      setLoadError(err instanceof Error ? err.message : 'Failed to load carpark overview.');
    });

    return () => {
      cancelled = true;
      cleanupCurrent();
    };
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;
    svgRef.current.style.transform = `scale(${zoom})`;
    svgRef.current.style.transformOrigin = '0 0';
  }, [zoom]);

  const spotForPanel = selectedSpot ?? hoveredSpot;

  return (
    <LayoutPage
      title={t('carparkTitle')}
      helpText={t('carparkHelp')}
      useGenericBackButton={true}
      withPaddingX={true}
    >
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ flex: '1 1 720px', minWidth: 320 }}>
          <Paper variant="outlined" sx={{ p: 1 }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', px: 1, py: 0.5 }}>
              <Typography variant="body2" sx={{ flex: 1 }}>
                {t('carparkHintClick')}
              </Typography>
              <Button size="small" variant="outlined" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)))}>
                –
              </Button>
              <Button size="small" variant="outlined" onClick={() => setZoom((z) => Math.min(2, +(z + 0.1).toFixed(2)))}>
                +
              </Button>
              <Button size="small" variant="text" onClick={() => setZoom(1)} disabled={zoom === 1}>
                {t('carparkReset')}
              </Button>
            </Box>
            <Divider />
            <Box
              ref={containerRef}
              sx={{
                overflow: 'auto',
                maxHeight: 600,
                backgroundColor: '#fff',
              }}
            />
            {loadError && (
              <Typography variant="body2" color="error" sx={{ px: 1, py: 1 }}>
                {loadError}
              </Typography>
            )}
          </Paper>
        </Box>

        <Box sx={{ flex: '0 1 320px', minWidth: 280 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              {t('carparkDetails')}
            </Typography>
            {!spotForPanel && (
              <Typography variant="body2" color="text.secondary">
                {t('carparkNoSelection')}
              </Typography>
            )}
            {spotForPanel && (
              <>
                <Typography variant="body1" sx={{ fontWeight: 700 }}>
                  {t('carparkSpot')} {spotForPanel.label}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t(spotForPanel.type === 'stall' ? 'carparkTypeStall' : 'carparkTypeEmpty')}
                </Typography>
                <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {spotForPanel.lit && <Typography variant="body2">LIT</Typography>}
                  {spotForPanel.accessible && <Typography variant="body2">♿</Typography>}
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {selectedSpot ? t('carparkSelected') : t('carparkHover')}
                </Typography>
              </>
            )}
            <Divider sx={{ my: 2 }} />
            <Typography variant="body2" color="text.secondary">
              {i18n.language === 'de'
                ? 'Hinweis: Diese Seite ist aktuell nur eine interaktive Übersicht (ohne Backend-Buchung).'
                : 'Note: This page is currently just an interactive overview (no backend booking yet).'}
            </Typography>
          </Paper>
        </Box>
      </Box>
    </LayoutPage>
  );
};

export default CarparkOverview;
