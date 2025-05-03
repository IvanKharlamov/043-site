// shaders/radio.frag

#ifdef GL_ES
precision mediump float;
#endif

uniform vec2  u_resolution;
uniform float u_time;
uniform float u_low;    // bass
uniform float u_mid;    // mids
uniform float u_high;   // highs

#define PI 3.14159
#define TWO_PI 6.28318

// rotate around Y
vec3 rotateY(vec3 p, float a) {
    float c = cos(a), s = sin(a);
    return vec3(c*p.x + s*p.z, p.y, c*p.z - s*p.x);
}

// sphere SDF
float sdSphere(vec3 p, float r) {
    return length(p) - r;
}

// compute normal by finite-difference
vec3 calcNormal(in vec3 pos) {
    float eps = 0.001;
    float d = sdSphere(pos, 1.0);
    vec3 n = vec3(
      sdSphere(pos + vec3(eps,0,0), 1.0) - d,
      sdSphere(pos + vec3(0,eps,0), 1.0) - d,
      sdSphere(pos + vec3(0,0,eps), 1.0) - d
    );
    return normalize(n);
}

// simple ray-march: return hit distance or -1 if miss
float rayMarch(vec3 ro, vec3 rd) {
    float t = 0.0;
    for(int i=0; i<64; i++){
        vec3 p = ro + rd*t;
        // blob radius modulated by bass & mid
        float radius = 0.5 + u_low*0.5 + u_mid*0.3;
        float d = sdSphere(p - vec3(0.0, 0.0, 5.0 + sin(u_time)*2.0), radius);
        if(d < 0.001) return t;
        t += max(d*0.5, 0.01);
        if(t > 20.0) break;
    }
    return -1.0;
}

void main(){
    // normalized coords
    vec2 uv = (gl_FragCoord.xy / u_resolution)*2.0 - 1.0;
    uv.x *= u_resolution.x / u_resolution.y;

    // camera orbiting
    float dist = 5.0;
    vec3 ro = vec3(sin(u_time*0.5)*dist,
                   cos(u_time*0.3)*2.0,
                   cos(u_time*0.5)*dist - 2.0);
    // point toward scene center
    vec3 rd = normalize(rotateY(vec3(uv, 1.0), u_time*0.2));

    float t = rayMarch(ro, rd);
    vec3 col = vec3(0.0);

    if(t > 0.0){
        vec3 pos = ro + rd*t;
        vec3 N   = calcNormal(pos - vec3(0.0,0.0,5.0 + sin(u_time)*2.0));
        vec3 L   = normalize(vec3(-0.5, 1.0, -0.3));
        float diff = max(dot(N, L), 0.0);
        // specular boosted by highs
        float spec = pow(max(dot(reflect(-L, N), -rd),0.0), 32.0) * (1.0 + u_high*2.0);

        // **purple base color**
        vec3 base = vec3(0.6, 0.2, 0.8);
        col = base * diff + vec3(1.0)*spec;
    }

    // simple vignette
    vec2 luv = gl_FragCoord.xy / u_resolution;
    float vig = pow(16.0 * luv.x * luv.y * (1.0-luv.x) * (1.0-luv.y), 0.1)*0.5 + 0.5;
    col *= vig;

    gl_FragColor = vec4(col, 1.0);
}
