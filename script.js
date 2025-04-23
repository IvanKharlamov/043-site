// Main script handling member data and selection
let members = [];
let currentIndex = 0;
const container = document.getElementById('line-container');
const description = document.getElementById('member-description');

// Fetch the members data from the JSON file
fetch('members.json')
  .then(res => res.json())
  .then(data => {
    members = data;
    renderFolders();
    updateActiveEntry();
    initNetworkVisualization();
  })
  .catch(error => {
    console.error('Error loading members data:', error);
    description.innerHTML = '<p class="text-red-500">Error loading member data. Please try again later.</p>';
  });

// Create the visual folder entries for each member
function renderFolders() {
  container.innerHTML = '';
  members.forEach((member, index) => {
    const entry = document.createElement('div');
    entry.className = 'folder-entry fade-transition';
    
    // Create the tab part (left side)
    const tabElement = document.createElement('div');
    tabElement.className = 'folder-tab';
    tabElement.innerHTML = `<span class="folder-id">${member.id}</span>`;
    
    // Create the body part (right side)
    const bodyElement = document.createElement('div');
    bodyElement.className = 'folder-body';
    bodyElement.innerHTML = `<span class="folder-area">${member.area}</span>`;
    
    // Add the parts to the folder entry
    entry.appendChild(tabElement);
    entry.appendChild(bodyElement);
    
    // Add click event
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
  // Update which folder is active
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