// shaders/radio.frag

#ifdef GL_ES
precision mediump float;
#endif

uniform vec2  u_resolution;
uniform float u_time;
uniform float u_low;     // bass band
uniform float u_mid;     // mid band
uniform float u_high;    // treble band
uniform float u_volume;  // overall loudness (RMS)

#define PI       3.14159
#define TWO_PI   6.2831

// simple 1D random
float rand(float n) {
    return fract(sin(n) * 43758.5453123);
}

// signed distance from point p to segment ab
float sdLine(in vec2 p, in vec2 a, in vec2 b) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa,ba)/dot(ba,ba), 0.0, 1.0);
    return length(pa - ba*h);
}

// HSL → RGB from IQ
vec3 hsl(float h, float s, float l) {
    vec3 c = clamp(
      abs(mod(h*6.0 + vec3(0.0,4.0,2.0),6.0) - 3.0) - 1.0,
      0.0, 1.0
    );
    return l + s*(c - 0.5)*(1.0 - abs(2.0*l - 1.0));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / u_resolution - 0.5;
    uv *= vec2(1.0, u_resolution.y / u_resolution.x);

    // approximate Shadertoy avgFreq with our three bands
    float bassFreq = pow(u_low , 0.85);
    float medFreq  = pow(u_mid , 0.85);
    float topFreq  = pow(u_high, 0.85);
    float ccnt     = 8.0;

    float hue   = u_time;
    float speed = u_time*0.5 + topFreq*0.1;
    bool  first = false;
    vec3  col   = vec3(0.0);

    // blobs
    for(int j=0; j<8; j++){
        float i = float(j);
        float spos = speed + i * PI*2.0/ccnt;
        if(rand(i*100.0 + floor(u_time*15.0)*50.0) < bassFreq*0.1) continue;
        vec2 cpos = vec2(cos(spos), sin(spos)) * (bassFreq*0.15 + 0.005);
        float csize = 0.02 + medFreq*0.08 + bassFreq*0.002;
        float cdist = length(uv - cpos) - csize;
        if(cdist < 0.0){
            bool draw = true;
            if(j==0) first = true;
            if(j==7) draw = !first;
            if(draw){
                col = hsl(hue, bassFreq*0.1, topFreq*2.0)
                    * ((10.0*csize) - cdist*5.0);
            }
        }
    }

    // fallback fill
    if(length(col) < 0.001){
        col = hsl(hue, bassFreq*0.1, medFreq*0.5) * length(uv);
    }

    // connecting lines
    for(int j=0; j<8; j++){
        for(int k=0; k<8; k++){
            float i = float(j), l = float(k);
            float spos1 = speed + i * PI*2.0/ccnt;
            float spos2 = speed + l * PI*2.0/ccnt;
            if(rand(i*100.0 + l + floor(u_time*50.0)*50.0) > bassFreq*0.8)
                continue;
            vec2 c1 = vec2(sin(spos1), cos(spos1)) * (bassFreq*0.15 + 0.005)*2.0;
            vec2 c2 = vec2(sin(spos2), cos(spos2)) * (bassFreq*0.15 + 0.005)*2.0;
            float d = sdLine(uv, c1, c2);
            float w = 1.1 / u_resolution.x;
            col += hsl(hue, bassFreq*0.1 + 0.5, 0.1 + bassFreq*1.4)
                 * smoothstep(w, 0.0, d);
        }
    }

    fragColor = vec4(col, 1.0);
}

// entrypoint for glslCanvas
void main(){
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
