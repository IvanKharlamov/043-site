#ifdef GL_ES
precision mediump float;
#endif

uniform vec2  u_resolution;
uniform float u_time;
uniform float u_low;     // bass  [0..1]
uniform float u_mid;     // mids  [0..1]
uniform float u_high;    // treble[0..1]
uniform float u_volume;  // RMS   [0..1]

#define PI     3.1415927
#define TWO_PI 6.283185

// HSL → RGB (from IQ)
vec3 hsl2rgb(vec3 c){
    vec3 rgb = clamp(
      abs(mod(c.x*6.0 + vec3(0.,4.,2.), 6.0) - 3.0) - 1.0,
      0.0, 1.0
    );
    return c.z + c.y*(rgb - 0.5)*(1.0 - abs(2.0*c.z - 1.0));
}

// compute a single-ring pattern + glow
float ringPattern(in vec2 uv, in float radius, in float sharpness){
    float d = abs(length(uv) - radius);
    return smoothstep(sharpness, 0.0, d);
}
float ringGlow(in vec2 uv, in float radius, in float sharpness){
    float d = abs(length(uv) - radius);
    return smoothstep(sharpness*3.0, 0.0, d);
}

void mainImage(out vec4 fragColour, in vec2 fragCoord){
    // NDC coords, center-origin
    vec2 uv0 = (fragCoord*2.0 - u_resolution) / u_resolution.y;

    // smooth “zoom” with volume
    float scale = mix(1.0, 3.0, smoothstep(0.1, 1.0, u_volume));
    vec2 uv = uv0 * scale;

    // ring params
    float baseRadius  = 0.3;                        // base ring radius
    float ringRadius  = baseRadius + u_volume * 0.2; // volume pushes it out
    float sharpness   = mix(0.2, 0.01, u_low);       // bass → smoother(0.2) to sharper(0.01)
    float glowAmt     = u_high;                     // treble → glow strength

    // chromatic aberration offset
    vec2 dir   = normalize(uv0 + 1e-6);
    float chroma = 0.02 * u_high;

    // sample three channels separately
    float r = ringPattern(uv - dir*chroma, ringRadius, sharpness)
            + glowAmt * ringGlow(uv - dir*chroma, ringRadius, sharpness);
    float g = ringPattern(uv,                  ringRadius, sharpness)
            + glowAmt * ringGlow(uv,                  ringRadius, sharpness);
    float b = ringPattern(uv + dir*chroma, ringRadius, sharpness)
            + glowAmt * ringGlow(uv + dir*chroma, ringRadius, sharpness);

    vec3 brightness = vec3(r,g,b);

    // hue from mids
    float hue = fract(u_mid + u_time*0.05);
    vec3 palette = hsl2rgb(vec3(hue, 1.0, 0.5));

    // combine: palette * brightness, and kill at zero volume
    vec3 col = palette * brightness * u_volume;

    fragColour = vec4(col, 1.0);
}

void main(){
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
