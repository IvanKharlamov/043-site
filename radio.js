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

  // for canceling stale loads
  let loadId = 0;

  // Web Audio analyser + buffers + fade gain
  let analyser, bufLen, freqData, timeData, gainNode, audioCtx;

  // inactivity timer for auto-hide UI
  let inactivityTimer;
  function resetInactivityTimer() {
    document.body.classList.remove('hide-ui');
    clearTimeout(inactivityTimer);
    if (!audio.paused) {
      inactivityTimer = setTimeout(() => {
        document.body.classList.add('hide-ui');
      }, 4000);
    }
  }

  // always show UI on pause
  audio.addEventListener('pause', () => {
    clearTimeout(inactivityTimer);
    document.body.classList.remove('hide-ui');
  });

  // kick off auto-hide on mouse move and playback start
  document.addEventListener('mousemove', resetInactivityTimer);
  audio.addEventListener('play', resetInactivityTimer);

  // setup shader canvas
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

  // ——— fade-pause: gradual gain decrease over 0.5s ———
  let isFading = false;
  function fadePause() {
    if (!gainNode) {
      audio.pause();
      return;
    }
    if (isFading) return;
    isFading = true;

    const now = audioCtx.currentTime;
    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setValueAtTime(gainNode.gain.value, now);
    gainNode.gain.linearRampToValueAtTime(0, now + 0.5);

    setTimeout(() => {
      audio.pause();
      gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
      gainNode.gain.setValueAtTime(1, audioCtx.currentTime);
      isFading = false;
    }, 500);
  }

  // play/pause cross-fade
  playBtn.addEventListener('click', () => {
    if (audio.paused) {
      if (isFading && gainNode) {
        gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
        gainNode.gain.setValueAtTime(1, audioCtx.currentTime);
        isFading = false;
      }
      audio.play();
    } else {
      fadePause();
    }
  });

  // keep the button-state in sync with actual playback
  audio.addEventListener('play',  () => playBtn.classList.add('button--active'));
  audio.addEventListener('pause', () => playBtn.classList.remove('button--active'));

  // format time as M:SS
  function fmt(t) {
    const m = Math.floor(t/60),
          s = Math.floor(t%60).toString().padStart(2,'0');
    return `${m}:${s}`;
  }
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

  // volume control (independent of fade)
  volumeSlider.addEventListener('input', () => {
    audio.volume = parseFloat(volumeSlider.value);
  });

  // helper: average of freq bins
  function avg(arr, start, end) {
    let s = 0;
    for (let i = start; i < end; i++) s += arr[i];
    return s / ((end - start) || 1) / 255;
  }

  // animation loop: feed uniforms to shader
  function renderLoop() {
    requestAnimationFrame(renderLoop);
    analyser.getByteFrequencyData(freqData);
    const low  = avg(freqData, 0,           bufLen/3|0);
    const mid  = avg(freqData, bufLen/3|0,  2*bufLen/3|0);
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

  // initialize Web Audio analyser
  function setupAudioAnalyser() {
    audioCtx   = new (window.AudioContext||window.webkitAudioContext)();
    const srcNode = audioCtx.createMediaElementSource(audio);
    analyser   = audioCtx.createAnalyser();
    gainNode   = audioCtx.createGain();
    srcNode.connect(analyser);
    analyser.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    analyser.fftSize = 512;
    bufLen   = analyser.frequencyBinCount;
    freqData = new Uint8Array(bufLen);
    timeData = new Uint8Array(analyser.fftSize);
    gainNode.gain.value = 1;
    renderLoop();
  }

  // select & load a track with ≥1s enforced load and cancelation
  async function selectSong(idx) {
    const thisLoad  = ++loadId;
    const startTime = Date.now();
    listEl.querySelectorAll('li').forEach((li,i) => li.classList.toggle('active', i===idx));
    const { title, description, src, shader } = songs[idx];
    titleEl.textContent = title;
    descEl.textContent  = description;
    loadingEl.classList.remove('hidden');
    const shaderPromise = fetch(shader).then(r=>r.text()).then(src=>sandbox.load(src));
    audio.pause();
    audio.src = src; audio.load();
    const audioPromise = new Promise(res => {
      const onCan = () => { audio.removeEventListener('canplaythrough', onCan); res(); };
      audio.addEventListener('canplaythrough', onCan);
      setTimeout(onCan, 3000);
    });
    await Promise.all([shaderPromise, audioPromise]);
    if (thisLoad!==loadId) return;
    const elapsed = Date.now() - startTime;
    if (elapsed<1000) { await new Promise(r=>setTimeout(r,1000-elapsed)); if (thisLoad!==loadId) return; }
    loadingEl.classList.add('hidden');
    audio.play();
  }

  // load playlist and initialize
  const { songs } = await fetch('json/radio.json').then(r=>r.json());
  songs.forEach((s,i)=>{ const li = document.createElement('li'); li.textContent = s.title; li.addEventListener('click', ()=>selectSong(i)); listEl.append(li); });
  audio.addEventListener('play', ()=>{ if (!analyser) setupAudioAnalyser(); });
  // start first track
  selectSong(0);
})();
