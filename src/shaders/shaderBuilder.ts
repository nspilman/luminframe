type Props<T> = {
    getBody: () => string;
    vars: T
}
export function shaderBuilder<T extends Record<string, string>>(props: Props<T>) {
    const variableDeclarations = Object.entries(props.vars).map(entry => `uniform ${entry[1]} ${entry[0]};`).join('\n')
    // `time` and `prevFrame` (last frame's output) are always available; the GLSL
    // compiler strips them from effects that don't sample them.
    return ('varying vec2 vUv;' + "\n" + "uniform float time;" + "\n" + "uniform sampler2D prevFrame;" + "\n" + variableDeclarations + `\n` + props.getBody()).trim()
}