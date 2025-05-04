// shaders/simple.frag

#ifdef GL_ES
precision mediump float;
#endif

uniform sampler2D iChannel0;
uniform vec2      u_resolution;
uniform float     u_time;

// use the real FFT_SIZE (256), not 512
float amp(float freq) {
    float x = freq / 256.0;
    return texture2D(iChannel0, vec2(x, 0.25)).r;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv    = fragCoord / u_resolution;
    float ratio = u_resolution.y / u_resolution.x;
    float c    = 1.0;

    for (int i = 0; i < 100; i++) {
        float f = float(i);
        float a = 6.0 * pow(amp(f), 4.0) + 2.0;
        vec2 center = vec2(
          0.5 + 0.03 * sin(f + u_time),
          0.5 + 0.03 * cos(f + u_time) * ratio
        );
        vec2 dv = (uv - center)
                * vec2(1.0, ratio)
                * a * 1.1 * sin(f / 40.0);
        float d = length(dv);
        c -= 0.19
           * step(0.491, d)
           * step(0.5, 1.0 - d);
    }

    vec3 base = vec3(0.35, 0.85713, 0.553123);
    fragColor = vec4(base + c, 1.0);
}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
