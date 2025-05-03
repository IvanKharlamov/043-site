// radio.js
(async () => {
  // DOM refs
  const listEl        = document.getElementById('song-list');
  const titleEl       = document.getElementById('song-title');
  const descEl        = document.getElementById('song-desc');
  const loadingEl     = document.getElementById('loading');
  const playBtn       = document.getElementById('play-btn');
  const currentTimeEl = document.getElementById('current-time');
  const durationEl    = document.getElementById('duration');
  const seekSlider    = document.getElementById('seek-slider');
  const volumeSlider  = document.getElementById('volume-slider');

  // create & configure audio element
  const audio = new Audio();
  audio.crossOrigin = 'anonymous';

  // setup shader canvas
  const canvas  = document.getElementById('bgCanvas');
  const sandbox = new GlslCanvas(canvas);

  function resizeCanvas() {
    const w = window.innerWidth, h = window.innerHeight;
    canvas.width = w; canvas.height = h;
    sandbox.setUniform('u_resolution', [w, h]);
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // play/pause toggle
  playBtn.addEventListener('click', () => {
    audio.paused ? audio.play() : audio.pause();
  });
  audio.addEventListener('play',  () => playBtn.textContent = '⏸️');
  audio.addEventListener('pause', () => playBtn.textContent = '▶️');

  // time & seek
  function fmt(t) {
    const m = Math.floor(t/60), s = Math.floor(t%60).toString().padStart(2,'0');
    return `${m}:${s}`;
  }
  audio.addEventListener('loadedmetadata', () => {
    durationEl.textContent = fmt(audio.duration);
    seekSlider.max = audio.duration;
  });
  audio.addEventListener('timeupdate', () => {
    seekSlider.value       = audio.currentTime;
    currentTimeEl.textContent = fmt(audio.currentTime);
  });
  seekSlider.addEventListener('input', () => {
    audio.currentTime = parseFloat(seekSlider.value);
  });

  // volume slider
  volumeSlider.addEventListener('input', () => {
    audio.volume = parseFloat(volumeSlider.value);
  });

  // load playlist JSON
  const { songs } = await fetch('json/radio.json').then(r => r.json());
  songs.forEach((s, i) => {
    const li = document.createElement('li');
    li.textContent = s.title;
    li.addEventListener('click', () => selectSong(i));
    listEl.append(li);
  });

  // helper: wait until audio can play through (or timeout)
  function waitForAudioLoad() {
    return new Promise(res => {
      let done = false;
      const onCan = () => { if (!done) { done = true; res(); } };
      audio.addEventListener('canplaythrough', onCan);
      setTimeout(onCan, 3000);
    });
  }

  // select & load a track
  let currentShaderPromise, audioReadyPromise;
  async function selectSong(idx) {
    // highlight in playlist
    listEl.querySelectorAll('li').forEach((li,i) => {
      li.classList.toggle('active', i === idx);
    });
    const { title, description, src, shader } = songs[idx];
    titleEl.textContent = title;
    descEl.textContent  = description;

    // show loading overlay
    loadingEl.classList.remove('hidden');

    // 1) load & compile shader
    currentShaderPromise = fetch(shader)
      .then(r => r.text())
      .then(src => sandbox.load(src));

    // 2) load audio
    audio.pause();
    audio.src = src;
    audio.load();
    audioReadyPromise = waitForAudioLoad();

    // wait for both to finish
    await Promise.all([currentShaderPromise, audioReadyPromise]);

    // hide loader & start playback
    loadingEl.classList.add('hidden');
    audio.play();
  }

  // Web Audio analyser + data buffers
  let analyser, bufLen, freqData, timeData;
  function setupAudioAnalyser() {
    const ctx     = new (window.AudioContext||window.webkitAudioContext)();
    const srcNode = ctx.createMediaElementSource(audio);
    analyser       = ctx.createAnalyser();
    srcNode.connect(analyser);
    analyser.connect(ctx.destination);
    analyser.fftSize = 512;

    bufLen   = analyser.frequencyBinCount; // 256
    freqData = new Uint8Array(bufLen);
    timeData = new Uint8Array(analyser.fftSize);

    renderLoop();
  }

  // average of freq bins [start, end)
  function avg(arr, start, end) {
    let s = 0;
    for (let i = start; i < end; i++) s += arr[i];
    return s / ((end - start) || 1) / 255;
  }

  // per-frame visual update
  function renderLoop() {
    requestAnimationFrame(renderLoop);

    // get frequency data
    analyser.getByteFrequencyData(freqData);
    const low  = avg(freqData, 0,         bufLen/3|0);
    const mid  = avg(freqData, bufLen/3|0, 2*bufLen/3|0);
    const high = avg(freqData, 2*bufLen/3|0, bufLen);

    // get time-domain & compute RMS volume
    analyser.getByteTimeDomainData(timeData);
    let sumSq = 0;
    for (let i = 0; i < timeData.length; i++) {
      const x = (timeData[i] / 128) - 1; // map [0,255]→[-1,1]
      sumSq += x*x;
    }
    const rms = Math.sqrt(sumSq / timeData.length);

    // push uniforms
    const t = performance.now() * 0.001;
    sandbox.setUniform('u_time',   t);
    sandbox.setUniform('u_low',    low);
    sandbox.setUniform('u_mid',    mid);
    sandbox.setUniform('u_high',   high);
    sandbox.setUniform('u_volume', rms);
  }

  // once user hits play, start analyser (one-time)
  audio.addEventListener('play', () => {
    if (!analyser) setupAudioAnalyser();
  });

  // start with first track
  selectSong(0);
})();
