// shaders/radio.frag

#ifdef GL_ES
precision mediump float;
#endif

uniform vec2  u_resolution;
uniform float u_time;
uniform float u_low;     // bass [0..1]
uniform float u_mid;     // mids [0..1]
uniform float u_high;    // treble [0..1]
uniform float u_volume;  // RMS loudness [0..1]

#define PI 3.1415927

// HSL → RGB
vec3 hsl2rgb(vec3 c) {
    vec3 rgb = clamp(
      abs(mod(c.x*6.0 + vec3(0.,4.,2.), 6.0) - 3.0) - 1.0,
      0.0, 1.0
    );
    return c.z + c.y*(rgb - 0.5)*(1.0 - abs(2.0*c.z - 1.0));
}

// The original ring logic, but using a uniform radius:
vec3 ringLogic(vec2 uv, float ps) {
    float rlen = length(uv);
    float radius = 0.5 + u_volume*0.2;

    float d = rlen - radius;
    vec3 col = vec3(0.0);

    // 1) main line (bass → thickness/sharpness)
    float thr = 1.0 - ps*(1.5 + u_low*1.0);
    float line = smoothstep(thr, 1.0, 1.0 - abs(d))
               * smoothstep(-1.0, 1.0, u_volume);
    col += vec3(0.5, 1.0, 1.0) * line;

    // 2) blurred glow (treble → strength)
    float glow = smoothstep(
                   1.0 - 0.008 * pow(u_volume*3.0 + 1.0, 2.0),
                   1.0,
                   1.0 - abs(d)
                 ) * u_high;
    col += vec3(0.05, 0.2, 0.2) * glow;

    // 3) flash at center
    float flash = pow(u_volume, 8.0) * (1.0 - rlen);
    col += vec3(0.0, 1.0, 1.0) * flash;

    // 4) center fill
    float fill = smoothstep(0.0, 0.01, d) * (u_volume + 0.2);
    col += vec3(0.0, 0.1, 0.1) * fill;

    // 5) ripple circles (procedural, replacing texture)
    float ripple = sin((rlen - radius)*30.0 + u_time*5.0)*0.5 + 0.5;
    float ring = smoothstep(0.1, 0.3, d)
               * smoothstep(0.1, 0.8, u_volume*u_volume)
               * ripple;
    col += vec3(1.0) * ring;

    return col;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 res = u_resolution;
    float ps = 1.0 / min(res.x, res.y);

    // base UV, centered + flipped + scaled
    vec2 uv0 = (2.0*fragCoord - res) * 0.6 / min(res.x, res.y);
    uv0.x = abs(uv0.x);
    uv0.y *= -1.0;

    // volume pulse (uniform scale)
    float pulse = smoothstep(0.3, 1.1, u_volume) * 0.7;
    uv0 *= (1.0 - pulse);

    // chromatic aberration offset
    vec2 dir = normalize(uv0 + 1e-6);
    float ca = u_high * 0.01;
    vec2 uvR = uv0 + dir*ca;
    vec2 uvG = uv0;
    vec2 uvB = uv0 - dir*ca;

    // sample ringLogic for R, G, B
    vec3 cR = ringLogic(uvR, ps);
    vec3 cG = ringLogic(uvG, ps);
    vec3 cB = ringLogic(uvB, ps);
    vec3 col = vec3(cR.r, cG.g, cB.b);

    // mid‐driven hue
    float hue = fract(u_mid);
    vec3 palette = hsl2rgb(vec3(hue, 1.0, 0.5));

    // apply palette and volume multiplier
    col = palette * col * u_volume;

    fragColor = vec4(col, 1.0);
}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
