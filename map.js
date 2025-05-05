
import * as d3 from 'https://cdn.skypack.dev/d3@7';

(async function() {
  const svg = d3.select('#map');
  const wrapper = d3.select('#map-wrapper');
  const yearNav = d3.select('#year-filter');
  const info = d3.select('#info-panel');

  const [placesArr, eventsArr, svgText] = await Promise.all([
    fetch('json/map-places.json').then(r => r.json()),
    fetch('json/map-events.json').then(r => r.json()),
    fetch('map.svg').then(r => r.text())
  ]);
  svg.html(svgText);
  // hide loading overlay
  wrapper.select('.loading-overlay').remove();

  const g = svg.append('g');

  const places = Object.fromEntries(placesArr.map(p => [p.id, p]));
  const years = ['Any', ...Array.from(new Set(eventsArr.map(e => e.year))).sort((a, b) => b - a)];
  let selectedYear = 'Any';
  let selectedPlace = null;
  let currentEvents = [];
  let idx = 0;

  // Year filter buttons
  yearNav.selectAll('button')
    .data(years)
    .enter().append('button')
      .text(d => d)
      .classed('selected', d => d === 'Any')
      .on('click', (_, y) => {
        selectedYear = y;
        yearNav.selectAll('button').classed('selected', d => d === y);
        renderMarkers();
        info.classed('hidden', true);
      });

  // Zoom & pan
  const zoom = d3.zoom().scaleExtent([0.5, 5]).on('zoom', ({transform}) => {
    g.attr('transform', transform);
  });
  wrapper.call(zoom).on('dblclick.zoom', null)
    .on('mousedown', () => wrapper.classed('grabbing', true))
    .on('mouseup', () => wrapper.classed('grabbing', false));

  function renderMarkers() {
    g.selectAll('.marker-group').remove();
    const filtered = eventsArr.filter(ev => selectedYear === 'Any' || ev.year == selectedYear);

    const markers = g.selectAll('.marker-group')
      .data(filtered)
      .enter().append('g')
        .attr('class', 'marker-group')
        .attr('transform', d => `translate(${places[d.placeId].x},${places[d.placeId].y})`)
        .on('click', (_, d) => openInfo(d));

    markers.append('rect')
      .attr('class', 'pin1')
      .attr('x', -10).attr('y', -10)
      .attr('width', 20).attr('height', 20)
      .attr('rx', 10);

    markers.append('circle')
      .attr('class', 'pin1-inner')
      .attr('cx', 0).attr('cy', 0)
      .attr('r', 5);

    updateSelection();
  }

  function openInfo(ev) {
    selectedPlace = ev.placeId;
    currentEvents = eventsArr.filter(e => e.placeId === selectedPlace && (selectedYear === 'Any' || e.year == selectedYear));
    idx = 0;
    showInfo();
    updateSelection();
    info.classed('hidden', false);
  }

  function showInfo() {
    const ev = currentEvents[idx];
    const p = places[ev.placeId];
    info.html(`
      <h2 class=\"header-text text-lg mb-2\">${p.name}</h2>
      <p class=\"mb-1\"><strong>Year:</strong> ${ev.year}</p>
      <h3 class=\"font-semibold mb-2\">${ev.title}</h3>
      <p class=\"mb-4\">${ev.description || ''}</p>
      <div class=\"flex justify-between\">
        <span class=\"nav-arrow\" id=\"prev\">&larr;</span>
        <span class=\"nav-arrow\" id=\"next\">&rarr;</span>
      </div>
    `);
    d3.select('#prev').on('click', () => { idx = (idx-1+currentEvents.length)%currentEvents.length; showInfo(); });
    d3.select('#next').on('click', () => { idx = (idx+1)%currentEvents.length; showInfo(); });
  }

  function updateSelection() {
    g.selectAll('.marker-group').classed('selected', d => d.placeId === selectedPlace);
  }

  // Initial render
  renderMarkers();
})();
