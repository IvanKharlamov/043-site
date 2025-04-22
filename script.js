let members = [];
let currentIndex = 0;
const container = document.getElementById('line-container');
const description = document.getElementById('member-description');
const networkOverlay = document.getElementById('network-overlay');
let networkSvg;

// Array of dark color palettes for different members
const memberPalettes = [
  // Default dark blue palette
  ['#0d1321', '#141a26', '#1c1f2b', '#162032'],
  // Dark purple/midnight palette
  ['#0f0f1b', '#191631', '#251a40', '#1a1a2e'],
  // Dark teal/cyan palette
  ['#0f1e25', '#132029', '#12313b', '#0d252d'],
  // Dark red/burgundy palette
  ['#1a0e12', '#230f18', '#2b0f18', '#1e0a0f']
];

// Fetch the members data from the JSON file
fetch('members.json')
  .then(res => res.json())
  .then(data => {
    members = data;
    renderLines();
    updateActiveEntry();
    initNetworkVisualization();
  })
  .catch(error => {
    console.error('Error loading members data:', error);
    description.innerHTML = '<p class="text-red-500">Error loading member data. Please try again later.</p>';
  });

// Create the visual lines for each member
function renderLines() {
  container.innerHTML = '';
  members.forEach((member, index) => {
    const entry = document.createElement('div');
    entry.className = 'line-entry fade-transition';
    entry.innerHTML = `<img src="${member.img}" alt="${member.name}">`;
    entry.addEventListener('click', () => {
      currentIndex = index;
      updateActiveEntry();
      updateNetworkVisualization(members[currentIndex].id);
      updateBackgroundGradient(members[currentIndex].id);
    });
    container.appendChild(entry);
  });
}

// Update the background gradient based on member ID
function updateBackgroundGradient(memberId) {
  // Use the member ID hash to select a palette
  const hash = simpleHash(memberId);
  const paletteIndex = hash % memberPalettes.length;
  const selectedPalette = memberPalettes[paletteIndex];
  
  // Apply the new gradient
  document.body.style.background = `linear-gradient(-45deg, ${selectedPalette.join(', ')})`;
  document.body.style.backgroundSize = '400% 400%';
}

// Update the currently selected member and display their information
function updateActiveEntry() {
  // Update which line is active
  Array.from(container.children).forEach((entry, index) => {
    entry.classList.toggle('active', index === currentIndex);
  });
  
  // Get the current member
  const member = members[currentIndex];
  
  // Update the description panel with member information
  description.innerHTML = `
    <div class="mb-4">
      <h2 class="text-2xl font-bold mb-1 tracking-wide uppercase">${member.name}</h2>
      <p class="text-sm text-gray-400 mb-1">${member.area}</p>
      <p class="text-sm text-gray-500 italic mb-1">ID: ${member.id}</p>
      <p class="text-xs text-gray-400 uppercase mb-4">Member since ${member.since}</p>
      <h3 class="text-lg font-semibold mb-1">About</h3>
      <p class="mb-4 text-sm text-gray-400">${member.about}</p>
      <h3 class="text-lg font-semibold mb-1">Cultural Relevance</h3>
      <p class="mb-4">${member.cultural}</p>
      <h3 class="text-lg font-semibold mb-1">Fun Facts</h3>
      <p>${member.facts}</p>
    </div>
  `;
  
  // Update background gradient
  updateBackgroundGradient(member.id);
}

// Generate a simple hash from a string
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Initialize the network visualization
function initNetworkVisualization() {
  // Clear previous content
  networkOverlay.innerHTML = '';
  
  // Create new SVG
  networkSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  networkSvg.setAttribute('class', 'w-full h-full');
  networkSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  
  // Append SVG to container
  networkOverlay.appendChild(networkSvg);
  
  // Generate initial visualization based on first member
  updateNetworkVisualization(members[currentIndex].id);
}

// Update the network visualization based on member ID
function updateNetworkVisualization(memberId) {
  const hash = simpleHash(memberId);
  const seed = hash % 10000 / 10000; // Normalized seed value between 0-1
  
  // Clear previous points and lines
  while (networkSvg.firstChild) {
    networkSvg.removeChild(networkSvg.firstChild);
  }
  
  // Number of points to generate (20-30)
  const pointCount = 20 + Math.floor(seed * 10);
  
  // Generate points with positions influenced by the hash
  const points = [];
  const svgWidth = networkOverlay.clientWidth;
  const svgHeight = networkOverlay.clientHeight;
  
  for (let i = 0; i < pointCount; i++) {
    // Use hash and index to create semi-random but deterministic positions
    const pointSeed = simpleHash(`${memberId}-${i}`) / 10000000;
    
    const x = 20 + (pointSeed * 743 % 1) * (svgWidth - 40);
    const y = 20 + (pointSeed * 547 % 1) * (svgHeight - 40);
    
    points.push({ x, y });
  }
  
  // Generate connections between points
  const connections = [];
  const connectionCount = Math.floor(pointCount * 0.7); // About 70% of points will have connections
  
  for (let i = 0; i < connectionCount; i++) {
    const startIndex = i % pointCount;
    
    // Use hash to determine which point to connect to
    const connectToIndex = (startIndex + Math.floor(simpleHash(`${memberId}-conn-${i}`) % pointCount)) % pointCount;
    
    if (startIndex !== connectToIndex) {
      connections.push({
        x1: points[startIndex].x,
        y1: points[startIndex].y,
        x2: points[connectToIndex].x,
        y2: points[connectToIndex].y
      });
    }
  }
  
  // Create SVG elements with staggered animations
  connections.forEach((conn, index) => {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', conn.x1);
    line.setAttribute('y1', conn.y1);
    line.setAttribute('x2', conn.x2);
    line.setAttribute('y2', conn.y2);
    line.setAttribute('stroke', '#fff');
    line.setAttribute('stroke-width', '0.3');
    line.setAttribute('class', 'animate-draw-line');
    line.setAttribute('style', `animation-delay: ${index * 0.05}s`);
    
    networkSvg.appendChild(line);
  });
  
  points.forEach((point, index) => {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', point.x);
    circle.setAttribute('cy', point.y);
    circle.setAttribute('r', 3 + (simpleHash(`${memberId}-size-${index}`) % 5)); // Variable size between 3-7
    circle.setAttribute('fill', '#fff');
    circle.setAttribute('class', 'animate-flicker float-point');
    circle.setAttribute('style', `animation-delay: ${index * 0.1}s`);
    
    networkSvg.appendChild(circle);
  });
}