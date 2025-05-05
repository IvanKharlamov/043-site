// map.js

// ────────────────────────────────────────────────────────
// CONFIGURATION
// Change these values to adjust zoom/pan limits, etc.
const CONFIG = {
  // zoom limits
  ZOOM_MIN: 0.5,
  ZOOM_MAX: 5,

  // pan limits (in SVG user‐space units, adjust to your map extents)
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

  // 1) Inject the inline SVG
  const svgText = await fetch('map.svg').then(r => r.text());
  mapContainer.innerHTML = svgText;
  const svgEl = mapContainer.querySelector('svg');

  // track current transform state
  let scale = 1;
  let panX = 0;
  let panY = 0;

  // 2) Wheel-to-zoom
  mapWrapper.addEventListener('wheel', e => {
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    scale = Math.min(
      CONFIG.ZOOM_MAX,
      Math.max(CONFIG.ZOOM_MIN, scale + delta)
    );
    updateTransform();
  });

  // 3) Click-and-drag panning
  let isDragging = false;
  let dragStart = { x: 0, y: 0 };
  let panStart = { x: 0, y: 0 };

  mapWrapper.addEventListener('pointerdown', e => {
    isDragging = true;
    dragStart = { x: e.clientX, y: e.clientY };
    panStart = { x: panX, y: panY };
    mapWrapper.setPointerCapture(e.pointerId);
    mapWrapper.style.cursor = 'grabbing';
  });

  mapWrapper.addEventListener('pointermove', e => {
    if (!isDragging) return;
    const dx = (e.clientX - dragStart.x) / scale;
    const dy = (e.clientY - dragStart.y) / scale;
    panX = panStart.x + dx;
    panY = panStart.y + dy;
    // clamp
    panX = Math.min(CONFIG.PAN_LIMIT.xMax, Math.max(CONFIG.PAN_LIMIT.xMin, panX));
    panY = Math.min(CONFIG.PAN_LIMIT.yMax, Math.max(CONFIG.PAN_LIMIT.yMin, panY));
    updateTransform();
  });

  mapWrapper.addEventListener('pointerup', e => {
    isDragging = false;
    mapWrapper.releasePointerCapture(e.pointerId);
    mapWrapper.style.cursor = 'grab';
  });

  function updateTransform() {
    svgEl.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
  }

  // 4) Load places & events
  const [placesArr, eventsArr] = await Promise.all([
    fetch('json/map-places.json').then(r => r.json()),
    fetch('json/map-events.json').then(r => r.json())
  ]);

  // build place lookup
  const places = {};
  placesArr.forEach(p => (places[p.id] = p));

  // 5) Year‐filter UI
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
    infoPanel.classList.add('hidden');
  });

  // 6) Marker + Info logic
  let currentEvents = [];
  let currentIndex = 0;

  function renderMarkers() {
    // remove existing
    svgEl.querySelectorAll('.marker').forEach(n => n.remove());

    // filter events
    const filtered = eventsArr.filter(ev =>
      selectedYear === 'any' ? true : ev.year == selectedYear
    );

    // add a circle per event
    filtered.forEach(ev => {
      const p = places[ev.placeId];
      if (!p) return;
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
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
    currentIndex = 0;
    showInfo();
  }

  function showInfo() {
    const ev = currentEvents[currentIndex];
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
    infoPanel.classList.remove('hidden');

    document.getElementById('prev').onclick = () => {
      currentIndex = (currentIndex - 1 + currentEvents.length) % currentEvents.length;
      showInfo();
    };
    document.getElementById('next').onclick = () => {
      currentIndex = (currentIndex + 1) % currentEvents.length;
      showInfo();
    };
  }

  // kick it off
  renderMarkers();
  // initialize cursor for panning
  mapWrapper.style.cursor = 'grab';
});
