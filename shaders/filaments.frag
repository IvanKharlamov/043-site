#ifdef GL_ES
precision mediump float;
#endif

uniform vec2      resolution;
uniform float     time;
uniform sampler2D audioData;

// simple 2×FFT lookup helpers
float fftVal(float x)  { return texture2D(audioData, vec2(x, 0.25)).r; }
float waveVal(float x) { return texture2D(audioData, vec2(x, 0.75)).r; }

mat2 rot(float a){
  float c = cos(a), s = sin(a);
  return mat2(c, s, -s, c);
}

float segm(vec2 p, vec2 a, vec2 b, float nz, float id){
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa,ba)/dot(ba,ba), 0.0, 1.0) + nz*0.017;
  // use waveform (row 1) for displacement
  float w = waveVal(fract(h*0.2 + id*0.005));
  return length(pa - w*0.015*(h-1.0) - ba*h)*w*7.0*w;
}

float tri(float x){ return abs(fract(x)-0.5); }
vec2  tri2(vec2 p){ return vec2(tri(p.x + tri(p.y*2.0)), tri(p.y + tri(p.x*2.0))); }
mat2  m2 = mat2(0.970, 0.242, -0.242, 0.970);

float triangleNoise(vec2 p){
  float z=1.5, z2=1.5, rz=0.0;
  vec2 bp = p*0.8;
  for (float i=0.0; i<=3.0; i++){
    vec2 dg = tri2(bp*2.0)*0.5;
    dg = rot(time*4.5)*dg;
    p  += dg/z2;
    bp *= 1.5; z2 *= 0.6; z *= 1.7;
    p  = m2*(p*1.2);
    rz += tri(p.x + tri(p.y))/z;
  }
  return rz;
}

vec3 render(vec2 p){
  vec3 col = vec3(0.0);
  // dynamic “nz” from triangle noise
  float nz = clamp(triangleNoise(p), 0.0, 1.0);
  // pick a displacement from waveform
  float w = waveVal(fract(p.x*0.2));
  p /= (w*1.0 + 0.5) + time*0.001;

  vec2 p1 = vec2(-1.0, 0.0);
  for (int i=0; i<100; i++){
    p1 = rot(0.05 + pow(time*2.25,1.5)*0.0007)*p1;
    vec2 p2 = rot(0.04*float(i) - time*1.575 - w*1.5)*p1;
    float d = segm(p, p1, p2, nz, float(i));
    col += abs(sin(vec3(0.6+sin(time*0.05)*0.4,1.5,2.0)
                   + float(i)*0.011 + time*0.8))
           * 0.0015 / pow(d, 1.2);
  }
  return col * w;
}

void main(){
  vec2 fragCoord = gl_FragCoord.xy;
  // normalized [-1,+1] coords
  vec2 p = (fragCoord / resolution)*2.0 - 1.0;
  p.x *= resolution.x/resolution.y * 0.9;
  vec3 col = render(p*0.75);
  gl_FragColor = vec4(col, 1.0);
}
