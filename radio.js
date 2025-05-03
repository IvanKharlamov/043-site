(async () => {
  const listEl   = document.getElementById('song-list');
  const titleEl  = document.getElementById('song-title');
  const descEl   = document.getElementById('song-desc');
  const audio    = document.getElementById('audio');
  const canvas   = document.getElementById('bgCanvas');

  // 1) init glsl-canvas
  const sandbox = new GlslCanvas(canvas);

  // 2) fetch & load external shader
  const shaderSrc = await fetch('shaders/radio.frag').then(r => r.text());
  sandbox.load(shaderSrc);

  // 3) make sure resolution uniform stays up-to-date
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    canvas.width = w;  canvas.height = h;
    sandbox.setUniform('u_resolution', [w, h]);
  }
  window.addEventListener('resize', resize);
  resize();

  // 4) load playlist JSON
  const { songs } = await fetch('json/radio.json').then(r => r.json());
  songs.forEach((s,i) => {
    const li = document.createElement('li');
    li.textContent = s.title;
    li.addEventListener('click', () => selectSong(i));
    listEl.append(li);
  });

  let analyser, dataArray, bufLen;

  function selectSong(idx) {
    // highlight
    listEl.querySelectorAll('li').forEach((li,i) => li.classList.toggle('active', i===idx));
    const s = songs[idx];
    titleEl.textContent = s.title;
    descEl.textContent  = s.description;
    audio.src = s.src;
    audio.play();
  }

  function setupAudio() {
    const ctx  = new (window.AudioContext||window.webkitAudioContext)();
    const src  = ctx.createMediaElementSource(audio);
    analyser = ctx.createAnalyser();
    src.connect(analyser);
    analyser.connect(ctx.destination);
    analyser.fftSize = 512;
    bufLen = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufLen);
    renderLoop();
  }

  // average utility
  function avg(arr, from, to) {
    let sum=0;
    for(let i=from; i<to; i++) sum += arr[i];
    return (sum / ((to-from)||1)) / 255;
  }

  function renderLoop() {
    requestAnimationFrame(renderLoop);
    analyser.getByteFrequencyData(dataArray);

    // split into three bands
    const low  = avg(dataArray, 0,            bufLen/3|0);
    const mid  = avg(dataArray, bufLen/3|0,    2*bufLen/3|0);
    const high = avg(dataArray, 2*bufLen/3|0,  bufLen);

    const t = performance.now() * 0.001;

    // push uniforms
    sandbox.setUniform('u_time',  t);
    sandbox.setUniform('u_low',   low);
    sandbox.setUniform('u_mid',   mid);
    sandbox.setUniform('u_high',  high);
  }

  audio.addEventListener('play', () => {
    if (!analyser) setupAudio();
  });

  // start first track
  selectSong(0);
})();
