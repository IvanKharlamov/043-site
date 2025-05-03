// https://www.shadertoy.com/view/ldKSDh

// shaders/radio.frag

#ifdef GL_ES
precision mediump float;
#endif

uniform vec2  u_resolution;
uniform float u_time;
uniform float u_low;     // bass band
uniform float u_mid;     // mid band
uniform float u_high;    // treble band
uniform float u_volume;  // overall RMS loudness

#define PI 3.141592

// palette helpers
vec3 rgb(float r, float g, float b){ return vec3(r/255., g/255., b/255.); }

vec3 rgb2hsv(vec3 c){
    vec4 K = vec4(0.0, -1.0/3.0, 2.0/3.0, -1.0);
    vec4 p = c.g < c.b 
        ? vec4(c.bg, K.wz) 
        : vec4(c.gb, K.xy);
    vec4 q = c.r < p.x 
        ? vec4(p.xyw, c.r)
        : vec4(c.r, p.yzx);
    float d = q.x - min(q.w, q.y);
    float e = 1e-10;
    return vec3(
      abs(q.z + (q.w - q.y)/(6.0*d + e)),
      d/(q.x + e),
      q.x
    );
}
vec3 hsv2rgb(vec3 c){
    vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz)*6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx,0.0,1.0), c.y);
}

// simple 1D hash
float hash21(vec2 co){
    return fract(sin(dot(co,vec2(12.9898,78.233))) * 43758.5453);
}
float rand1(float x){
    return hash21(vec2(x,0.0));
}

// map y→ band value
float specVal(float y){
    return y < 0.33 
      ? u_low 
      : (y < 0.66 
         ? u_mid 
         : u_high);
}
vec3 spec(float t, float y){
    // ignore t: just pick the band by y
    float v = specVal(y);
    return vec3(v);
}

// build a “beat” curve by mixing a few y–positions
vec2 beat(float q){
    // sample at y=0,0.05,0.1,0.2, weighted
    float s0 = specVal(0.0);
    float s1 = specVal(0.05);
    float s2 = specVal(0.1);
    float s3 = specVal(0.2);
    vec2 sum = vec2(s0, s0)
             + vec2(s1, s1)/1.5
             + vec2(s2, s2)/4.0
             + vec2(s3, s3)/8.0;
    return sum / 1.8;
}

// smooth circle mask
float circle(vec2 uv, vec2 c, float r){
    float d = length(uv - c);
    return smoothstep(r, r - 0.005, d);
}

// triangular noise → (value, edge-factor)
vec2 trinoise(vec2 uv){
    const float SQ = 1.22474487139; // sqrt(3/2)
    uv.x *= SQ; uv.y -= 0.5*uv.x;
    vec2 d = fract(uv), uv0 = uv - d;
    bool c = dot(d,vec2(1))>1.0;
    vec2 dd = 1.0 - d;
    vec2 da = c?dd:d, db = c?d:dd;
    float nn   = hash21(uv0 + float(c));
    float n2   = hash21(uv0 + vec2(1,0));
    float n3   = hash21(uv0 + vec2(0,1));
    float nmid = mix(n2, n3, d.y);
    float ns   = mix(nn, c?n2:n3, da.y);
    float dx   = da.x / db.y;
    float ef   = min(min((1.0-dx)*db.y, da.x), da.y);
    return vec2(mix(ns,nmid,dx), ef);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord){
    vec2 sc = fragCoord / u_resolution;
    vec2 uv = sc*2.0 - 1.0;
    uv.x *= u_resolution.x / u_resolution.y;
    float t = u_time;

    vec3 col = vec3(0.0);
    float cRad = 0.75;
    const float res = 80.0;

    // radial “orbs”
    for(float i = TWO_PI*0.3183; i > 0.0; i -= TWO_PI/res){
        // positions on circle
        float x = sin(i) * cRad;
        float y = cos(i) * cRad;
        float tt = i/res * 2.0;
        vec2 s = beat(tt);
        float r = pow(s.x,3.0)*0.025 + 0.005;
        r *= (TWO_PI*0.4363 - i)*0.3;
        float m = circle(uv, vec2(x,y), r);
        if(m>0.0){
            // palette via hue from s.y
            float hue = s.y * 750.0;
            vec3 cCol = hsv2rgb(vec3(hue,0.3,0.85))
                       - rand1(s.y)*0.2;
            col = mix(col, cCol, m);
        }
    }

    // background pulse & tint
    vec2 f = sc.yx;
    float yf = f.y;
    float xf = f.x;
    float t2 = xf < 0.1 ? 0.0 : (xf - 0.1)*0.1;
    // bg exponent
    float bgv = pow(
      0.6 + mix(specVal(t2), specVal(t2)*0.5, 0.3), 
      100.0
    );
    vec3 bgColor = bgv 
      * hsv2rgb(vec3(t2 - u_time*0.1, 0.7, pow(0.8 - t2*0.8,4.0)));

    // noise overlay
    float noise = rand1(dot(uv,uv)*43758.5);
    vec3 col1 = col + noise*0.04;

    // choose between orb color vs bg
    bool hasOrb = length(col) > 0.0;
    vec3 mixed = hasOrb 
      ? col1 
      : mix(bgColor, col1, 0.9);

    fragColor = vec4(mixed, 1.0);
}

void main(){
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
