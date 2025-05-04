// shaders/radio.frag

#ifdef GL_ES
precision mediump float;
#endif

uniform vec2  u_resolution;
uniform float u_time;
uniform float u_low;     // bass  [0–1]
uniform float u_mid;     // mids  [0–1]
uniform float u_high;    // highs [0–1]
uniform float u_volume;  // RMS   [0–1]

#define TWO_PI 6.28318530718
const int blades = 6;

// HSL → RGB (IQ’s method)
vec3 hsl2rgb(vec3 c){
    vec3 p = abs(mod(c.x*6.0 + vec3(0.0,4.0,2.0), 6.0) - 3.0) - 1.0;
    return c.z + c.y * (p - 0.5) * (1.0 - abs(2.0*c.z - 1.0));
}

// pick one of the three bands based on normalized input [0,1]
float sampleBand(float u){
    if (u < 0.33) return u_low;
    else if (u < 0.66) return u_mid;
    else return u_high;
}

// compute the brightness of the kaleidoscopic ring at UV
float brightnessAtUV(vec2 uv, float edgeW){
    // angle + slow rotation
    float ang = atan(uv.y, uv.x) + u_time;
    float r   = length(uv);

    // raw wedge shape
    float raw = abs(fract(float(blades)*ang/TWO_PI)*2.0 - 1.0);
    // smooth the wedge edges by bass
    float slice = smoothstep(0.5-edgeW, 0.5+edgeW, raw);
    float a     = slice * r;

    // mix radius vs. sampled ring position
    float m1 = mix(r, 0.0, u_low);
    float m2 = mix(m1, sampleBand(a), u_high);
    float v  = pow(m2, 2.0);
    float val = sampleBand(v);

    // add glow from treble
    val += u_high * 0.4;
    return clamp(val, 0.0, 1.0);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord){
    // normalize coords
    vec2 uv0 = (fragCoord * 2.0 - u_resolution) / u_resolution.y;

    // zoom in/out smoothly by volume
    float zmin = 1.0, zmax = 1.5;
    float zoom = mix(zmin, zmax, smoothstep(0.0, 1.0, u_volume));
    uv0 *= zoom;

    // bass‐driven wedge edge width
    float edgeW = mix(0.02, 0.15, u_low);

    // chromatic aberration direction & amount
    vec2 dir = normalize(uv0);
    float ca  = u_high * 0.02;

    // sample three slightly offset UVs
    float vR = brightnessAtUV(uv0 + dir*ca, edgeW);
    float vG = brightnessAtUV(uv0,              edgeW);
    float vB = brightnessAtUV(uv0 - dir*ca, edgeW);

    // hue purely from mids
    float hue = fract(u_mid);
    float sat = 1.0;

    // map each channel through the palette
    vec3 cR = hsl2rgb(vec3(hue + 0.02, sat, vR*0.5 + 0.25));
    vec3 cG = hsl2rgb(vec3(hue,         sat, vG*0.5 + 0.25));
    vec3 cB = hsl2rgb(vec3(hue - 0.02, sat, vB*0.5 + 0.25));

    // assemble and fade in by volume
    vec3 col = vec3(cR.r, cG.g, cB.b) * u_volume;

    fragColor = vec4(col, 1.0);
}

void main(){
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
