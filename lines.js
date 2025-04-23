// Network visualization configuration
const CONFIG = {
  // Point settings
  POINT_COUNT: 80,                  // Number of nodes in the network
  MIN_POINT_MARGIN: 20,             // Minimum margin from edges (px)
  RIGHT_SIDE_RATIO: 0.5,            // Percentage of dots to place on the right side (50%)
  RIGHT_SIDE_THRESHOLD: 0.6,        // X-position threshold for right side (0.6 = 60% point)
  CENTER_Y_RATIO: 0.7,              // Height of the central Y band (70%)
  CENTER_Y_OFFSET: 0.15,            // Offset from top (centers the 70% band)
  MIN_DOT_SIZE: 0.8 * 5,            // Minimum dot radius (px)
  MAX_DOT_SIZE: 3.25 * 5,           // Maximum dot radius (px)
  DOT_SIZE_TIERS: [                 // Size distribution tiers (percentiles)
    { threshold: 70, min: 0.8, max: 1.2 },    // 70% of dots are small
    { threshold: 90, min: 1.5, max: 2.0 },    // 20% of dots are medium
    { threshold: 100, min: 2.5, max: 3.25 }   // 10% of dots are large
  ],
  MIN_DOT_OPACITY: 0.6,             // Minimum opacity for dots
  OPACITY_STEP: 0.08,               // Opacity variation step

  // Connection settings
  CONNECTION_RATIO: 0.75,           // Connections as ratio of point count
  CONNECTION_STROKE_WIDTH: 1,       // Line thickness (px)
  CONNECTION_OPACITY: 0.8,          // Line opacity
  PROXIMITY_THRESHOLD: 400,
  
  // Animation settings
  DOT_FADE_DELAY_BASE: 10,          // Base delay for dot fade-in (ms)
  DOT_FADE_DELAY_STEP: 5,           // Additional delay per dot (ms)
  CONNECTION_FADE_DELAY_STEP: 20,   // Delay between connection appearances (ms)
  DOT_TRANSITION_TIME: 800,         // Time for dots to move to new positions (ms)
  DOT_REMOVAL_TIME: 800             // Time before removing unused dots (ms)
};

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
  
  // Get point count from config
  const pointCount = CONFIG.POINT_COUNT;
  
  // Generate points with positions influenced by the hash
  const points = [];
  const svgWidth = networkOverlay.clientWidth;
  const svgHeight = networkOverlay.clientHeight;
  
  // Calculate how many points should be on the right side (90%)
  const rightSidePointCount = Math.round(pointCount * CONFIG.RIGHT_SIDE_RATIO);
  const randomPointCount = pointCount - rightSidePointCount;
  
  // Calculate the Y-axis bounds for the central area
  const centralYStart = svgHeight * CONFIG.CENTER_Y_OFFSET;
  const centralYHeight = svgHeight * CONFIG.CENTER_Y_RATIO;
  
  // Create an array to track which group each point belongs to
  const pointGroups = [];
  
  for (let i = 0; i < pointCount; i++) {
    // Use different member properties for each point to create diversity
    const seedSource = i % 4 === 0 ? memberId : 
                      i % 4 === 1 ? memberName : 
                      i % 4 === 2 ? memberSince : 
                      memberArea;
                      
    // Create unique seed for each point
    const pointSeed = simpleHash(`${seedSource}-${i}-${baseSeed}`);
    
    // Determine if this point should be in the structured group (right side, central Y)
    const isStructured = i < rightSidePointCount;
    pointGroups[i] = isStructured ? 'structured' : 'random';
    
    // Calculate positions based on which group the point belongs to
    let x, y;
    
    if (isStructured) {
      // RIGHT SIDE + CENTRAL Y points
      // X position: Between RIGHT_SIDE_THRESHOLD and right edge
      const rightSideWidth = svgWidth * (1 - CONFIG.RIGHT_SIDE_THRESHOLD);
      x = svgWidth * CONFIG.RIGHT_SIDE_THRESHOLD + CONFIG.MIN_POINT_MARGIN + 
          ((pointSeed * 17) % 997) / 997 * (rightSideWidth - (CONFIG.MIN_POINT_MARGIN * 2));
      
      // Y position: Central 70% of the screen
      y = centralYStart + CONFIG.MIN_POINT_MARGIN + 
          ((pointSeed * 31) % 991) / 991 * (centralYHeight - (CONFIG.MIN_POINT_MARGIN * 2));
    } else {
      // FULLY RANDOM points (anywhere on screen)
      x = CONFIG.MIN_POINT_MARGIN + 
          ((pointSeed * 17) % 997) / 997 * (svgWidth - (CONFIG.MIN_POINT_MARGIN * 2));
      y = CONFIG.MIN_POINT_MARGIN + 
          ((pointSeed * 31) % 991) / 991 * (svgHeight - (CONFIG.MIN_POINT_MARGIN * 2));
    }
    
    // Calculate radius based on seed
    const sizeSeed = simpleHash(`${memberId}-${memberName}-size-${i}`);
    const sizeVariation = sizeSeed % 100;
    
    // Use tiered sizing approach from config
    let radius;
    for (const tier of CONFIG.DOT_SIZE_TIERS) {
      if (sizeVariation < tier.threshold) {
        radius = tier.min + (sizeSeed % ((tier.max - tier.min) * 10)) / 10;
        radius *= 2;
        break;
      }
    }
    
    // Add opacity variation
    const opacity = CONFIG.MIN_DOT_OPACITY + (sizeSeed % 5) * CONFIG.OPACITY_STEP;
    
    // Add point data with group information
    points.push({ 
      x, 
      y, 
      radius, 
      opacity,
      id: `point-${i}`,
      animClass: 'animate-blink',
      group: pointGroups[i]
    });
  }
  
  // Generate connections between points
  const connections = [];
  const connectionCount = Math.floor(pointCount * CONFIG.CONNECTION_RATIO);
  
  // Create a lookup of points by group
  const structuredPoints = [];
  const randomPoints = [];
  
  // Separate points into groups and store their indices
  points.forEach((point, index) => {
    if (point.group === 'structured') {
      structuredPoints.push(index);
    } else {
      randomPoints.push(index);
    }
  });
  
  // 1. First, generate seed-based connections for structured points
  for (let i = 0; i < connectionCount; i++) {
    // Use structured points as the base for these connections
    if (i >= structuredPoints.length) continue;
    
    const startIndex = structuredPoints[i % structuredPoints.length];
    
    // Use different properties to determine connections
    const connectSeed = simpleHash(`${memberId}-${memberName}-conn-${i}`);
    
    // For structured points, only connect to other structured points
    if (structuredPoints.length > 1) {
      const structuredIndex = i % structuredPoints.length;
      let offset = 1 + (connectSeed % (structuredPoints.length - 1));
      const connectToIndex = structuredPoints[(structuredIndex + offset) % structuredPoints.length];
      
      if (startIndex !== connectToIndex) {
        connections.push({
          x1: points[startIndex].x,
          y1: points[startIndex].y,
          x2: points[connectToIndex].x,
          y2: points[connectToIndex].y,
          id: `connection-structured-${i}`,
          type: 'structured'
        });
      }
    }
  }
  
  // 2. Generate proximity-based connections for random points
  // For each random point, connect to other random points within the proximity threshold
  const proximityConnections = new Set(); // To track unique connections
  
  for (let i = 0; i < randomPoints.length; i++) {
    const pointA = randomPoints[i];
    
    for (let j = i + 1; j < randomPoints.length; j++) {
      const pointB = randomPoints[j];
      
      // Calculate distance between the two points
      const dx = points[pointA].x - points[pointB].x;
      const dy = points[pointA].y - points[pointB].y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // If points are within the proximity threshold, create a connection
      if (distance <= CONFIG.PROXIMITY_THRESHOLD) {
        // Create a unique ID for the connection to avoid duplicates
        const connectionId = `proximity-${Math.min(pointA, pointB)}-${Math.max(pointA, pointB)}`;
        
        if (!proximityConnections.has(connectionId)) {
          proximityConnections.add(connectionId);
          
          connections.push({
            x1: points[pointA].x,
            y1: points[pointA].y,
            x2: points[pointB].x,
            y2: points[pointB].y,
            id: connectionId,
            type: 'proximity'
          });
        }
      }
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
      circle.setAttribute('data-group', point.group);
      
      networkSvg.appendChild(circle);
      
      // Fade in
      setTimeout(() => {
        circle.style.opacity = point.opacity;
      }, CONFIG.DOT_FADE_DELAY_BASE + index * CONFIG.DOT_FADE_DELAY_STEP);
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
        }, CONFIG.DOT_REMOVAL_TIME); // Match the transition duration
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
      line.setAttribute('stroke-width', CONFIG.CONNECTION_STROKE_WIDTH);
      line.setAttribute('data-id', conn.id);
      line.setAttribute('data-type', conn.type || 'default');
      line.setAttribute('style', 'opacity: 0;');
      
      networkSvg.appendChild(line);
      
      // Fade in with delay - prioritize proximity connections to appear first
      const delayMultiplier = conn.type === 'proximity' ? 0.5 : 1;
      setTimeout(() => {
        line.style.opacity = CONFIG.CONNECTION_OPACITY;
      }, index * CONFIG.CONNECTION_FADE_DELAY_STEP * delayMultiplier); // Sequential appearance
    });
  }, CONFIG.DOT_TRANSITION_TIME); // Wait for dots to move first
  
  // Update stored data for next transition
  prevPoints = [...points];
  prevConnections = [...connections];
}