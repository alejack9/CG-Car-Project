attribute vec4 a_position;
attribute vec4 a_normal;
attribute vec2 a_texcoord;

uniform mat4 u_matrix;

varying vec2 v_texcoord;

void main() {

    gl_Position = u_matrix * a_position;

    // Pass the texcoord to the fragment shader.
    v_texcoord = a_texcoord;
}