// radio.js
(async () => {
  // ——— DOM refs ———
  const listEl        = document.getElementById('song-list');
  const titleEl       = document.getElementById('song-title');
  const descEl        = document.getElementById('song-desc');
  const loadingEl     = document.getElementById('loading');
  const playBtn       = document.getElementById('play-btn');
  const currentTimeEl = document.getElementById('current-time');
  const durationEl    = document.getElementById('duration');
  const seekSlider    = document.getElementById('seek-slider');
  const volumeSlider  = document.getElementById('volume-slider');

  // ——— Audio element + Web Audio graph ———
  const audio = new Audio();
  audio.crossOrigin = 'anonymous';

  const audioCtx  = new (window.AudioContext || window.webkitAudioContext)();
  const srcNode   = audioCtx.createMediaElementSource(audio);
  const fadeGain  = audioCtx.createGain();     // for fade-out
  const analyser  = audioCtx.createAnalyser(); // for shader uniforms
  const volGain   = audioCtx.createGain();     // for user volume slider

  // chain: audio → fadeGain → analyser → volGain → destination
  srcNode.connect(fadeGain);
  fadeGain.connect(analyser);
  analyser.connect(volGain);
  volGain.connect(audioCtx.destination);

  // initial gains
  fadeGain.gain.setValueAtTime(1, audioCtx.currentTime);
  volGain.gain.setValueAtTime(1, audioCtx.currentTime);

  // analyser config
  analyser.fftSize = 512;
  const bufLen   = analyser.frequencyBinCount;
  const freqData = new Uint8Array(bufLen);
  const timeData = new Uint8Array(analyser.fftSize);

  // ——— Shader canvas setup ———
  const canvas  = document.getElementById('bgCanvas');
  const audioTexCanvas = document.createElement('canvas');
  const FFT_SIZE = bufLen; // usually 256
  audioTexCanvas.width  = FFT_SIZE;
  audioTexCanvas.height = 2;
  audioTexCanvas.style.display = 'none';
  document.body.appendChild(audioTexCanvas);
  const sandbox = new GlslCanvas(canvas, {
   channels: [ audioTexCanvas ]
 });
  function resizeCanvas() {
    const w = window.innerWidth, h = window.innerHeight;
    canvas.width  = w;
    canvas.height = h;
    sandbox.setUniform('u_resolution', [w, h]);
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // ——— Audio‐texture setup (ShaderToy style) ———
  const audioTexCtx     = audioTexCanvas.getContext('2d');
  const audioImageData  = audioTexCtx.createImageData(FFT_SIZE, 2);
  // bind this canvas as iChannel0
  //sandbox.setUniform('iChannel0', audioTexCanvas);

  // ——— Time formatting ———
  function fmt(t) {
    const m = Math.floor(t / 60),
          s = Math.floor(t % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  // ——— Audio element events ———
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

  // keep play/pause icon in sync for programmatic pause/play
  audio.addEventListener('play',  () => playBtn.classList.add('button--active'));
  audio.addEventListener('pause', () => playBtn.classList.remove('button--active'));

  // ——— Volume slider → volGain (user-controlled) ———
  volumeSlider.addEventListener('input', () => {
    const v = parseFloat(volumeSlider.value);
    volGain.gain.setValueAtTime(v, audioCtx.currentTime);
  });

  // ——— Inactivity timer for auto-hide UI ———
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
  audio.addEventListener('pause', () => {
    clearTimeout(inactivityTimer);
    document.body.classList.remove('hide-ui');
  });
  document.addEventListener('mousemove', resetInactivityTimer);
  audio.addEventListener('play', resetInactivityTimer);

  // ——— Fade-out + pause logic (logarithmic then zero) ———
  let fadeTimeout, isFading = false;
  const FADE_DUR = 0.5; // seconds

  function fadeOutAndPause() {
    if (isFading) return;
    isFading = true;
    const now = audioCtx.currentTime;

    fadeGain.gain.cancelScheduledValues(now);
    fadeGain.gain.setValueAtTime(fadeGain.gain.value, now);
    fadeGain.gain.exponentialRampToValueAtTime(0.01, now + FADE_DUR*0.8);
    fadeGain.gain.linearRampToValueAtTime(0, now + FADE_DUR);

    fadeTimeout = setTimeout(() => {
      audio.pause();
      isFading = false;
    }, FADE_DUR * 1000);
  }

  function cancelFade() {
    clearTimeout(fadeTimeout);
    const now = audioCtx.currentTime;
    fadeGain.gain.cancelScheduledValues(now);
    fadeGain.gain.setValueAtTime(1, now);
    isFading = false;
  }

  playBtn.addEventListener('click', () => {
    if (audio.paused) {
      cancelFade();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      audio.play();
    } else {
      playBtn.classList.remove('button--active');
      fadeOutAndPause();
    }
  });

  // ——— Shader uniforms render loop ———
  function avg(arr, start, end) {
    let sum = 0;
    for (let i = start; i < end; i++) sum += arr[i];
    return sum / ((end - start) || 1) / 255;
  }

  function renderLoop() {
    requestAnimationFrame(renderLoop);

    // fill audio texture rows
    analyser.getByteFrequencyData(freqData);
    analyser.getByteTimeDomainData(timeData);
    for (let x = 0; x < FFT_SIZE; x++) {
      const v0 = freqData[x];
      const v1 = timeData[x];
      // row0 (FFT)
      let idx = (0*FFT_SIZE + x)*4;
      audioImageData.data[idx+0] = v0;
      audioImageData.data[idx+1] = v0;
      audioImageData.data[idx+2] = v0;
      audioImageData.data[idx+3] = 255;
      // row1 (waveform)
      idx = (1*FFT_SIZE + x)*4;
      audioImageData.data[idx+0] = v1;
      audioImageData.data[idx+1] = v1;
      audioImageData.data[idx+2] = v1;
      audioImageData.data[idx+3] = 255;
    }
    audioTexCtx.putImageData(audioImageData, 0, 0);

    // compute bands + rms
    analyser.getByteFrequencyData(freqData);
    const low  = avg(freqData, 0,            bufLen/3|0);
    const mid  = avg(freqData, bufLen/3|0,   2*bufLen/3|0);
    const high = avg(freqData, 2*bufLen/3|0, bufLen);

    analyser.getByteTimeDomainData(timeData);
    let sumSq = 0;
    for (let i = 0; i < timeData.length; i++) {
      const x = (timeData[i] / 128) - 1;
      sumSq += x * x;
    }
    const rms = Math.sqrt(sumSq / timeData.length);

    // send uniforms
    const t = performance.now() * 0.001;
    sandbox.setUniform('u_time',   t);
    sandbox.setUniform('u_low',    low);
    sandbox.setUniform('u_mid',    mid);
    sandbox.setUniform('u_high',   high);
    sandbox.setUniform('u_volume', rms);
  }
  renderLoop();

  // ——— Track loading + selectSong ———
  let loadId = 0;
  async function selectSong(idx) {
    const thisLoad  = ++loadId;
    const startTime = Date.now();

    // highlight playlist
    listEl.querySelectorAll('li').forEach((li,i) => {
      li.classList.toggle('active', i === idx);
    });
    const { title, description, src, shader } = songs[idx];
    titleEl.textContent = title;
    descEl.textContent  = description;

    loadingEl.classList.remove('hidden');

    // load shader
    const shaderPromise = fetch(shader)
      .then(r => r.text())
      .then(srcCode => sandbox.load(srcCode));

    // prepare audio
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

    // wait both
    await Promise.all([shaderPromise, audioPromise]);
    if (thisLoad !== loadId) return;

    // enforce 1s minimum loader
    const elapsed = Date.now() - startTime;
    if (elapsed < 1000) {
      await new Promise(r => setTimeout(r, 1000 - elapsed));
      if (thisLoad !== loadId) return;
    }

    loadingEl.classList.add('hidden');
	if (audioCtx.state === 'suspended') {
	  await audioCtx.resume();
	}
    audio.play();
  }

  const { songs } = await fetch('json/radio.json').then(r => r.json());
  songs.forEach((s, i) => {
    const li = document.createElement('li');
    li.textContent = s.title;
    li.addEventListener('click', () => selectSong(i));
    listEl.append(li);
  });

  // start first track
  selectSong(0);
})();
