// Network visualization configuration
const CONFIG = {
  // Point settings
  POINT_COUNT: 70,                  // Number of nodes in the network
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
  PROXIMITY_THRESHOLD_PERCENT: 0.05, // Percentage of screen diagonal for proximity threshold
  
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

// Quadratic Bézier “d” generator
function quadCurveD(x1, y1, x2, y2, offset = 50) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  const ux = -dy / len, uy = dx / len;   // unit perpendicular
  const cx = mx + ux * offset;
  const cy = my + uy * offset;
  return `M ${x1},${y1} Q ${cx},${cy} ${x2},${y2}`;
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
  
  // Calculate screen diagonal for percentage-based proximity threshold
  const screenDiagonal = Math.sqrt(svgWidth * svgWidth + svgHeight * svgHeight);
  const proximityThreshold = screenDiagonal * CONFIG.PROXIMITY_THRESHOLD_PERCENT;
  
  // Calculate how many points should be on the right side
  const rightSidePointCount = Math.round(pointCount * CONFIG.RIGHT_SIDE_RATIO);
  
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
    
    // Determine if this point should be in the structured group
    const isStructured = i < rightSidePointCount;
    pointGroups[i] = isStructured ? 'structured' : 'random';
    
    // Calculate positions based on which group the point belongs to
    let x, y;
    
    if (isStructured) {
      const rightSideWidth = svgWidth * (1 - CONFIG.RIGHT_SIDE_THRESHOLD);
      x = svgWidth * CONFIG.RIGHT_SIDE_THRESHOLD + CONFIG.MIN_POINT_MARGIN + 
          ((pointSeed * 17) % 997) / 997 * (rightSideWidth - (CONFIG.MIN_POINT_MARGIN * 2));
      y = centralYStart + CONFIG.MIN_POINT_MARGIN + 
          ((pointSeed * 31) % 991) / 991 * (centralYHeight - (CONFIG.MIN_POINT_MARGIN * 2));
    } else {
      x = CONFIG.MIN_POINT_MARGIN + 
          ((pointSeed * 17) % 997) / 997 * (svgWidth - (CONFIG.MIN_POINT_MARGIN * 2));
      y = CONFIG.MIN_POINT_MARGIN + 
          ((pointSeed * 31) % 991) / 991 * (svgHeight - (CONFIG.MIN_POINT_MARGIN * 2));
    }
    
    // Calculate radius based on seed
    const sizeSeed = simpleHash(`${memberId}-${memberName}-size-${i}`);
    const sizeVariation = sizeSeed % 100;
    
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
  
  const structuredPoints = [];
  const randomPoints = [];
  points.forEach((pt, idx) => {
    pt.group === 'structured' ? structuredPoints.push(idx) : randomPoints.push(idx);
  });
  
  // Structured–structured
  for (let i = 0; i < connectionCount; i++) {
    if (i >= structuredPoints.length) continue;
    const a = structuredPoints[i % structuredPoints.length];
    const seed = simpleHash(`${memberId}-${memberName}-conn-${i}`);
    if (structuredPoints.length > 1) {
      const off = 1 + (seed % (structuredPoints.length - 1));
      const b = structuredPoints[(i + off) % structuredPoints.length];
      if (a !== b) {
        connections.push({
          x1: points[a].x, y1: points[a].y,
          x2: points[b].x, y2: points[b].y,
          id: `connection-structured-${i}`,
          type: 'structured'
        });
      }
    }
  }
  
  // Proximity–random
  const seen = new Set();
  for (let i = 0; i < randomPoints.length; i++) {
    for (let j = i + 1; j < randomPoints.length; j++) {
      const p = randomPoints[i], q = randomPoints[j];
      const dx = points[p].x - points[q].x, dy = points[p].y - points[q].y;
      if (Math.hypot(dx, dy) <= proximityThreshold) {
        const cid = `proximity-${Math.min(p,q)}-${Math.max(p,q)}`;
        if (!seen.has(cid)) {
          seen.add(cid);
          connections.push({
            x1: points[p].x, y1: points[p].y,
            x2: points[q].x, y2: points[q].y,
            id: cid, type: 'proximity'
          });
        }
      }
    }
  }
  
  return { points, connections };
}

// Update the network visualization based on member data
function updateNetworkVisualization(member) {
  if (lineDisplayTimeout) {
    clearTimeout(lineDisplayTimeout);
    lineDisplayTimeout = null;
  }

  const { points, connections } = calculateNetworkPositions(member);
  const existingNodes = {};

  // Remove existing curves
  networkSvg.querySelectorAll('path').forEach(p => p.remove());

  // Cache existing circles
  networkSvg.querySelectorAll('circle').forEach(c => {
    existingNodes[c.getAttribute('data-id')] = c;
  });

  // Draw/update dots
  points.forEach((pt, i) => {
    let circle = existingNodes[pt.id];
    if (circle && i < prevPoints.length) {
      circle.setAttribute('cx', pt.x);
      circle.setAttribute('cy', pt.y);
      circle.setAttribute('r', pt.radius);
    } else {
      circle = document.createElementNS('http://www.w3.org/2000/svg','circle');
      circle.setAttribute('cx', pt.x);
      circle.setAttribute('cy', pt.y);
      circle.setAttribute('r', pt.radius);
      circle.setAttribute('fill','#fff');
      circle.setAttribute('class', pt.animClass);
      circle.setAttribute('style', `animation-delay:${(i*0.05)%2}s;opacity:0`);
      circle.setAttribute('data-id', pt.id);
      circle.setAttribute('data-group', pt.group);
      networkSvg.appendChild(circle);
      setTimeout(() => circle.style.opacity = pt.opacity,
                 CONFIG.DOT_FADE_DELAY_BASE + i * CONFIG.DOT_FADE_DELAY_STEP);
    }
  });

  // Remove stale dots
  if (prevPoints.length) {
    const keep = new Set(points.map(p=>p.id));
    Object.keys(existingNodes).forEach(id => {
      if (!keep.has(id)) {
        const c = existingNodes[id];
        c.style.opacity = 0;
        setTimeout(() => c.remove(), CONFIG.DOT_REMOVAL_TIME);
      }
    });
  }

  // Draw curves after dots settle
  lineDisplayTimeout = setTimeout(() => {
    connections.forEach((conn, i) => {
      const p = document.createElementNS('http://www.w3.org/2000/svg','path');
      p.setAttribute('d', quadCurveD(conn.x1, conn.y1, conn.x2, conn.y2, 40));
      p.setAttribute('fill','none');
      p.setAttribute('stroke','#fff');
      p.setAttribute('stroke-width', CONFIG.CONNECTION_STROKE_WIDTH);
      p.setAttribute('data-id', conn.id);
      p.setAttribute('data-type', conn.type || 'default');
      p.setAttribute('style','opacity:0');
      networkSvg.appendChild(p);

      const mult = conn.type === 'proximity' ? 0.5 : 1;
      setTimeout(() => p.style.opacity = CONFIG.CONNECTION_OPACITY,
                 i * CONFIG.CONNECTION_FADE_DELAY_STEP * mult);
    });
  }, CONFIG.DOT_TRANSITION_TIME);

  prevPoints = [...points];
  prevConnections = [...connections];
}
