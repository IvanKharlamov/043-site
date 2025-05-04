#ifdef GL_ES
precision mediump float;
#endif

uniform vec2  u_resolution;
uniform float u_time;
uniform float u_low;     // bass
uniform float u_mid;     // mids
uniform float u_high;    // treble
uniform float u_volume;  // overall loudness

#define PI        3.1415927
#define TWO_PI    6.283185
#define FREQ_STEP 0.001953125

// pick a band value from [0..1]
float getBand(float t) {
    if (t < 0.33)      return u_low;
    else if (t < 0.66) return u_mid;
    else               return u_high;
}

// HSL→RGB for mid‐driven hue
vec3 hsl2rgb(vec3 c) {
    vec3 rgb = clamp(
      abs(mod(c.x*6.0 + vec3(0.,4.,2.), 6.0) - 3.0) - 1.0,
      0.0, 1.0
    );
    return c.z + c.y*(rgb - 0.5)*(1.0 - abs(2.0*c.z - 1.0));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 res = u_resolution;
    float ps = 1.0 / min(res.x, res.y);

    // base UV (centered, scaled)
    vec2 uv0 = (2.0*fragCoord - res)*0.6/min(res.x,res.y);
    uv0.x = abs(uv0.x);
    uv0.y *= -1.0;

    // volume “pulse” shrinking
    float vp = smoothstep(0.3,1.1,u_volume)*0.7;
    vec2 uvPulse = uv0 * (1.0 - vp);

    // chromatic aberration offset
    float ca = u_high * 0.02;
    vec2 dir = normalize(uv0 + 1e-6);

    // prepare three UVs
    vec2 uvR = uvPulse * (1.0 + ca);
    vec2 uvG = uvPulse;
    vec2 uvB = uvPulse * (1.0 - ca);

    // one function to do the original ring logic per‐UV
    float ringLogic(vec2 uv) {
        // polar coords
        vec2 p = vec2(length(uv), atan(uv.y,uv.x)/TWO_PI);
        p.y = fract((p.y + 0.2)*0.8);
        // “frequency” amplitude at that angle
        float volF = getBand(p.y);
        // shape it
        float vol = pow(smoothstep(0.0,0.9,volF), 4.0/max(u_volume,0.01))*0.1;
        // distance
        float d = vol - p.x + 0.2;

        float outCol = 0.0;
        // main line
        float thr = 1.0 - ps*(1.5 + u_low*1.0); // bass→sharper
        outCol += smoothstep(thr, 1.0, 1.0 - abs(d))
                * smoothstep(-1.0,1.0,u_volume);

        // blurred glow (treble→stronger)
        outCol += u_high * 0.2 
                * smoothstep(1.0 - 0.008*pow(u_volume*3.0+1.0,2.0), 1.0, 1.0 - abs(d));

        // flash
        outCol += pow(u_volume,8.0) * (1.0 - p.x);

        // center fill
        outCol += smoothstep(0.0,0.01,d) * (u_volume + 0.2);

        // small rings
        outCol += smoothstep(0.1,0.3,d) * smoothstep(0.1,0.8,u_volume*u_volume);

        return outCol;
    }

    // compute each channel
    float cR = ringLogic(uvR);
    float cG = ringLogic(uvG);
    float cB = ringLogic(uvB);
    vec3 col = vec3(cR, cG, cB);

    // mid‐driven hue palette
    float hue = fract(u_mid + u_time*0.05);
    vec3 pal  = hsl2rgb(vec3(hue, 1.0, 0.5));

    // tint by palette
    col *= pal;

    // final volume multiplier (0 → black)
    col *= u_volume;

    fragColor = vec4(col, 1.0);
}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
