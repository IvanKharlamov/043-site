// radio-visualizer.js

// Exposes window.RadioVisualizer.create(canvas, analyser, audioCtx, getTime)
window.RadioVisualizer = (function() {
  class RadioVisualizer {
    /**
     * @param {HTMLCanvasElement} canvas
     * @param {AnalyserNode}      analyser
     * @param {AudioContext}      audioCtx
     * @param {Function}          getTime   – returns seconds (e.g. () => audio.currentTime)
     */
    constructor(canvas, analyser, audioCtx, getTime) {
      this.canvas   = canvas;
      this.analyser = analyser;
      this.audioCtx = audioCtx;
      this.getTime  = getTime;

      // init WebGL
      const gl = canvas.getContext('webgl');
      if (!gl) throw new Error('WebGL not supported');
      this.gl = gl;

      // static passthrough vertex shader
      this.vsSource = `
        attribute vec4 position;
        void main() {
          gl_Position = position;
        }
      `;

      // configure analyser & buffers
      analyser.fftSize    = 512;
      this.FFT_SIZE       = analyser.frequencyBinCount; // 256
      this.audioDataBuf   = new Uint8Array(this.FFT_SIZE * 2);

      this._createAudioTexture();
      this._createQuadBuffer();
      this._startRenderLoop();
    }

    _createAudioTexture() {
      const gl = this.gl;
      this.audioTex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.audioTex);
      gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.LUMINANCE,
        this.FFT_SIZE, 2, 0,
        gl.LUMINANCE, gl.UNSIGNED_BYTE,
        null
      );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }

    _createQuadBuffer() {
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
      this.bufferInfo = twgl.createBufferInfoFromArrays(this.gl, arrays);
    }

    /**
     * Fetches and compiles a new fragment shader.
     * @param {string} shaderUrl  URL to a .frag (or .glsl) file
     * @returns {Promise<void>}
     */
    async loadShader(shaderUrl) {
      const src = await fetch(shaderUrl).then(r => r.text());
      this.programInfo = twgl.createProgramInfo(this.gl, [
        this.vsSource,
        src
      ]);
    }

    _startRenderLoop() {
      const draw = () => {
        this._renderFrame();
        requestAnimationFrame(draw);
      };
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().then(() => requestAnimationFrame(draw));
      } else {
        requestAnimationFrame(draw);
      }
    }

    _renderFrame() {
      const gl = this.gl;
      if (!this.programInfo) return; // wait until loadShader() has been called

      // 1) read analyser data
      this.analyser.getByteFrequencyData(this.audioDataBuf.subarray(0, this.FFT_SIZE));
      this.analyser.getByteTimeDomainData(this.audioDataBuf.subarray(this.FFT_SIZE));

      // 2) upload to texture
      gl.bindTexture(gl.TEXTURE_2D, this.audioTex);
      gl.texSubImage2D(
        gl.TEXTURE_2D, 0,
        0, 0,
        this.FFT_SIZE, 2,
        gl.LUMINANCE, gl.UNSIGNED_BYTE,
        this.audioDataBuf
      );

      // 3) render quad
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      gl.useProgram(this.programInfo.program);
      twgl.setBuffersAndAttributes(gl, this.programInfo, this.bufferInfo);
      twgl.setUniforms(this.programInfo, {
        resolution: [gl.canvas.width, gl.canvas.height],
        // pull time from the provided callback
        time:       this.getTime(),
        audioData:  this.audioTex,
      });
      twgl.drawBufferInfo(gl, this.bufferInfo);
    }
  }

  return {
    create(canvas, analyser, audioCtx, getTime) {
      return new RadioVisualizer(canvas, analyser, audioCtx, getTime);
    }
  };
})();
