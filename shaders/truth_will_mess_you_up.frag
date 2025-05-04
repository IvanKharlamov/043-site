// shaders/radio.frag

#ifdef GL_ES
precision mediump float;
#endif

uniform vec2  u_resolution;
uniform float u_time;
uniform float u_low;     // bass band
uniform float u_mid;     // mid band
uniform float u_high;    // treble band
uniform float u_volume;  // RMS loudness

#define PI       3.1415927
#define TWO_PI   6.283185

// choose between low/mid/high by position
float getBand(float t){
    if (t < 0.33)      return u_low;
    else if (t < 0.66) return u_mid;
    else               return u_high;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord){
    vec2 res = u_resolution;
    
    // centered & scaled UV
    vec2 uv = (2.0 * fragCoord - res) * 0.6 / min(res.x, res.y);
    uv.x = abs(uv.x);
    uv.y = -uv.y;
    
    // pixel size
    float ps = 1.0 / min(res.x, res.y);
    
    // overall volume pulse (shrinks when louder)
    float avgVol = u_volume;
    uv *= 1.0 - smoothstep(0.3, 1.1, avgVol) * 0.7;
    
    // polar coords: radius & “frequency angle”
    vec2 p;
    p.x = length(uv);
    p.y = atan(uv.y, uv.x) / TWO_PI;
    p.y = fract((p.y + 0.2) * 0.8);
    
    // spectrum intensity at this angle
    float spec = getBand(p.y);
    // sharpen and scale by avgVol
    float vol = pow(smoothstep(0.0, 0.9, spec), 4.0 / max(avgVol,0.01)) * 0.1;
    
    // distance from the ring
    float d = vol - p.x + 0.2;
    
    vec3 col = vec3(0.0);
    
    // main line (bright)
    col += vec3(0.5,1.0,1.0)
         * smoothstep(1.0 - ps*1.5, 1.0, 1.0 - abs(d))
         * smoothstep(-1.0, 1.0, avgVol);
    
    // blurred halo
    col += vec3(0.05,0.2,0.2)
         * smoothstep(
             1.0 - 0.008 * pow(avgVol*3.0 + 1.0, 2.0),
             1.0,
             1.0 - abs(d)
           );
    
    // flash at center on beat
    col += vec3(0.0,1.0,1.0)
         * pow(avgVol, 8.0)
         * (1.0 - p.x);
    
    // inner fill
    col += vec3(0.0,0.1,0.1)
         * smoothstep(0.0, 0.01, d)
         * (avgVol + 0.2);
    
    // tiny ripple circles
    float rings = sin(p.x * 50.0 + u_time * 2.0);
    col += vec3(1.0)
         * smoothstep(0.1, 0.3, d)
         * smoothstep(0.1, 0.8, avgVol*avgVol)
         * rings * 0.5;
    
    fragColor = vec4(col, 1.0);
}

void main(){
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
