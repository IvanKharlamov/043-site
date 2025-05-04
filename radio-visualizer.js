// radio-visualizer.js

// Exposes window.RadioVisualizer.init(canvas, analyser, audioCtx)
window.RadioVisualizer = {
  /**
   * @param {HTMLCanvasElement} canvas  the <canvas> to render into
   * @param {AnalyserNode}      analyser the Web Audio AnalyserNode
   * @param {AudioContext}      audioCtx the AudioContext (so we can resume it)
   */
  init(canvas, analyser, audioCtx) {
    const gl = canvas.getContext('webgl');
    if (!gl) throw new Error('WebGL not supported');

    // ——— Compile shaders ———
    const vs = `
      attribute vec4 position;
      void main() {
        gl_Position = position;
      }
    `;
    const fs = `
      precision mediump float;
      uniform vec2 resolution;
      uniform sampler2D audioData;
      void main() {
        vec2 uv = gl_FragCoord.xy / resolution;
        float fftVal  = texture2D(audioData, vec2(uv.x, 0.0)).r;
        float waveVal = texture2D(audioData, vec2(uv.x, 1.0)).r;
        vec3 col = vec3(pow(fftVal, 5.0), waveVal, uv.y);
        gl_FragColor = vec4(col, 1.0);
      }
    `;
    const progInfo = twgl.createProgramInfo(gl, [vs, fs]);

    // ——— Prepare the 2×FFT texture ———
    analyser.fftSize = 512;
    const FFT_SIZE = analyser.frequencyBinCount; // 256
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

    // ——— Full-screen quad setup ———
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

    // buffer to hold FFT row + waveform row
    const audioDataBuf = new Uint8Array(FFT_SIZE * 2);

    // ——— Render loop ———
    function draw() {
      // 1) grab FFT + waveform
      analyser.getByteFrequencyData(audioDataBuf.subarray(0, FFT_SIZE));
      analyser.getByteTimeDomainData(audioDataBuf.subarray(FFT_SIZE));

      // 2) upload into our texture
      gl.bindTexture(gl.TEXTURE_2D, audioTex);
      gl.texSubImage2D(
        gl.TEXTURE_2D, 0,
        0, 0,
        FFT_SIZE, 2,
        gl.LUMINANCE, gl.UNSIGNED_BYTE,
        audioDataBuf
      );

      // 3) draw full-screen quad
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      gl.useProgram(progInfo.program);
      twgl.setBuffersAndAttributes(gl, progInfo, bufferInfo);
      twgl.setUniforms(progInfo, {
        resolution: [gl.canvas.width, gl.canvas.height],
        audioData: audioTex,
      });
      twgl.drawBufferInfo(gl, bufferInfo);

      requestAnimationFrame(draw);
    }

    // ensure AudioContext is resumed
    if (audioCtx.state === 'suspended') audioCtx.resume();
    requestAnimationFrame(draw);
  },
};
