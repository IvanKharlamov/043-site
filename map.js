document.addEventListener('DOMContentLoaded', async () => {
  const mapWrapper   = document.getElementById('map-wrapper');
  const mapContainer = document.getElementById('map');       // where SVG goes
  const yearFilter   = document.getElementById('year-filter');
  const infoPanel    = document.getElementById('info-panel');
  const placeName    = document.getElementById('place-name');
  const placeYear    = document.getElementById('place-year');
  const placeholder  = document.getElementById('placeholder-text');
  const eventDetails = document.getElementById('event-details');
  const btnPrev      = document.getElementById('prev');
  const btnNext      = document.getElementById('next');

  // 1) Load map.svg
  const svgText = await fetch('map.svg').then(r => r.text());
  mapContainer.innerHTML = svgText;
  const svgEl = mapContainer.querySelector('svg');

  // 2) Manual pan/zoom
  let scale = 1, panX = 0, panY = 0;
  const Z_MIN = 0.5, Z_MAX = 5;
  function updateTransform() {
    svgEl.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
  }

  mapWrapper.addEventListener('wheel', e => {
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    scale = Math.max(Z_MIN, Math.min(Z_MAX, scale + delta));
    updateTransform();
  });

  let dragging = false, dragStart = {}, panStart = {};
  mapWrapper.addEventListener('pointerdown', e => {
    dragging = true;
    dragStart = { x: e.clientX, y: e.clientY };
    panStart  = { x: panX,    y: panY };
    mapWrapper.setPointerCapture(e.pointerId);
    mapWrapper.classList.add('grabbing');
  });
  mapWrapper.addEventListener('pointermove', e => {
    if (!dragging) return;
    const dx = (e.clientX - dragStart.x) / scale;
    const dy = (e.clientY - dragStart.y) / scale;
    panX = panStart.x + dx;
    panY = panStart.y + dy;
    updateTransform();
  });
  mapWrapper.addEventListener('pointerup', e => {
    dragging = false;
    mapWrapper.releasePointerCapture(e.pointerId);
    mapWrapper.classList.remove('grabbing');
  });

  // 3) Load data
  const [placesArr, eventsArr] = await Promise.all([
    fetch('json/map-places.json').then(r => r.json()),
    fetch('json/map-events.json').then(r => r.json())
  ]);
  const places = Object.fromEntries(placesArr.map(p => [p.id, p]));

  // 4) Year filter buttons
  const years = Array.from(new Set(eventsArr.map(ev => ev.year))).sort((a,b)=>b-a);
  years.unshift('any');
  years.forEach(y => {
    const btn = document.createElement('button');
    btn.textContent   = y;
    btn.dataset.year  = y;
    btn.className     = 'year-btn text-gray-400 hover:text-white';
    if (y === 'any') btn.classList.replace('text-gray-400','text-white');
    yearFilter.append(btn);
  });
  let selectedYear = 'any';
  yearFilter.addEventListener('click', e => {
    if (!e.target.matches('.year-btn')) return;
    selectedYear = e.target.dataset.year;
    yearFilter.querySelectorAll('.year-btn')
      .forEach(b => b.classList.replace('text-white','text-gray-400'));
    e.target.classList.replace('text-gray-400','text-white');
    renderMarkers();
    resetInfo();
  });

  // 5) Marker rendering + interactions
  let currentEvents = [], currentIndex = 0;
  function renderMarkers() {
    // clear old
    mapWrapper.querySelectorAll('.marker').forEach(m => m.remove());
    // draw new
    eventsArr
      .filter(ev => selectedYear === 'any' || ev.year == selectedYear)
      .forEach(ev => {
        const p = places[ev.placeId];
        if (!p) return;
        const m = document.createElement('div');
        m.className = 'marker';
        m.style.left = `${p.x}px`;
        m.style.top  = `${p.y}px`;
        m.addEventListener('click', () => openInfo(ev.placeId));
        mapWrapper.append(m);
      });
  }

  function resetInfo() {
    placeholder.classList.remove('hidden');
    placeName.textContent = '';
    placeYear.textContent = '';
    eventDetails.innerHTML = '';
    btnPrev.classList.add('hidden');
    btnNext.classList.add('hidden');
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
    const p  = places[ev.placeId];

    // hide placeholder, fill header
    placeholder.classList.add('hidden');
    placeName.textContent = p.name;
    placeYear.textContent = ev.year;

    // event content
    eventDetails.innerHTML = `
      <h3 class="font-semibold">${ev.title}</h3>
      <p class="text-sm mt-2">${ev.description || ''}</p>
    `;

    // arrows logic
    if (currentEvents.length > 1) {
      btnPrev.classList.toggle('hidden', currentIndex === 0);
      btnNext.classList.toggle('hidden', currentIndex === currentEvents.length - 1);
    } else {
      btnPrev.classList.add('hidden');
      btnNext.classList.add('hidden');
    }

    btnPrev.onclick = () => { currentIndex--; showInfo(); };
    btnNext.onclick = () => { currentIndex++; showInfo(); };
  }

  // initial draw
  renderMarkers();
  resetInfo();
});
