// map.js

// ────────────────────────────────────────────────────────
// CONFIGURATION
const CONFIG = {
  // zoom limits
  ZOOM_MIN: 0.5,
  ZOOM_MAX: 5,

  // pan limits (in px, tweak to your SVG extents)
  PAN_LIMIT: {
    xMin: -200,
    xMax: 200,
    yMin: -100,
    yMax: 100
  }
};
// ────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  const mapContainer = document.getElementById('map');
  const mapWrapper = document.getElementById('map-wrapper');
  const yearFilter = document.getElementById('year-filter');
  const infoPanel = document.getElementById('info-panel');

  // 1) Inject inline SVG
  const svgText = await fetch('map.svg').then(r => r.text());
  mapContainer.innerHTML = svgText;
  const svgEl = mapContainer.querySelector('svg');

  // ensure pointer events work for panning
  svgEl.style.touchAction = 'none';
  svgEl.style.transformOrigin = 'center center';

  // track transform
  let scale = 1, panX = 0, panY = 0;

  // apply current transform
  function updateTransform() {
    svgEl.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
  }

  // 2) Zoom on wheel (bound to SVG)
  svgEl.addEventListener('wheel', e => {
    e.preventDefault();
    const delta = -e.deltaY * 0.002;
    scale = Math.min(CONFIG.ZOOM_MAX, Math.max(CONFIG.ZOOM_MIN, scale + delta));
    updateTransform();
  });

  // 3) Panning via pointer drag on SVG
  let dragging = false, start = {}, origin = {};

  svgEl.addEventListener('pointerdown', e => {
    dragging = true;
    start = { x: e.clientX, y: e.clientY };
    origin = { x: panX, y: panY };
    svgEl.setPointerCapture(e.pointerId);
    svgEl.style.cursor = 'grabbing';
  });

  svgEl.addEventListener('pointermove', e => {
    if (!dragging) return;
    const dx = (e.clientX - start.x) / scale;
    const dy = (e.clientY - start.y) / scale;
    panX = origin.x + dx;
    panY = origin.y + dy;
    // clamp
    panX = Math.min(CONFIG.PAN_LIMIT.xMax, Math.max(CONFIG.PAN_LIMIT.xMin, panX));
    panY = Math.min(CONFIG.PAN_LIMIT.yMax, Math.max(CONFIG.PAN_LIMIT.yMin, panY));
    updateTransform();
  });

  svgEl.addEventListener('pointerup', e => {
    dragging = false;
    svgEl.releasePointerCapture(e.pointerId);
    svgEl.style.cursor = 'grab';
  });

  // initialize cursor
  svgEl.style.cursor = 'grab';

  // 4) Load data
  const [placesArr, eventsArr] = await Promise.all([
    fetch('json/map-places.json').then(r => r.json()),
    fetch('json/map-events.json').then(r => r.json())
  ]);

  // place lookup
  const places = {};
  placesArr.forEach(p => (places[p.id] = p));

  // 5) Year filter UI
  const years = Array.from(new Set(eventsArr.map(ev => ev.year))).sort((a, b) => b - a);
  years.unshift('any');
  let selectedYear = 'any';

  years.forEach(y => {
    const btn = document.createElement('button');
    btn.textContent = y;
    btn.dataset.year = y;
    btn.className = 'year-btn';
    if (y === 'any') btn.classList.add('selected');
    yearFilter.append(btn);
  });

  yearFilter.addEventListener('click', e => {
    if (!e.target.matches('.year-btn')) return;
    selectedYear = e.target.dataset.year;
    yearFilter.querySelectorAll('.year-btn').forEach(b => b.classList.remove('selected'));
    e.target.classList.add('selected');
    renderMarkers();
  });

  // 6) Marker & Info
  let currentEvents = [], idx = 0;

  function renderMarkers() {
    svgEl.querySelectorAll('.marker').forEach(n => n.remove());

    const filtered = eventsArr.filter(ev =>
      selectedYear === 'any' ? true : ev.year == selectedYear
    );

    filtered.forEach(ev => {
      const p = places[ev.placeId];
      if (!p) return;
      const c = document.createElementNS('http://www.w3.org/2000/svg','circle');
      c.classList.add('marker');
      c.setAttribute('cx', p.x);
      c.setAttribute('cy', p.y);
      c.setAttribute('r', 5);
      c.setAttribute('title', `${p.name}: ${ev.title}`);
      c.addEventListener('click', () => openInfo(ev.placeId));
      svgEl.appendChild(c);
    });
  }

  function openInfo(placeId) {
    currentEvents = eventsArr.filter(ev =>
      ev.placeId === placeId &&
      (selectedYear === 'any' || ev.year == selectedYear)
    );
    idx = 0;
    showInfo();
  }

  function showInfo() {
    const ev = currentEvents[idx];
    const p = places[ev.placeId];
    infoPanel.innerHTML = `
      <h2 class="header-text text-lg mb-2">${p.name}</h2>
      <p class="text-sm mb-1"><strong>Year:</strong> ${ev.year}</p>
      <h3 class="font-semibold">${ev.title}</h3>
      <p class="mb-4">${ev.description || ''}</p>
      <div class="flex justify-between">
        <span class="nav-arrow" id="prev">&larr;</span>
        <span class="nav-arrow" id="next">&rarr;</span>
      </div>
    `;
    document.getElementById('prev').onclick = () => {
      idx = (idx - 1 + currentEvents.length) % currentEvents.length;
      showInfo();
    };
    document.getElementById('next').onclick = () => {
      idx = (idx + 1) % currentEvents.length;
      showInfo();
    };
  }

  // initial draw
  renderMarkers();
});
