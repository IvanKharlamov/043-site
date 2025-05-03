// radio.js
(async () => {
  // DOM refs
  const listEl   = document.getElementById('song-list');
  const titleEl  = document.getElementById('song-title');
  const descEl   = document.getElementById('song-desc');
  const audio    = document.getElementById('audio');
  const canvas   = document.getElementById('bgCanvas');

  // init glslCanvas
  const sandbox = new GlslCanvas(canvas);
  const fragSrc = document.getElementById('fragShader').textContent;
  sandbox.load(fragSrc);

  // resize handler
  function resize() {
    sandbox.setUniform('u_resolution', [canvas.width = window.innerWidth, canvas.height = window.innerHeight]);
  }
  window.addEventListener('resize', resize);
  resize();

  // load JSON playlist
  const { songs } = await fetch('json/radio.json').then(r => r.json());
  songs.forEach((s,i) => {
    const li = document.createElement('li');
    li.textContent = s.title;
    li.onclick = () => selectSong(i);
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
    const ctx    = new (window.AudioContext||window.webkitAudioContext)();
    const src    = ctx.createMediaElementSource(audio);
    analyser     = ctx.createAnalyser();
    src.connect(analyser);
    analyser.connect(ctx.destination);
    analyser.fftSize = 512;
    bufLen     = analyser.frequencyBinCount;
    dataArray  = new Uint8Array(bufLen);
    animate();
  }

  // helper: average of array slice
  function avg(arr, start, end) {
    let sum=0, cnt=0;
    for(let i=start;i<end;i++){ sum += arr[i]; cnt++; }
    return sum/cnt/255;
  }

  function animate() {
    requestAnimationFrame(animate);
    analyser.getByteFrequencyData(dataArray);
    // split low/mid/high
    const low  = avg(dataArray, 0,         bufLen/3|0);
    const mid  = avg(dataArray, bufLen/3|0, 2*bufLen/3|0);
    const high = avg(dataArray, 2*bufLen/3|0, bufLen);
    const t = performance.now()*0.001;

    // push into shader
    sandbox.setUniform('u_time', t);
    sandbox.setUniform('u_low', low);
    sandbox.setUniform('u_mid', mid);
    sandbox.setUniform('u_high', high);
  }

  // start analyser on first play
  audio.addEventListener('play', () => {
    if (!analyser) setupAudio();
  });

  // kick off with first track
  selectSong(0);
})();
