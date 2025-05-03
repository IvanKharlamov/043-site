// shaders/radio.frag

#ifdef GL_ES
precision mediump float;
#endif

uniform vec2  u_resolution;
uniform float u_time;
uniform float u_low;     // bass band
uniform float u_mid;     // mid band
uniform float u_high;    // treble band
uniform float u_volume;  // overall loudness

// ---- constants ----
#define PI    3.14159
#define speed 5.0                     // only used inside jTime jitter
#define audio_vibration_amplitude 0.125

// simulate Shadertoy's frame‐jitter
float jTime;
const float iTimeDelta = 1.0/60.0;

// 1D hash
float hash21(vec2 co){
    return fract(sin(dot(co, vec2(1.9898,7.233))) * 45758.5433);
}

// “charged” hash + wave effect + audio vibration
float amp(vec2 p){
    return smoothstep(1.0, 8.0, abs(p.x));
}
float pow512(float a){
    a*=a; a*=a; a*=a; a*=a; a*=a; a*=a; a*=a; a*=a;
    return a*a;
}
float pow1d5(float a){
    return a*sqrt(a);
}

float hashFun(vec2 uv){
    float a = amp(uv);
    // wave thing (only time‐based)
    float w = a > 0.0
        ? (1.0 - 0.4 * pow512(0.51 + 0.49 * sin((0.02*(uv.y+0.5*uv.x) - jTime)*2.0)))
        : 0.0;
    // audio only in the vibration term:
    float vib = u_volume * audio_vibration_amplitude;
    return (a > 0.0
        ? a * pow1d5(hash21(uv)) * w
        : 0.0
    ) - vib;
}

// triangular noise + edge factor
vec2 trinoise(vec2 uv){
    const float SQ = 1.2247449; // sqrt(3/2)
    uv.x *= SQ;  uv.y -= 0.5*uv.x;
    vec2 d = fract(uv), uv0 = uv - d;
    bool c = dot(d, vec2(1.0)) > 1.0;
    vec2 dd = 1.0 - d;
    vec2 da = c ? dd : d;
    vec2 db = c ? d  : dd;
    float nn   = hashFun(uv0 + float(c));
    float n2   = hashFun(uv0 + vec2(1.0,0.0));
    float n3   = hashFun(uv0 + vec2(0.0,1.0));
    float nmid = mix(n2, n3, d.y);
    float ns   = mix(nn, c?n2:n3, da.y);
    float dx   = da.x / db.y;
    float ef   = min(min((1.0-dx)*db.y, da.x), da.y);
    return vec2(mix(ns, nmid, dx), ef);
}

// height‐function map: y - noise
vec2 map3d(vec3 p){
    vec2 n = trinoise(p.xz);
    return vec2(p.y - 2.0*n.x, n.y);
}

// gradient of map3d
vec3 grad(vec3 p){
    const vec2 e = vec2(0.005,0.0);
    float v0 = map3d(p).x;
    return normalize(vec3(
      map3d(p + e.xyy).x - v0,
      map3d(p + e.yxy).x - v0,
      map3d(p + e.yyx).x - v0
    ));
}

// ray‐march a height‐field (plane with noise)
float rayMarchPlane(vec3 ro, vec3 rd){
    // intersection with y=0 plane: t = -ro.y / rd.y
    float t = -ro.y / rd.y;
    if(t < 0.0) return -1.0;
    // walk a few steps along ray to refine against map3d
    for(int i=0;i<20;i++){
        vec3 pos = ro + rd * t;
        vec2 m = map3d(pos);
        float dist = m.x;
        if(abs(dist) < 0.001) break;
        t += dist * 0.5;
        if(t > 50.0) return -1.0;
    }
    return t;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord){
    // compute jittered time
    float dt  = fract(hash21(fragCoord) + u_time) * 0.25;
    jTime     = u_time - dt * iTimeDelta;

    // screen → NDC, aspect‐correct
    vec2 uv = (2.0*fragCoord - u_resolution) / u_resolution.y;

    // camera fixed above plane, looking down at an angle
    vec3 ro = vec3(0.0, 2.0, -5.0);
    vec3 rd = normalize(vec3(uv, 1.5));

    // march to the height‐field
    float t = rayMarchPlane(ro, rd);
    vec3 col = vec3(0.0);

    if(t > 0.0){
        vec3 P = ro + rd * t;
        // compute normal from displacement
        vec3 N = grad(P);
        // simple lighting
        vec3 L = normalize(vec3(-0.5, 1.0, -0.3));
        float diff = max(dot(N, L), 0.0);
        // purple base
        col = vec3(0.6, 0.2, 0.8) * diff;
        // add a little rim from highs
        col += pow(max(dot(reflect(-L, N), -rd), 0.0), 8.0) * u_high;
    }

    // vignette
    vec2 luv = fragCoord / u_resolution;
    float vig = pow(16.0*luv.x*luv.y*(1.0-luv.x)*(1.0-luv.y), 0.1)*0.5 + 0.5;
    col *= vig;

    fragColor = vec4(col, 1.0);
}

// entrypoint for glslCanvas
void main(){
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
