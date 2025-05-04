
(async () => {
  const listEl        = document.getElementById('song-list');
  const titleEl       = document.getElementById('song-title');
  const descEl        = document.getElementById('song-desc');
  const loadingEl     = document.getElementById('loading');
  const playBtn       = document.getElementById('play-btn');
  const iconPlay      = document.getElementById('icon-play');
  const iconPause     = document.getElementById('icon-pause');
  const currentTimeEl = document.getElementById('current-time');
  const durationEl    = document.getElementById('duration');
  const seekSlider    = document.getElementById('seek-slider');
  const volumeSlider  = document.getElementById('volume-slider');

  const audio = new Audio();
  audio.crossOrigin = 'anonymous';

  const canvas  = document.getElementById('bgCanvas');
  const sandbox = new GlslCanvas(canvas);
  function resizeCanvas() {
    const w = window.innerWidth, h = window.innerHeight;
    canvas.width  = w;
    canvas.height = h;
    sandbox.setUniform('u_resolution', [w, h]);
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  let analyser;
  function setupAudioAnalyser() {
    const ctx     = new (window.AudioContext||window.webkitAudioContext)();
    const srcNode = ctx.createMediaElementSource(audio);
    analyser       = ctx.createAnalyser();
    srcNode.connect(analyser);
    analyser.connect(ctx.destination);
    analyser.fftSize = 512;
    const bufLen   = analyser.frequencyBinCount;
    const freqData = new Uint8Array(bufLen);
    const timeData = new Uint8Array(analyser.fftSize);
    function renderLoop() {
      requestAnimationFrame(renderLoop);
      analyser.getByteFrequencyData(freqData);
      const low  = avg(freqData, 0,         bufLen/3|0);
      const mid  = avg(freqData, bufLen/3|0, 2*bufLen/3|0);
      const high = avg(freqData, 2*bufLen/3|0, bufLen);
      analyser.getByteTimeDomainData(timeData);
      let sumSq = 0;
      for (let i = 0; i < timeData.length; i++) {
        const x = (timeData[i] / 128) - 1;
        sumSq += x*x;
      }
      const rms = Math.sqrt(sumSq / timeData.length);
      const t = performance.now() * 0.001;
      sandbox.setUniform('u_time',   t);
      sandbox.setUniform('u_low',    low);
      sandbox.setUniform('u_mid',    mid);
      sandbox.setUniform('u_high',   high);
      sandbox.setUniform('u_volume', rms);
    }
    renderLoop();
  }
  function avg(arr, start, end) {
    let s = 0;
    for (let i = start; i < end; i++) s += arr[i];
    return s / ((end - start) || 1) / 255;
  }

  playBtn.addEventListener('click', () => {
    if (audio.paused) audio.play(); else audio.pause();
  });
  audio.addEventListener('play', () => {
    iconPlay.classList.add('hidden');
    iconPause.classList.remove('hidden');
    playBtn.classList.add('playing');
    if (!analyser) setupAudioAnalyser();
  });
  audio.addEventListener('pause', () => {
    iconPlay.classList.remove('hidden');
    iconPause.classList.add('hidden');
    playBtn.classList.remove('playing');
  });

  audio.addEventListener('loadedmetadata', () => {
    durationEl.textContent = fmt(audio.duration);
    seekSlider.max         = audio.duration;
  });
  audio.addEventListener('timeupdate', () => {
    seekSlider.value          = audio.currentTime;
    currentTimeEl.textContent = fmt(audio.currentTime);
  });
  seekSlider.addEventListener('input', () => {
    audio.currentTime = parseFloat(seekSlider.value);
  });
  volumeSlider.addEventListener('input', () => {
    audio.volume = parseFloat(volumeSlider.value);
  });

  const { songs } = await fetch('json/radio.json').then(r => r.json());
  songs.forEach((s, i) => {
    const li = document.createElement('li');
    li.textContent = s.title;
    li.addEventListener('click', () => selectSong(i));
    listEl.append(li);
  });

  let loadToken = 0;
  async function selectSong(idx) {
    loadToken++;
    const token = loadToken;
    listEl.querySelectorAll('li').forEach((li,i) => {
      li.classList.toggle('active', i === idx);
    });
    const { title, description, src, shader } = songs[idx];
    titleEl.textContent = title;
    descEl.textContent  = description;

    loadingEl.classList.remove('hidden');
    const start = performance.now();

    // load shader & audio
    const shaderPromise = fetch(shader).then(r => r.text()).then(src => sandbox.load(src));
    audio.pause();
    audio.src = src;
    audio.load();
    const audioReady = new Promise(res => {
      let done = false;
      const onCan = () => { if (!done) { done = true; res(); } };
      audio.addEventListener('canplaythrough', onCan);
      setTimeout(onCan, 3000);
    });

    await Promise.all([shaderPromise, audioReady]);
    const elapsed = performance.now() - start;
    if (elapsed < 1000) await new Promise(r => setTimeout(r, 1000 - elapsed));

    if (token === loadToken) {
      loadingEl.classList.add('hidden');
      audio.play();
    }
  }

  selectSong(0);
})();
