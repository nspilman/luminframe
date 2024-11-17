type Props<T> = {
    getBody: () => string;
    vars: T
}
export function shaderBuilder<T extends Record<string, string>>(props: Props<T>) {
    const variableDeclarations = Object.entries(props.vars).map(entry => `uniform ${entry[1]} ${entry[0]};`).join('\n')
    return ('varying vec2 vUv;' + "\n" + variableDeclarations + `\n` + props.getBody()).trim()
}