// shaders/radio.frag

#ifdef GL_ES
precision mediump float;
#endif

// our standard uniforms
uniform vec2  u_resolution;
uniform float u_time;
uniform float u_low;     // bass band
uniform float u_mid;     // mid band
uniform float u_high;    // treble band
uniform float u_volume;  // overall RMS loudness

// constants
#define PI    3.14159
#define TWO_PI 6.28318
#define speed 5.0
#define audio_vibration_amplitude 0.125

// substitute for Shadertoy’s texture(iChannel0,…) audio sampling
// freq(f) → mix of our three bands, wave(f) → same without *0.8
#define freq(f) ( (f)<0.1 ? u_low*0.8 : ((f)<0.6 ? u_mid*0.8 : u_high*0.8) )
#define wave(f) ( (f)<0.1 ? u_low : ((f)<0.6 ? u_mid : u_high) )

// frame‐to‐frame “jittered” time
float jTime;
float iTimeDelta = 1.0/60.0;

// simple 1D hash
float hash21(vec2 co){
    return fract(sin(dot(co, vec2(1.9898,7.233))) * 45758.5433);
}

// “charged” hash with audio vibration
float amp(vec2 p){
    return smoothstep(1.0,8.0, abs(p.x));
}
float pow512(float a){
    a*=a;a*=a;a*=a;a*=a;a*=a;a*=a;a*=a;a*=a; // ^256
    return a*a;
}
float pow1d5(float a){
    return a*sqrt(a);
}
float hashFun(vec2 uv){
    float a = amp(uv);
    // “wave thing” from original
    float w = a>0.0
        ? (1.0 - 0.4 * pow512(0.51 + 0.49*sin((0.02*(uv.y+0.5*uv.x)-jTime)*2.0)))
        : 0.0;
    // subtract audio vibration
    return (a>0.0
        ? a * pow1d5(hash21(uv)) * w
        : 0.0
      ) - u_volume * audio_vibration_amplitude;
}

// edge‐aware min (trimmed down)
float edgeMin(float dx, vec2 da, vec2 db){
    return min(min((1.0-dx)*db.y, da.x), da.y);
}

// triangular noise → returns (value, edge-factor)
vec2 trinoise(vec2 uv){
    const float SQ = 1.22474487139; // sqrt(3/2)
    uv.x *= SQ;
    uv.y -= .5*uv.x;

    vec2 d = fract(uv);
    uv -= d;
    bool c = dot(d,vec2(1.0))>1.0;
    vec2 dd = 1.0-d;
    vec2 da = c?dd:d, db = c?d:dd;

    float nn  = hashFun(uv + float(c));
    float n2  = hashFun(uv + vec2(1.0,0.0));
    float n3  = hashFun(uv + vec2(0.0,1.0));
    float nmid= mix(n2,n3,d.y);
    float ns  = mix(nn, c?n2:n3, da.y);
    float dx  = da.x / db.y;
    return vec2( mix(ns,nmid,dx),
                 edgeMin(dx, da, db) );
}

// “map” for ray-march: (distance, meta)
vec2 map3d(vec3 p){
    vec2 n = trinoise(p.xz);
    return vec2( p.y - 2.0*n.x, n.y );
}

// gradient of map3d
vec3 grad(vec3 p){
    const vec2 e = vec2(0.005,0);
    float a = map3d(p).x;
    return normalize(vec3(
      map3d(p+e.xyy).x - a,
      map3d(p+e.yxy).x - a,
      map3d(p+e.yyx).x - a
    ));
}

// ray-march to intersection
vec2 intersect(vec3 ro, vec3 rd){
    float d=0.0, h;
    for(int i=0;i<100;i++){
        vec3 pos = ro + rd*d;
        vec2 m = map3d(pos);
        h = m.x;
        if(abs(h) < 0.003*d) return vec2(d, m.y);
        d += h*0.5;
        if(d>150.0 || pos.y>2.0) break;
    }
    return vec2(-1.0,0.0);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord){
    // one-shot AA disabled for speed
    vec2 uv = (2.0*fragCoord - u_resolution) / u_resolution.y;

    // simulate Shadertoy’s jitter
    float dt = fract(hash21(fragCoord) + u_time)*0.25;
    jTime = u_time - dt*iTimeDelta;

    // camera
    vec3 ro = vec3(0.0, 1.0, -20000.0 + jTime*speed);
    vec3 rd = normalize(vec3(uv, 4.0/3.0));

    // march
    vec2 I = intersect(ro, rd);
    float dist = I.x, meta = I.y;

    // lighting & fog
    vec3 ld  = normalize(vec3(0.0, 0.125+0.05*sin(0.1*jTime), 1.0));
    vec3 sky = vec3(0.0);
    vec3 col = sky;

    if(dist>0.0){
      vec3 P  = ro + rd*dist;
      vec3 N  = grad(P);
      float diff = dot(N,ld) + 0.1*N.y;
      vec3 base = vec3(0.1,0.11,0.18)*diff;
      vec3 ref  = reflect(rd, N);
      float spec = pow(max(dot(ref,ld),0.0),5.0);
      vec3 rfcol= vec3(0.0);

      // mix in a magenta tint based on meta
      vec3 tint = vec3(0.8,0.1,0.92);
      col = mix(base, rfcol, 0.05 + 0.95*spec);
      col = mix(col, tint, smoothstep(0.05,0.0, meta));
    }

    // fog blend
    float fogf = dist<0.0 ? 0.0 : 0.1 + exp(-dist);
    // vignette / clamp
    col = mix(sky, col, fogf);
    col = clamp(col, 0.0, 1.0);

    fragColor = vec4(col, 1.0);
}

void main(){
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
