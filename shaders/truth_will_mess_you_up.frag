// shaders/radio.frag

#ifdef GL_ES
precision mediump float;
#endif

uniform vec2  u_resolution;
uniform float u_time;
uniform float u_low;     // bass
uniform float u_mid;     // mids
uniform float u_high;    // treble
uniform float u_volume;  // overall RMS loudness

#define PI        3.1415927
#define TWO_PI    6.283185
#define FREQ_STEP 0.001953125

// pick bass/mid/high by normalized freq position
float getBand(float t) {
    if (t < 0.33)      return u_low;
    else if (t < 0.66) return u_mid;
    else               return u_high;
}

// HSL → RGB (standard)
vec3 hsl2rgb(vec3 c) {
    vec3 rgb = clamp(
      abs(mod(c.x*6.0 + vec3(0.0,4.0,2.0),6.0) - 3.0) - 1.0,
      0.0, 1.0
    );
    return c.z + c.y*(rgb - 0.5)*(1.0 - abs(2.0*c.z - 1.0));
}

// The unmodified core “ring” logic, but as a function so we can reuse it for aberration
vec3 ringPattern(vec2 uv, float ps) {
    // polar coords
    vec2 p = vec2(length(uv), atan(uv.y, uv.x) / TWO_PI);
    p.y = fract((p.y + 0.2) * 0.8);

    // “frequency” amplitude at this angle
    float spec = getBand(p.y);
    float volf = pow(smoothstep(0.0, 0.9, spec),
                     4.0 / max(u_volume, 0.001)) * 0.1;
    float d = volf - p.x + 0.2;

    vec3 col = vec3(0.0);

    // 1) main line (bass → thicker = smoother)
    float thr = 1.0 - ps * (1.5 + u_low * 1.0);
    float s1 = smoothstep(thr, 1.0, 1.0 - abs(d))
             * smoothstep(-1.0, 1.0, u_volume);
    col += vec3(0.5, 1.0, 1.0) * s1;

    // 2) blurred glow (treble → stronger)
    float s2 = smoothstep(
                 1.0 - 0.008 * pow(u_volume*3.0 + 1.0, 2.0),
                 1.0,
                 1.0 - abs(d)
               ) * u_high;
    col += vec3(0.05, 0.2, 0.2) * s2;

    // 3) flash
    float s3 = pow(u_volume, 8.0) * (1.0 - p.x);
    col += vec3(0.0, 1.0, 1.0) * s3;

    // 4) center fill
    float s4 = smoothstep(0.0, 0.01, d) * (u_volume + 0.2);
    col += vec3(0.0, 0.1, 0.1) * s4;

    // 5) inner circles (texture lookup left in place)
    float s5 = smoothstep(0.1, 0.3, d)
             * smoothstep(0.1, 0.8, u_volume*u_volume)
             * texture(iChannel1,
                       vec2(p.x, p.x) / (pow(u_volume,2.0)+0.2)
                     + vec2(-u_time*0.3)
                      ).r;
    col += vec3(1.0) * s5;

    return col;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 res = u_resolution;
    float ps = 1.0 / min(res.x, res.y);

    // base UV
    vec2 uv0 = (2.0*fragCoord - res) * 0.6 / min(res.x, res.y);
    uv0.x = abs(uv0.x);
    uv0.y *= -1.0;

    // volume pulse
    float vp = smoothstep(0.3, 1.1, u_volume) * 0.7;
    uv0 *= (1.0 - vp);

    // chromatic aberration direction & amount
    vec2 dir = normalize(uv0 + 1e-6);
    float ca = u_high * 0.01;

    // sample the pattern three times
    vec3 cR = ringPattern(uv0 + dir*ca, ps);
    vec3 cG = ringPattern(uv0         , ps);
    vec3 cB = ringPattern(uv0 - dir*ca, ps);

    // pack into final RGB
    vec3 col = vec3(cR.r, cG.g, cB.b);

    // mid‐driven hue palette
    float hue = fract(u_mid);
    vec3 pal  = hsl2rgb(vec3(hue, 1.0, 0.5));

    // tint by palette, then kill at zero volume
    col = pal * col * u_volume;

    fragColor = vec4(col, 1.0);
}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
