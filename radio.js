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

  // for canceling stale loads
  let loadId = 0;

  // Web Audio analyser + buffers
  let analyser, bufLen, freqData, timeData;

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

	const playBtn = document.getElementById('play-btn');

	playBtn.addEventListener('click', () => {
	  if (audio.paused) audio.play();
	  else               audio.pause();
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

  // volume control
  volumeSlider.addEventListener('input', () => {
    audio.volume = parseFloat(volumeSlider.value);
  });

  // helper: average of freq bins [start,end)
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
    const ctx     = new (window.AudioContext||window.webkitAudioContext)();
    const srcNode = ctx.createMediaElementSource(audio);
    analyser       = ctx.createAnalyser();
    srcNode.connect(analyser);
    analyser.connect(ctx.destination);
    analyser.fftSize = 512;

    bufLen   = analyser.frequencyBinCount;
    freqData = new Uint8Array(bufLen);
    timeData = new Uint8Array(analyser.fftSize);

    renderLoop();
  }

  // select & load a track with ≥1s enforced load and cancelation
  async function selectSong(idx) {
    const thisLoad  = ++loadId;
    const startTime = Date.now();

    // highlight in playlist
    listEl.querySelectorAll('li').forEach((li,i) => {
      li.classList.toggle('active', i === idx);
    });
    const { title, description, src, shader } = songs[idx];
    titleEl.textContent = title;
    descEl.textContent  = description;

    // show loader
    loadingEl.classList.remove('hidden');

    // 1) load & compile shader
    const shaderPromise = fetch(shader)
      .then(r => r.text())
      .then(src => sandbox.load(src));

    // 2) load audio
    audio.pause();
    audio.src = src;
    audio.load();
    const audioPromise = new Promise(res => {
      const onCan = () => {
        audio.removeEventListener('canplaythrough', onCan);
        res();
      };
      audio.addEventListener('canplaythrough', onCan);
      setTimeout(onCan, 3000);
    });

    // wait for both
    await Promise.all([shaderPromise, audioPromise]);

    // if user has selected another track, abort
    if (thisLoad !== loadId) return;

    // enforce minimum 1s load time
    const elapsed = Date.now() - startTime;
    if (elapsed < 1000) {
      await new Promise(r => setTimeout(r, 1000 - elapsed));
      if (thisLoad !== loadId) return;
    }

    // hide loader & play
    loadingEl.classList.add('hidden');
    audio.play();
  }

  // load playlist JSON and initialize
  const { songs } = await fetch('json/radio.json').then(r => r.json());
  songs.forEach((s, i) => {
    const li = document.createElement('li');
    li.textContent = s.title;
    li.addEventListener('click', () => selectSong(i));
    listEl.append(li);
  });

  // once user hits play, start analyser (one-time)
  audio.addEventListener('play', () => {
    if (!analyser) setupAudioAnalyser();
  });

  // start first track
  selectSong(0);
})();
