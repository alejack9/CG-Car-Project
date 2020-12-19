precision mediump float;

uniform vec4 u_kambient;
uniform vec4 u_kdiffuse;
uniform vec4 u_kspecular;
uniform sampler2D u_texture;

varying vec2 v_texcoord;


void main() {
    gl_FragColor = texture2D(u_texture, v_texcoord);
}