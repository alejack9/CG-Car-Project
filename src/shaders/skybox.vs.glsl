attribute vec4 a_position; // [x, y, 0]

uniform mat4 u_viewDirectionProjectionInverse;

varying vec3 v_position;

void main() {
    vec4 viewPosition = u_viewDirectionProjectionInverse * a_position;
    v_position = normalize(viewPosition.xyz / viewPosition.w);
    gl_Position = a_position;
    gl_Position.z = 1.0; // transforms 0 in 1
}