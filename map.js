// map.js

document.addEventListener('DOMContentLoaded', async () => {
  const mapContainer = document.getElementById('map');
  const mapWrapper = document.getElementById('map-wrapper');
  const yearFilter = document.getElementById('year-filter');
  const infoPanel = document.getElementById('info-panel');

  // 1. Inject inline SVG
  const svgText = await fetch('map.svg').then(r => r.text());
  mapContainer.innerHTML = svgText;
  const svgEl = mapContainer.querySelector('svg');

  // 2. Wheel-to-zoom
  let scale = 1;
  mapWrapper.addEventListener('wheel', e => {
    e.preventDefault();
    scale = Math.min(Math.max(0.5, scale - e.deltaY * 0.001), 5);
    svgEl.style.transform = `scale(${scale})`;
  });

  // 3. Load places & events in parallel
  const [placesArr, eventsArr] = await Promise.all([
    fetch('map-places.json').then(r => r.json()),
    fetch('map-events.json').then(r => r.json())
  ]);

  // Build lookup: placeId -> { name, x, y }
  const places = {};
  placesArr.forEach(p => {
    places[p.id] = p;
  });

  // 4. Build year filter from events
  const years = Array.from(
    new Set(eventsArr.map(ev => ev.year))
  ).sort((a, b) => b - a);
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
    yearFilter.querySelectorAll('.year-btn')
      .forEach(b => b.classList.remove('selected'));
    e.target.classList.add('selected');
    renderMarkers();
    infoPanel.classList.add('hidden');
  });

  // 5. Marker & Info logic
  let currentEvents = [];
  let currentIndex = 0;

  function renderMarkers() {
    // clear old
    svgEl.querySelectorAll('.marker').forEach(n => n.remove());

    // filter by year
    const filtered = eventsArr.filter(ev =>
      selectedYear === 'any' ? true : ev.year == selectedYear
    );

    filtered.forEach(ev => {
      const place = places[ev.placeId];
      if (!place) return;
      const circle = document.createElementNS(
        'http://www.w3.org/2000/svg', 'circle'
      );
      circle.classList.add('marker');
      circle.setAttribute('cx', place.x);
      circle.setAttribute('cy', place.y);
      circle.setAttribute('r', 5);
      circle.setAttribute('title', `${place.name}: ${ev.title}`);
      circle.addEventListener('click', () => openInfo(ev.placeId));
      svgEl.appendChild(circle);
    });
  }

  function openInfo(placeId) {
    // gather events at this place (and year)
    currentEvents = eventsArr.filter(ev =>
      ev.placeId === placeId &&
      (selectedYear === 'any' || ev.year == selectedYear)
    );
    currentIndex = 0;
    showInfo();
  }

  function showInfo() {
    const ev = currentEvents[currentIndex];
    const place = places[ev.placeId];
    infoPanel.innerHTML = `
      <h2 class="header-text text-lg mb-2">${place.name}</h2>
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
      currentIndex =
        (currentIndex - 1 + currentEvents.length) %
        currentEvents.length;
      showInfo();
    };
    document.getElementById('next').onclick = () => {
      currentIndex = (currentIndex + 1) % currentEvents.length;
      showInfo();
    };
  }

  // initial render
  renderMarkers();
});
