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

#define LINE_WIDTH          1.6
#define PRECISION           0.25
#define BANDS_COUNT         64.0
#define HIGH_FREQ_APPEARANCE 0.7
#define AMPLITUDE            4.0

// simple 1D hash
float hash1(float v) {
    return fract(sin(v * 124.14518) * 2123.14121) - 0.5;
}

// approximate one frequency bin from our 3-band split
float getBand(float freq) {
    // map freq∈[0,1] to either low, mid or high
    float val = freq < 1.0/3.0
        ? u_low
        : (freq < 2.0/3.0 ? u_mid : u_high);
    return pow(val, 2.0 - HIGH_FREQ_APPEARANCE);
}

// smooth across “PRECISION” range (we just re-use getBand here)
float getSmoothBand(float bandFreq) {
    float v = getBand(bandFreq);
    v = smoothstep(0.2, 1.0, v);
    return v * v;
}

// build the oscillator by summing sinusoids across BANDS_COUNT bins
float getOsc(float x) {
    float osc = 0.0;
    for (float i = 1.0; i <= BANDS_COUNT; i += 1.0) {
        float f = (i / BANDS_COUNT);
        f = f * f;  // emphasize low end
        float h = hash1(i);
        osc += getSmoothBand(f)
             * sin(f * (x + u_time * 500.0 * h));
    }
    return osc / BANDS_COUNT;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 res = u_resolution;
    // normalized coords, centered and aspect-correct
    vec2 uv = (2.0 * fragCoord - res) / res.x;
    // horizontal scroll over time
    uv.x += u_time * 0.5;

    // pixel size
    float ps = 1.0 / min(res.x, res.y);

    // compute waveform
    float wave = getOsc(uv.x) * AMPLITUDE;

    // compute edge thickness and antialias
    float tgAlpha = clamp(fwidth(wave) * res.x * 0.5, 0.0, 8.0);
    float vt = abs(uv.y - wave) / sqrt(tgAlpha*tgAlpha + 2.0);

    // main line
    float line = 1.0 - smoothstep(0.0, ps * LINE_WIDTH, vt);
    line = smoothstep(0.0, 0.5, line);

    // glow/blur
    float blur = (1.0 - smoothstep(
        0.0,
        ps * LINE_WIDTH * 32.0,
        vt * 4.0
    )) * 0.2;

    float v = line + blur;
    // you can modulate color by u_volume or u_high here if you like
    fragColor = vec4(vec3(v), 1.0);
}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
