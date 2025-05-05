
import * as d3 from 'https://cdn.skypack.dev/d3@7';

(async function() {
  // Elements
  const svgEl = d3.select('#map');
  const container = d3.select('#map-container');
  const yearNav = d3.select('#year-filter');
  const panel = d3.select('#info-panel');
  const content = d3.select('#info-content');
  const closeBtn = d3.select('#close-panel');

  // Load data & SVG
  const [places, events, svgText] = await Promise.all([
    fetch('json/map-places.json').then(r=>r.json()),
    fetch('json/map-events.json').then(r=>r.json()),
    fetch('map.svg').then(r=>r.text())
  ]);
  d3.select('#map').html(svgText);
  const svg = svgEl.select('svg').attr('pointer-events', 'all');

  // Data prep
  const placeMap = Object.fromEntries(places.map(p=>[p.id,p]));
  const years = ['All', ...Array.from(new Set(events.map(e=>e.year))).sort((a,b)=>b-a)];
  let currentYear = 'All';

  // Year buttons
  yearNav.selectAll('btn')
    .data(years)
    .enter().append('button')
      .text(d=>d)
      .classed('selected', d=>d==='All')
      .on('click', (_, y)=>{
        currentYear = y;
        yearNav.selectAll('button').classed('selected', d=>d===y);
        draw();
      });

  // Zoom & pan
  const zoom = d3.zoom().scaleExtent([0.5,5]).on('zoom', ({transform})=> svg.attr('transform', transform));
  container.call(zoom).on('dblclick.zoom', null)
    .on('mousedown', () => container.classed('grabbing', true))
    .on('mouseup', () => container.classed('grabbing', false));

  // Draw markers
  function draw() {
    svg.selectAll('.marker').remove();
    const filtered = events.filter(e=> currentYear==='All' || e.year==currentYear);
    svg.selectAll('.marker')
      .data(filtered)
      .enter().append('circle')
        .attr('class','marker')
        .attr('cx', d=> placeMap[d.placeId].x)
        .attr('cy', d=> placeMap[d.placeId].y)
        .attr('r', 6)
        .on('click', (e,d)=> showInfo(d));
  }

  // Panel
  function showInfo(ev) {
    const evs = events.filter(x=> x.placeId===ev.placeId && (currentYear==='All'||x.year==currentYear));
    content.html('');
    evs.forEach(item=> {
      content.append('div').html(`
        <h2>${placeMap[item.placeId].name} (${item.year})</h2>
        <h3>${item.title}</h3>
        <p>${item.description||''}</p>
        <hr class="my-2 border-gray-600">`
      );
    });
    panel.classed('open', true);
  }

  closeBtn.on('click', ()=> panel.classed('open', false));

  // Initial draw
  draw();
})();
