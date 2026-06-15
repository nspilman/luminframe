import { ThreeJSRenderingAdapter } from './ThreeJSRenderingAdapter'

// WebGL has no home in jsdom, so we stand in fakes for the only three.js
// constructors the setCanvas/dispose path touches. Each fake renderer records
// the canvas it bound to and whether it was disposed — the two things the
// rebind-on-remount behavior turns on. (jest hoists the factory, so the shared
// array must carry the `mock` prefix to be referenceable inside it.)
const mockBuiltRenderers: Array<{ domElement: HTMLCanvasElement; disposed: boolean }> = []

jest.mock('three', () => {
  class FakeRenderer {
    domElement: HTMLCanvasElement
    disposed = false
    constructor(opts: { canvas: HTMLCanvasElement }) {
      this.domElement = opts.canvas
      mockBuiltRenderers.push(this)
    }
    setSize() {}
    render() {}
    dispose() {
      this.disposed = true
    }
  }
  return {
    WebGLRenderer: FakeRenderer,
    Scene: class {
      add() {}
      remove() {}
    },
    OrthographicCamera: class {
      position = { z: 0 }
    },
    TextureLoader: class {
      load() {
        return {}
      }
    },
  }
})

describe('ThreeJSRenderingAdapter.setCanvas', () => {
  beforeEach(() => {
    mockBuiltRenderers.length = 0
  })

  // The bug this guards: the adapter is a singleton that outlives a React
  // remount (HMR, a route change). A remount mounts a fresh <canvas>; if
  // setCanvas no-ops because a renderer already exists, every render() draws to
  // the old detached canvas and the visible one stays blank.
  it('rebinds the renderer to a newly mounted canvas', () => {
    const first = document.createElement('canvas')
    const second = document.createElement('canvas')
    const adapter = new ThreeJSRenderingAdapter(first)

    adapter.setCanvas(second)

    expect(adapter.getCanvas()).toBe(second)
  })

  // WebGL contexts are a capped resource (browsers drop the oldest past ~16), so
  // the orphaned renderer must be torn down, not leaked, on each rebind.
  it('disposes the orphaned renderer when rebinding', () => {
    const first = document.createElement('canvas')
    const second = document.createElement('canvas')
    const adapter = new ThreeJSRenderingAdapter(first)
    const orphaned = mockBuiltRenderers[0]

    adapter.setCanvas(second)

    expect(orphaned.disposed).toBe(true)
  })

  // The same canvas on every render must not churn the renderer — rebuilding
  // would drop the mesh and textures and flicker the canvas for no reason.
  it('keeps the existing renderer when handed the same canvas', () => {
    const canvas = document.createElement('canvas')
    const adapter = new ThreeJSRenderingAdapter(canvas)

    adapter.setCanvas(canvas)

    expect(mockBuiltRenderers).toHaveLength(1)
  })
})
