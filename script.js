let members = [];
let currentIndex = 0;
const container = document.getElementById('line-container');
const description = document.getElementById('member-description');

fetch('members.json')
  .then(res => res.json())
  .then(data => {
members = data;
renderLines();
updateActiveEntry();
  });

function renderLines() {
  container.innerHTML = '';
  members.forEach((member, index) => {
const entry = document.createElement('div');
entry.className = 'line-entry fade-transition';
entry.innerHTML = `<img src="${member.img}" alt="${member.name}">`;
entry.addEventListener('click', () => {
  currentIndex = index;
  updateActiveEntry();
});
container.appendChild(entry);
  });
}

function updateActiveEntry() {
  Array.from(container.children).forEach((entry, index) => {
entry.classList.toggle('active', index === currentIndex);
  });

  const m = members[currentIndex];
  const id = m.id || (m.name === 'Dasha' ? '00000049' : m.name === 'Narek' ? '00000058' : '00000043');
  description.innerHTML = `
<div class="mb-4">
  <h2 class="text-2xl font-bold mb-1 tracking-wide uppercase">${m.name}</h2>
  <p class="text-sm text-gray-400 mb-1">${m.area}</p>
  <p class="text-sm text-gray-500 italic mb-1">ID: ${id}</p>
  <p class="text-xs text-gray-400 uppercase mb-4">Member since ${m.since || '2022'}</p>
  <h3 class="text-lg font-semibold mb-1">About</h3>
  <p class="mb-4 text-sm text-gray-400">Watermelons are round, juicy, and best served cold. They come in many varieties, each with its own texture and sweetness. In the summer, they symbolize gatherings, sticky fingers, and the hunt for the ripest slice. Farmers have long cultivated watermelon not only for food, but also for trade, storage, and cultural ceremonies. The sweetness of a watermelon, its weight, and even the sound it makes when tapped are essential in selecting the perfect one. It's not just a fruit — it's a seasonal signal and social magnet.</p>
  <h3 class="text-lg font-semibold mb-1">Cultural Relevance</h3>
  <p class="mb-4">In some parts of the world, watermelons are used in ceremonies, festivals, and design. Their green-striped surface is now iconic, and their color palette is often used in digital aesthetics and summer promotions.</p>
  <h3 class="text-lg font-semibold mb-1">Fun Facts</h3>
  <p>Seedless watermelons are a genetic marvel. A single watermelon is about 92% water. The largest watermelon ever grown weighed over 150 pounds.</p>
</div>
  `;
}