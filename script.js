let members = [];
let currentIndex = 0;
const container = document.getElementById('line-container');
const description = document.getElementById('member-description');
const networkOverlay = document.getElementById('network-overlay');
let networkSvg;

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
      updateNetworkVisualization(members[currentIndex]);
    });
    container.appendChild(entry);
  });
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
  updateNetworkVisualization(members[currentIndex]);
}

// Update the network visualization based on member data
function updateNetworkVisualization(member) {
  const memberId = member.id;
  const memberName = member.name;
  const memberSince = member.since;
  const memberArea = member.area;
  
  // Generate a more varied seed based on multiple member properties
  const baseSeed = simpleHash(memberId + memberName + memberSince);
  
  // Clear previous points and lines
  while (networkSvg.firstChild) {
    networkSvg.removeChild(networkSvg.firstChild);
  }
  
  // Number of points to generate (40-60)
  const pointCount = 40 + Math.floor((baseSeed % 1000) / 1000 * 20);
  
  // Generate points with positions influenced by the hash
  const points = [];
  const svgWidth = networkOverlay.clientWidth;
  const svgHeight = networkOverlay.clientHeight;
  
  for (let i = 0; i < pointCount; i++) {
    // Use different member properties for each point to create diversity
    const seedSource = i % 4 === 0 ? memberId : 
                      i % 4 === 1 ? memberName : 
                      i % 4 === 2 ? memberSince : 
                      memberArea;
                      
    // Create unique seed for each point
    const pointSeed = simpleHash(`${seedSource}-${i}-${baseSeed}`);
    
    // Use prime numbers and modulo to create better distribution
    const x = 20 + ((pointSeed * 17) % 997) / 997 * (svgWidth - 40);
    const y = 20 + ((pointSeed * 31) % 991) / 991 * (svgHeight - 40);
    
    points.push({ x, y });
  }
  
  // Generate connections between points
  const connections = [];
  const connectionCount = Math.floor(pointCount * 0.75); // Increase connections to 75%
  
  for (let i = 0; i < connectionCount; i++) {
    const startIndex = i % pointCount;
    
    // Use different properties to determine connections
    const connectSeed = simpleHash(`${memberId}-${memberName}-conn-${i}`);
    const connectToIndex = (startIndex + 1 + (connectSeed % (pointCount - 1))) % pointCount;
    
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
    line.setAttribute('stroke-width', '0.2');
    line.setAttribute('class', 'animate-draw-line');
    line.setAttribute('style', `animation-delay: ${index * 0.02}s`);
    
    networkSvg.appendChild(line);
  });
  
  points.forEach((point, index) => {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', point.x);
    circle.setAttribute('cy', point.y);
    
    // Make dot sizes more varied using different seeds
    const sizeSeed = simpleHash(`${memberId}-${memberName}-size-${index}`);
    const sizeVariation = sizeSeed % 100;
    // More varied dot sizes with occasional larger ones
    const radius = sizeVariation < 70 ? 0.8 + (sizeVariation % 2) * 0.4 : 
                  sizeVariation < 90 ? 1.5 + (sizeVariation % 3) * 0.5 : 
                  2.5 + (sizeVariation % 4) * 0.75;
    
    circle.setAttribute('r', radius);
    circle.setAttribute('fill', '#fff');
    
    // Vary animation styles based on index
    const animClass = index % 3 === 0 ? 'animate-flicker' : 'float-point';
    circle.setAttribute('class', animClass);
    circle.setAttribute('style', `animation-delay: ${(index * 0.05) % 2}s; opacity: ${0.6 + (sizeSeed % 5) * 0.08}`);
    
    networkSvg.appendChild(circle);
  });
}