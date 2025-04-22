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
  
  // Add CSS for transitions
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = `
    circle {
      transition: cx 0.8s cubic-bezier(0.4, 0, 0.2, 1),
                  cy 0.8s cubic-bezier(0.4, 0, 0.2, 1),
                  r 0.8s cubic-bezier(0.4, 0, 0.2, 1),
                  opacity 0.4s ease;
    }
    line {
      transition: opacity 0.4s ease;
    }
    .animate-blink {
      animation: blink 3s infinite alternate;
    }
    @keyframes blink {
      0%, 80% { opacity: 0.5; }
      100% { opacity: 1; }
    }
  `;
  networkSvg.appendChild(style);
  
  // Append SVG to container
  networkOverlay.appendChild(networkSvg);
  
  // Generate initial visualization based on first member
  updateNetworkVisualization(members[currentIndex]);
}

// Store previous visualization data to enable smooth transitions
let prevPoints = [];
let prevConnections = [];

// Calculate positions for network nodes
function calculateNetworkPositions(member) {
  const memberId = member.id;
  const memberName = member.name;
  const memberSince = member.since;
  const memberArea = member.area;
  
  // Generate a more varied seed based on multiple member properties
  const baseSeed = simpleHash(memberId + memberName + memberSince);
  
  // Number of points to generate (15-30)
  const pointCount = 15 + Math.floor((baseSeed % 1000) / 1000 * 15);
  
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
    
    // Calculate radius based on seed - MULTIPLIED BY 5
    const sizeSeed = simpleHash(`${memberId}-${memberName}-size-${i}`);
    const sizeVariation = sizeSeed % 100;
    const radius = (sizeVariation < 70 ? 0.8 + (sizeVariation % 2) * 0.4 : 
                   sizeVariation < 90 ? 1.5 + (sizeVariation % 3) * 0.5 : 
                   2.5 + (sizeVariation % 4) * 0.75) * 5; // Multiplied by 5
    
    // Add opacity variation
    const opacity = 0.6 + (sizeSeed % 5) * 0.08;
    
    // Add point data - now only using blink animation
    points.push({ 
      x, 
      y, 
      radius, 
      opacity,
      id: `point-${i}`,
      animClass: 'animate-blink' // Only blink animation
    });
  }
  
  // Generate connections between points
  const connections = [];
  const connectionCount = Math.floor(pointCount * 0.5);
  
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
        y2: points[connectToIndex].y,
        id: `connection-${i}`
      });
    }
  }
  
  return { points, connections };
}

// Update the network visualization based on member data
function updateNetworkVisualization(member) {
  const { points, connections } = calculateNetworkPositions(member);
  const existingNodes = {};
  
  // First, remove all existing lines immediately when changing profiles
  const lines = networkSvg.querySelectorAll('line');
  lines.forEach(line => {
    if (line.parentNode) {
      line.parentNode.removeChild(line);
    }
  });
  
  // Store existing elements for dots
  const circles = networkSvg.querySelectorAll('circle');
  circles.forEach(circle => {
    existingNodes[circle.getAttribute('data-id')] = circle;
  });

  // Create/update points first
  points.forEach((point, index) => {
    let circle;
    
    if (existingNodes[point.id] && index < prevPoints.length) {
      // Update existing node
      circle = existingNodes[point.id];
      
      // Animate to new position
      circle.setAttribute('cx', point.x);
      circle.setAttribute('cy', point.y);
      circle.setAttribute('r', point.radius);
    } else {
      // Create new node
      circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', point.x);
      circle.setAttribute('cy', point.y);
      circle.setAttribute('r', point.radius);
      circle.setAttribute('fill', '#fff');
      circle.setAttribute('class', point.animClass);
      circle.setAttribute('style', `animation-delay: ${(index * 0.05) % 2}s; opacity: 0;`);
      circle.setAttribute('data-id', point.id);
      
      networkSvg.appendChild(circle);
      
      // Fade in
      setTimeout(() => {
        circle.style.opacity = point.opacity;
      }, 10 + index * 5);
    }
  });
  
  // Remove nodes that aren't needed anymore
  if (prevPoints.length > 0) {
    const currentIds = points.map(p => p.id);
    
    Object.keys(existingNodes).forEach(id => {
      if (!currentIds.includes(id)) {
        const circle = existingNodes[id];
        // Fade out and remove
        circle.style.opacity = 0;
        setTimeout(() => {
          if (circle.parentNode) {
            circle.parentNode.removeChild(circle);
          }
        }, 800); // Match the transition duration
      }
    });
  }
  
  // Add a delay before creating connections - wait for dots to move
  setTimeout(() => {
    // Create connections with more prominence
    connections.forEach((conn, index) => {
      // Create new connection
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', conn.x1);
      line.setAttribute('y1', conn.y1);
      line.setAttribute('x2', conn.x2);
      line.setAttribute('y2', conn.y2);
      line.setAttribute('stroke', '#fff');
      line.setAttribute('stroke-width', '1'); // Increased from 0.2 to 1 for prominence
      line.setAttribute('data-id', conn.id);
      line.setAttribute('style', 'opacity: 0;');
      
      networkSvg.appendChild(line);
      
      // Fade in with delay
      setTimeout(() => {
        line.style.opacity = 0.8; // Increased from default for more prominence
      }, index * 20); // Sequential appearance
    });
  }, 800); // Wait for dots to move first
  
  // Update stored data for next transition
  prevPoints = [...points];
  prevConnections = [...connections];
}