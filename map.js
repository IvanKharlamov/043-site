import * as d3 from 'https://cdn.skypack.dev/d3';

(async function() {
  const svg = d3.select('#map');
  const wrapper = d3.select('#map-wrapper');
  const info = d3.select('#info-panel');
  const yearNav = d3.select('#year-filter');

  const data = await Promise.all([
    fetch('json/map-places.json').then(r => r.json()),
    fetch('json/map-events.json').then(r => r.json()),
    fetch('map.svg').then(r => r.text())
  ]);
  const [placesArr, eventsArr, svgText] = data;
  document.querySelector('#map').innerHTML = svgText;

  const places = Object.fromEntries(placesArr.map(p => [p.id, p]));
  const years = Array.from(new Set(eventsArr.map(e => e.year))).sort((a,b)=>b-a);
  years.unshift('Any');

  let selectedYear = 'Any';
  let currentEvents = [];
  let idx = 0;

  // year filter
  yearNav.selectAll('button')
    .data(years)
    .enter().append('button')
      .text(d=>d)
      .attr('class', d=>d==='Any'? 'selected' : '')
      .on('click', (_, y)=>{
        selectedYear = y;
        yearNav.selectAll('button').classed('selected', d=>d===y);
        drawMarkers();
        hideInfo();
      });

  // zoom & pan
  const zoom = d3.zoom()
    .scaleExtent([0.5, 5])
    .on('zoom', ({transform})=>{
      svg.attr('transform', transform);
    });
  wrapper.call(zoom).on('dblclick.zoom', null);

  function drawMarkers() {
    svg.selectAll('.marker').remove();
    const filtered = eventsArr.filter(e=> selectedYear==='Any' || e.year==selectedYear);
    currentEvents = filtered;

    svg.selectAll('.marker')
      .data(filtered)
      .enter().append('circle')
        .attr('class','marker')
        .attr('cx', d=>places[d.placeId].x)
        .attr('cy', d=>places[d.placeId].y)
        .on('click', (_, ev)=> openInfo(ev));
  }

  function openInfo(ev) {
    idx = 0;
    showInfo(ev.placeId);
    info.classed('active', true);
  }

  function hideInfo() {
    info.classed('active', false);
  }

  function showInfo(pid) {
    const evs = eventsArr.filter(e=> e.placeId===pid && (selectedYear==='Any' || e.year==selectedYear));
    const ev = evs[idx];
    const p = places[pid];

    info.html(`
      <h2 class="header-text text-lg mb-2">${p.name}</h2>
      <p class="mb-1"><strong>Year:</strong> ${ev.year}</p>
      <h3 class="font-semibold">${ev.title}</h3>
      <p class="mb-4">${ev.description||''}</p>
      <div class="flex justify-between">
        <span class="nav-arrow" id="prev">←</span>
        <span class="nav-arrow" id="next">→</span>
      </div>
    `);
    d3.select('#prev').on('click', ()=>{ idx=(idx-1+evs.length)%evs.length; showInfo(pid); });
    d3.select('#next').on('click', ()=>{ idx=(idx+1)%evs.length; showInfo(pid); });
  }

  drawMarkers();
})();
