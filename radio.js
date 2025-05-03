// radio.js
(async () => {
  const listEl = document.getElementById('song-list');
  const titleEl = document.getElementById('song-title');
  const descEl  = document.getElementById('song-desc');
  const audio   = document.getElementById('audio');
  const canvas  = document.getElementById('visualizer');
  const ctx     = canvas.getContext('2d');

  // Resize canvas to fill
  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  // Load playlist JSON
  const { songs } = await fetch('json/radio.json').then(r => r.json());

  // Populate sidebar
  songs.forEach((s, i) => {
    const li = document.createElement('li');
    li.textContent = s.title;
    li.classList.add('font-mono');
    li.addEventListener('click', () => selectSong(i));
    listEl.append(li);
  });

  let currentIndex = 0;
  let analyser, dataArray, bufferLength;

  // Switch to a given song
  function selectSong(idx) {
    currentIndex = idx;
    const s = songs[idx];
    // highlight active
    listEl.querySelectorAll('li').forEach((li, i) => {
      li.classList.toggle('active', i === idx);
    });
    titleEl.textContent = s.title;
    descEl.textContent  = s.description;
    audio.src = s.src;
    audio.play();
  }

  // Set up Web Audio API analyser
  function setupVisualizer() {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const srcNode  = audioCtx.createMediaElementSource(audio);
    analyser = audioCtx.createAnalyser();
    srcNode.connect(analyser);
    analyser.connect(audioCtx.destination);
    analyser.fftSize = 256;
    bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);
    draw();
  }

  function draw() {
    requestAnimationFrame(draw);
    analyser.getByteFrequencyData(dataArray);
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0,0,w,h);

    // simple radial bars
    const radius = Math.min(w,h) / 8;
    const cx = w/2, cy = h/2;
    const step = (Math.PI * 2) / bufferLength;
    dataArray.forEach((v, i) => {
      const angle = i * step;
      const len = (v / 255) * radius;
      const x1 = cx + Math.cos(angle) * radius;
      const y1 = cy + Math.sin(angle) * radius;
      const x2 = cx + Math.cos(angle) * (radius + len);
      const y2 = cy + Math.sin(angle) * (radius + len);
      ctx.strokeStyle = `hsla(${angle*180/Math.PI},80%,60%,0.5)`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x1,y1);
      ctx.lineTo(x2,y2);
      ctx.stroke();
    });
  }

  // init
  audio.addEventListener('play', () => {
    if (!analyser) setupVisualizer();
  });

  // start with first song
  selectSong(0);
})();
