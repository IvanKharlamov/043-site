#extension GL_OES_standard_derivatives : enable
#ifdef GL_ES
precision mediump float;
#endif

uniform vec2  u_resolution;
uniform float u_time;
uniform float u_low;      // bass band
uniform float u_mid;      // mid band
uniform float u_high;     // treble band
uniform float u_volume;   // overall loudness

#define RADIUS       0.04
#define EDGE_WIDTH   0.005

// HSV → RGB helper (h in [0,1])
vec3 hue2rgb(float h){
    vec3 k = mod(vec3(5.0, 3.0, 1.0) + h*6.0, 6.0);
    return 1.0 - clamp(min(k,4.0-k), 0.0, 1.0);
}

// Pick a “frequency” by smoothly blending our three bands
float sampleFreq(float x) {
    if (x < 1.0/3.0) {
        // 0–1/3: bass
        return smoothstep(0.0, 1.0/3.0, x) * u_low;
    } else if (x < 2.0/3.0) {
        // 1/3–2/3: mids
        return smoothstep(1.0/3.0, 2.0/3.0, x) * u_mid;
    } else {
        // 2/3–1: highs
        return smoothstep(2.0/3.0, 1.0, x) * u_high;
    }
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // normalize coords [0,1]
    vec2 uvn = fragCoord.xy / u_resolution;
    // remap to centered, aspect-corrected [-1,1]
    vec2 uv = uvn*2.0 - 1.0;
    uv.x *= u_resolution.x / u_resolution.y;
    float dist = length(uv);

    // look up our “audio spectrum” at this horizontal spot
    float f = sampleFreq(uvn.x);

    // color hue cycles with time plus a bit of frequency
    float hue = mod(u_time*0.2 + f*2.0, 1.0);
    vec3 col = hue2rgb(hue);

    // draw a ring at radius = f * 0.5 + base
    float ringRadius = RADIUS + f * 0.3;
    float edge = EDGE_WIDTH / u_resolution.x;
    float alpha = smoothstep(ringRadius + edge, ringRadius - edge, dist);

    // fade the whole ring in/out with overall volume
    alpha *= smoothstep(0.0, 0.5, u_volume);

    fragColor = vec4(col * alpha, alpha);
}

void main(){
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
