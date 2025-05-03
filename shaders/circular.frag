#extension GL_OES_standard_derivatives : enable
#ifdef GL_ES
precision mediump float;
#endif

uniform vec2  u_resolution;
uniform float u_time;
uniform float u_low;     // bass band
uniform float u_mid;     // mid band
uniform float u_high;    // treble band
uniform float u_volume;  // overall RMS loudness

#define LINE_WIDTH           1.6
#define PRECISION            0.25
#define BANDS_COUNT          64.0
#define HIGH_FREQ_APPEARANCE 0.7
#define AMPLITUDE            4.0

// simple 1D hash
float hash1(float v) {
    return fract(sin(v * 124.14518) * 2123.14121) - 0.5;
}

// pick one of our 3 bands based on normalized freq
float getBand(float freq) {
    float val = freq < (1.0/3.0)
      ? u_low
      : (freq < (2.0/3.0) ? u_mid : u_high);
    return pow(val, 2.0 - HIGH_FREQ_APPEARANCE);
}

// smooth a single band
float getSmoothBand(float freq) {
    float v = getBand(freq);
    v = smoothstep(0.2, 1.0, v);
    return v * v;
}

// sum 64 sinusoids to form the waveform
float getOsc(float x) {
    // **CRUCIAL** scale the horizontal coord back up
    x *= 1000.0;

    float osc = 0.0;
    for (float i = 1.0; i <= BANDS_COUNT; i += 1.0) {
        float f = (i / BANDS_COUNT);
        f = f * f; // emphasize lows
        float h = hash1(i);
        osc += getSmoothBand(f)
             * sin(f * (x + u_time * 500.0 * h));
    }
    return osc / BANDS_COUNT;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 res = u_resolution;

    // UV centered & aspect-corrected
    vec2 uv = (2.0 * fragCoord - res) / res.x;
    // scroll horizontally with time
    uv.x += u_time * 0.5;

    // pixel size for AA
    float ps = 1.0 / min(res.x, res.y);

    // compute the waveform
    float wave = getOsc(uv.x) * AMPLITUDE;

    // edge antialiasing
    float tgAlpha = clamp(fwidth(wave) * res.x * 0.5, 0.0, 8.0);
    float vt = abs(uv.y - wave) / sqrt(tgAlpha*tgAlpha + 2.0);

    // the main line
    float line = 1.0 - smoothstep(0.0, ps * LINE_WIDTH, vt);
    line = smoothstep(0.0, 0.5, line);

    // a soft glow
    float blur = (1.0 - smoothstep(
        0.0,
        ps * LINE_WIDTH * 32.0,
        vt * 4.0
    )) * 0.2;

    float v = line + blur;
    fragColor = vec4(vec3(v), 1.0);
}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
