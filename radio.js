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
  const canvas        = document.getElementById('bgCanvas');

  // ——— Audio element + Web Audio graph ———
  const audio   = new Audio();
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

  analyser.fftSize = 512;
  const FFT_SIZE   = analyser.frequencyBinCount; // 256
  const freqData   = new Uint8Array(FFT_SIZE);
  const timeData   = new Uint8Array(analyser.fftSize);

  // ——— Shader setup via TWGL ———
  const gl = canvas.getContext('webgl');
  // vertex shader
  const vs = `
    attribute vec4 position;
    void main() {
      gl_Position = position;
    }
  `;
  // fragment shader: row 0 = FFT, row 1 = waveform
  const fs = `
    precision mediump float;
    uniform vec2 resolution;
    uniform sampler2D audioData;
    void main() {
      vec2 uv = gl_FragCoord.xy / resolution;
      float fftVal  = texture2D(audioData, vec2(uv.x, 0.0)).r;
      float waveVal = texture2D(audioData, vec2(uv.x, 1.0)).r;
      // simple coloring example
      vec3 col = vec3(pow(fftVal, 5.0), waveVal, uv.y);
      gl_FragColor = vec4(col, 1.0);
    }
  `;
  const progInfo = twgl.createProgramInfo(gl, [vs, fs]);

  // create 2×FFT texture
  const audioTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, audioTex);
  gl.texImage2D(
    gl.TEXTURE_2D, 0, gl.LUMINANCE,
    FFT_SIZE, 2, 0,
    gl.LUMINANCE, gl.UNSIGNED_BYTE,
    null
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  // full-screen quad
  const arrays = {
    position: {
      numComponents: 2,
      data: [
        -1, -1,
         1, -1,
        -1,  1,
        -1,  1,
         1, -1,
         1,  1,
      ],
    },
  };
  const bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays);

  // buffer for uploading 2×FFT data
  const audioDataBuf = new Uint8Array(FFT_SIZE * 2);

  function renderLoop() {
    // pull FFT + waveform
    analyser.getByteFrequencyData(audioDataBuf.subarray(0, FFT_SIZE));
    analyser.getByteTimeDomainData(audioDataBuf.subarray(FFT_SIZE));

    // upload to texture
    gl.bindTexture(gl.TEXTURE_2D, audioTex);
    gl.texSubImage2D(
      gl.TEXTURE_2D, 0,
      0, 0,
      FFT_SIZE, 2,
      gl.LUMINANCE, gl.UNSIGNED_BYTE,
      audioDataBuf
    );

    // draw
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.useProgram(progInfo.program);
    twgl.setBuffersAndAttributes(gl, progInfo, bufferInfo);
    twgl.setUniforms(progInfo, {
      resolution: [gl.canvas.width, gl.canvas.height],
      audioData: audioTex,
    });
    twgl.drawBufferInfo(gl, bufferInfo);

    requestAnimationFrame(renderLoop);
  }

  // ——— Time formatting ———
  function fmt(t) {
    const m = Math.floor(t / 60),
          s = String(Math.floor(t % 60)).padStart(2, '0');
    return `${m}:${s}`;
  }

  // ——— Audio controls & events ———
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

  volumeSlider.addEventListener('input', () => {
    volGain.gain.setValueAtTime(parseFloat(volumeSlider.value), audioCtx.currentTime);
  });

  // inactivity UI hide
  let inactivityTimer, isFading = false, fadeTimeout;
  const FADE_DUR = 0.5;
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
      fadeOutAndPause();
    }
  });

  // ——— Playlist loading & selection ———
  let loadId = 0;
  async function selectSong(idx) {
    const thisLoad  = ++loadId;
    const startTime = Date.now();

    // highlight
    listEl.querySelectorAll('li').forEach((li,i) => {
      li.classList.toggle('active', i === idx);
    });
    const { title, description, src } = songs[idx];
    titleEl.textContent = title;
    descEl.textContent  = description;
    loadingEl.classList.remove('hidden');

    // load audio
    audio.pause();
    audio.src = src;
    audio.load();
    await Promise.race([
      new Promise(res => {
        const onCan = () => {
          audio.removeEventListener('canplaythrough', onCan);
          res();
        };
        audio.addEventListener('canplaythrough', onCan);
        setTimeout(onCan, 3000);
      }),
      new Promise(r => setTimeout(r, 5000))
    ]);
    if (thisLoad !== loadId) return;

    // minimum spinner time
    const elapsed = Date.now() - startTime;
    if (elapsed < 1000) await new Promise(r => setTimeout(r, 1000 - elapsed));
    if (thisLoad !== loadId) return;

    loadingEl.classList.add('hidden');
    if (audioCtx.state === 'suspended') await audioCtx.resume();
    audio.play();
  }

  const { songs } = await fetch('json/radio.json').then(r => r.json());
  songs.forEach((s,i) => {
    const li = document.createElement('li');
    li.textContent = s.title;
    li.addEventListener('click', () => selectSong(i));
    listEl.append(li);
  });

  // kick everything off
  requestAnimationFrame(renderLoop);
  // optionally autoplay first track:
  // selectSong(0);
})();
