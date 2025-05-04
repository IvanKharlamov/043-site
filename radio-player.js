// radio-player.js

(async () => {
  // ——— DOM references ———
  const listEl        = document.getElementById('song-list');
  const titleEl       = document.getElementById('song-title');
  const descEl        = document.getElementById('song-desc');
  const loadingEl     = document.getElementById('loading');
  const playBtn       = document.getElementById('play-btn');
  const currentTimeEl = document.getElementById('current-time');
  const durationEl    = document.getElementById('duration');
  const seekSlider    = document.getElementById('seek-slider');
  const volumeSlider  = document.getElementById('volume-slider');
  const canvas        = document.getElementById('bgCanvas');

  // ——— Audio + Web Audio graph ———
  const audio    = new Audio();
  audio.crossOrigin = 'anonymous';
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const srcNode  = audioCtx.createMediaElementSource(audio);
  const fadeGain = audioCtx.createGain();
  const analyser = audioCtx.createAnalyser();
  const volGain  = audioCtx.createGain();

  srcNode.connect(fadeGain);
  fadeGain.connect(analyser);
  analyser.connect(volGain);
  volGain.connect(audioCtx.destination);

  fadeGain.gain.setValueAtTime(1, audioCtx.currentTime);
  volGain.gain.setValueAtTime(1, audioCtx.currentTime);

  // ——— Initialize visualizer, syncing time to audio.currentTime ———
  const visualizer = RadioVisualizer.create(
    canvas,
    analyser,
    audioCtx,
    () => audio.currentTime
  );

  // ——— Helper: format seconds as M:SS ———
  function fmt(t) {
    const m = Math.floor(t / 60),
          s = String(Math.floor(t % 60)).padStart(2, '0');
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
  audio.addEventListener('play',  () => playBtn.classList.add('button--active'));
  audio.addEventListener('pause', () => playBtn.classList.remove('button--active'));

  // ——— Volume control ———
  volumeSlider.addEventListener('input', () => {
    volGain.gain.setValueAtTime(parseFloat(volumeSlider.value), audioCtx.currentTime);
  });

  // ——— Inactivity auto-hide UI ———
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

  // ——— Fade-out + pause logic ———
  let fadeTimeout, isFading = false;
  const FADE_DUR = 0.5;
  function fadeOutAndPause() {
    if (isFading) return;
    isFading = true;
    const now = audioCtx.currentTime;
    fadeGain.gain.cancelScheduledValues(now);
    fadeGain.gain.setValueAtTime(fadeGain.gain.value, now);
    fadeGain.gain.exponentialRampToValueAtTime(0.01, now + FADE_DUR * 0.8);
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
      fadeOutAndPause();
    }
  });

  // ——— Playlist loading & selectSong (loads per-track shader) ———
  let loadId = 0;
  async function selectSong(idx) {
    const thisLoad  = ++loadId;
    const startTime = Date.now();

    // Highlight current selection
    listEl.querySelectorAll('li').forEach((li,i) => {
      li.classList.toggle('active', i === idx);
    });
    const { title, description, src, shader } = songs[idx];
    titleEl.textContent = title;
    descEl.textContent  = description;
    loadingEl.classList.remove('hidden');

    // Prepare audio
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

    // Load & compile this track’s shader
    const shaderPromise = visualizer.loadShader(shader);

    // Wait for both
    await Promise.all([audioPromise, shaderPromise]);
    if (thisLoad !== loadId) return;

    // Enforce 1s minimum spinner
    const elapsed = Date.now() - startTime;
    if (elapsed < 1000) {
      await new Promise(r => setTimeout(r, 1000 - elapsed));
      if (thisLoad !== loadId) return;
    }

    loadingEl.classList.add('hidden');
    if (audioCtx.state === 'suspended') await audioCtx.resume();
    audio.play();
  }

  // Fetch playlist JSON and populate UI
  const { songs } = await fetch('json/radio.json').then(r => r.json());
  songs.forEach((s, i) => {
    const li = document.createElement('li');
    li.textContent = s.title;
    li.addEventListener('click', () => selectSong(i));
    listEl.append(li);
  });

  // Optionally start first song automatically:
  // selectSong(0);
})();
