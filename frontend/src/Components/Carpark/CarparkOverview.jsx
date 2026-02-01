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

const isPointInRect = (x, y, rectX, rectY, rectW, rectH) =>
  x >= rectX && x <= rectX + rectW && y >= rectY && y <= rectY + rectH;

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
  special: rect.dataset.spotSpecial === 'true',
  selectable: rect.dataset.spotSelectable !== 'false',
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

      // Make sure labels don't intercept pointer events (so hover/click behavior is driven by the spot rects).
      for (const textEl of Array.from(svg.querySelectorAll('text'))) {
        textEl.style.pointerEvents = 'none';
      }

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
      const allTextNodes = Array.from(svg.querySelectorAll('text'))
        .map((el) => ({
          value: (el.textContent ?? '').trim(),
          x: parseFloatAttr(el, 'x', NaN),
          y: parseFloatAttr(el, 'y', NaN),
        }))
        .filter((t) => t.value !== '' && Number.isFinite(t.x) && Number.isFinite(t.y));

      const labelTexts = allTextNodes.filter((t) => /^\d+$/.test(t.value));
      const litTexts = allTextNodes.filter((t) => t.value.toUpperCase() === 'LIT');
      const accessibleTexts = allTextNodes.filter(
        (t) => t.value.includes('♿') || t.value.includes('â™ż')
      );

      // Only "stall" rectangles are selectable/hoverable (blank "empty" spots are view-only).
      const spotRects = Array.from(svg.querySelectorAll('rect.stall')).filter((rect) => {
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
        const isSpecial = spotLabel === '23';
        const isSelectable = !isSpecial;

        const isLit = litTexts.some((t) => isPointInRect(t.x, t.y, x, y, w, h));
        const isAccessible = accessibleTexts.some((t) => isPointInRect(t.x, t.y, x, y, w, h));

        rect.dataset.spotLabel = spotLabel;
        rect.dataset.spotType = 'stall';
        rect.dataset.spotLit = isLit ? 'true' : 'false';
        rect.dataset.spotAccessible = isAccessible ? 'true' : 'false';
        rect.dataset.spotSpecial = isSpecial ? 'true' : 'false';
        rect.dataset.spotSelectable = isSelectable ? 'true' : 'false';

        rect.setAttribute('tabindex', isSelectable ? '0' : '-1');
        rect.setAttribute('role', isSelectable ? 'button' : 'img');
        if (!isSelectable) {
          rect.style.cursor = 'default';
        }
        rect.setAttribute(
          'aria-label',
          `Parking spot ${spotLabel}${isSpecial ? ', special case' : isAccessible ? ', accessible' : ', standard'}${isLit ? ', LIT' : ''}`
        );

        const setSelectedRect = () => {
          if (!isSelectable) return;
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
          if (!isSelectable) return;
          setSelectedRect();
        };
        const onKeyDown = (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!isSelectable) return;
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

      // If the pointer is not over an interactive stall rect, do not show hover details.
      const onSvgMouseMove = (e) => {
        const target = e.target;
        if (!(target instanceof Element)) return;
        if (!target.closest('.carpark-spot')) {
          setHoveredSpot(null);
        }
      };
      const onSvgMouseLeave = () => setHoveredSpot(null);
      svg.addEventListener('mousemove', onSvgMouseMove);
      svg.addEventListener('mouseleave', onSvgMouseLeave);
      localCleanup.push(() => svg.removeEventListener('mousemove', onSvgMouseMove));
      localCleanup.push(() => svg.removeEventListener('mouseleave', onSvgMouseLeave));

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
  const isSpecialSpot = spotForPanel?.special === true;

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
                  {isSpecialSpot ? (
                    <Typography variant="body2">{t('carparkSpecialCase')}</Typography>
                  ) : spotForPanel.accessible ? (
                    <Typography variant="body2">♿</Typography>
                  ) : (
                    <Typography variant="body2">{t('carparkStandard')}</Typography>
                  )}
                  {spotForPanel.lit && <Typography variant="body2">LIT</Typography>}
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {selectedSpot ? t('carparkSelected') : t('carparkHover')}
                </Typography>
              </>
            )}
            <Divider sx={{ my: 2 }} />
            <Typography variant="body2" color="text.secondary">
              {isSpecialSpot
                ? t('carparkContactStaff')
                : i18n.language === 'de'
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
