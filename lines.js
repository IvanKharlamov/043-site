// Network visualization variables
const networkOverlay = document.getElementById('network-overlay');
let networkSvg;
let lineDisplayTimeout = null; // Track the timeout for line display

// Store previous visualization data to enable smooth transitions
let prevPoints = [];
let prevConnections = [];

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

// Calculate positions for network nodes
function calculateNetworkPositions(member) {
  const memberId = member.id;
  const memberName = member.name;
  const memberSince = member.since;
  const memberArea = member.area;
  
  // Generate a more varied seed based on multiple member properties
  const baseSeed = simpleHash(memberId + memberName + memberSince);
  
  // Static number of points (15)
  const pointCount = 15;
  
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
  // Clear any pending line display timeouts to fix the bug
  if (lineDisplayTimeout) {
    clearTimeout(lineDisplayTimeout);
    lineDisplayTimeout = null;
  }

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
  // Store the timeout ID so we can clear it if user changes profile before lines appear
  lineDisplayTimeout = setTimeout(() => {
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