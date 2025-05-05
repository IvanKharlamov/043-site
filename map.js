import { zoom as d3Zoom } from 'https://cdn.jsdelivr.net/npm/d3-zoom@3/+esm';
import { select as d3Select } from 'https://cdn.jsdelivr.net/npm/d3-selection@3/+esm';

const CONFIG = { ZOOM_MIN: 0.5, ZOOM_MAX: 5 };

document.addEventListener('DOMContentLoaded', async () => {
  const mapContainer = document.getElementById('map');
  const mapWrapper   = document.getElementById('map-wrapper');
  const yearFilter   = document.getElementById('year-filter');
  const infoPanel    = document.getElementById('info-panel');
  const placeName    = document.getElementById('place-name');
  const placeYear    = document.getElementById('place-year');
  const eventDetails = document.getElementById('event-details');
  const btnPrev      = document.getElementById('prev');
  const btnNext      = document.getElementById('next');

  // load SVG
  const svgText = await fetch('map.svg').then(r => r.text());
  mapContainer.innerHTML = svgText;
  const svgEl = mapContainer.querySelector('svg');

  // D3 zoom setup
  d3Select(svgEl)
    .call(d3Zoom()
      .scaleExtent([CONFIG.ZOOM_MIN, CONFIG.ZOOM_MAX])
      .on('zoom', ({ transform }) => {
        // apply the translate/scale transform
        svgEl.style.transform = transform.toString();
      })
    );

  // load data
  const [placesArr, eventsArr] = await Promise.all([
    fetch('json/map-places.json').then(r => r.json()),
    fetch('json/map-events.json').then(r => r.json())
  ]);
  const places = Object.fromEntries(placesArr.map(p => [p.id, p]));

  // year buttons
  const years = Array.from(new Set(eventsArr.map(e => e.year)))
                     .sort((a, b) => b - a);
  years.unshift('any');
  years.forEach(y => {
    const btn = document.createElement('button');
    btn.textContent = y;
    btn.dataset.year = y;
    btn.className = 'year-btn font-mono uppercase text-gray-400 hover:text-white';
    if (y === 'any') btn.classList.add('text-white');
    yearFilter.append(btn);
  });

  let selectedYear = 'any';
  yearFilter.addEventListener('click', e => {
    if (!e.target.matches('.year-btn')) return;
    selectedYear = e.target.dataset.year;
    yearFilter.querySelectorAll('.year-btn')
              .forEach(b => b.classList.remove('text-white'));
    e.target.classList.add('text-white');
    renderMarkers();
    infoPanel.classList.add('hidden');
  });

  let currentEvents = [], currentIndex = 0;

  function renderMarkers() {
    // Clear old markers
    mapWrapper.querySelectorAll('.marker').forEach(m => m.remove());

    // Draw new ones
    const filtered = eventsArr.filter(ev =>
      selectedYear === 'any' || ev.year == selectedYear
    );

    filtered.forEach(ev => {
      const p = places[ev.placeId];
      if (!p) return;
      const marker = document.createElement('div');
      marker.classList.add('marker');
      marker.style.left = `${p.x}px`;
      marker.style.top  = `${p.y}px`;
      marker.addEventListener('click', () => openInfo(ev.placeId));
      mapWrapper.append(marker);
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
    const p  = places[ev.placeId];
    placeName.textContent = p.name;
    placeYear.textContent = ev.year;
    eventDetails.innerHTML = `
      <h3 class="font-semibold">${ev.title}</h3>
      <p class="text-sm mt-2">${ev.description || ''}</p>
    `;
    infoPanel.classList.remove('hidden');

    // Only show >/< when multiple events exist
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

  renderMarkers();
});
