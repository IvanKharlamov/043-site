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
    entry.innerHTML = <img src="${member.img}" alt="${member.name}">;
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
  description.innerHTML = 
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
  ;
}