import { shaderBuilder } from './shaderBuilder'

describe('shaderBuilder', () => {
  it('should correctly build shader with single uniform variable', () => {
    const shader = shaderBuilder({
      vars: {
        uTime: 'float'
      },
      getBody: () => 'void main() { gl_FragColor = vec4(1.0); }'
    })

    expect(shader).toBe('varying vec2 vUv;\nuniform float time;\nuniform float uTime;\nvoid main() { gl_FragColor = vec4(1.0); }')
  })

  it('should correctly build shader with multiple uniform variables', () => {
    const shader = shaderBuilder({
      vars: {
        uTime: 'float',
        uResolution: 'vec2',
        uColor: 'vec3'
      },
      getBody: () => 'void main() { gl_FragColor = vec4(uColor, 1.0); }'
    })

    expect(shader).toBe(
      'varying vec2 vUv;\n' +
      'uniform float time;\n' +
      'uniform float uTime;\n' +
      'uniform vec2 uResolution;\n' +
      'uniform vec3 uColor;\n' +
      'void main() { gl_FragColor = vec4(uColor, 1.0); }'
    )
  })

  it('should handle empty uniform variables', () => {
    const shader = shaderBuilder({
      vars: {},
      getBody: () => 'void main() { gl_FragColor = vec4(1.0); }'
    })

    expect(shader).toBe('varying vec2 vUv;\nuniform float time;\n\nvoid main() { gl_FragColor = vec4(1.0); }')
  })
}) 