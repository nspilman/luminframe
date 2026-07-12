import { shaderLibrary } from '@/lib/shaders';
import { registeredShaders, ShaderType } from '@/types/shader';
import { Color } from '@/domain/value-objects/Color';

/**
 * Contract test for the shader library — the keystone regression net for the
 * planned re-architecture (parameter-taxonomy unification, single-door access).
 *
 * It does NOT test how an effect is built. It pins the *observable contract*
 * every effect exposes to the UI and the renderer, so any refactor that quietly
 * drops a parameter, loses a uniform, or changes a default fails here.
 */

const effectEntries = registeredShaders.map(
  (type) => [type, shaderLibrary[type]] as const
);

describe('shader library contract', () => {
  it('exposes exactly the registered shader types — no missing, no extra', () => {
    const registered = [...registeredShaders].sort();
    const present = Object.keys(shaderLibrary).sort();
    expect(present).toEqual(registered);
  });

  describe.each(effectEntries)('%s', (_type, effect) => {
    it('has a non-empty name', () => {
      expect(effect.name.length).toBeGreaterThan(0);
    });

    it('declares resolution as a vec2 uniform', () => {
      // The renderer injects `resolution` for every effect; GLSL bodies rely on it.
      expect(effect.declarationVars.resolution).toBe('vec2');
    });

    it('maps every input to a declared uniform', () => {
      const declared = Object.keys(effect.declarationVars);
      for (const inputName of Object.keys(effect.inputs)) {
        expect(declared).toContain(inputName);
      }
    });

    it('provides a default for every input', () => {
      // A control with no default would render an undefined uniform.
      const defaultKeys = Object.keys(effect.defaultValues).sort();
      const inputKeys = Object.keys(effect.inputs).sort();
      expect(defaultKeys).toEqual(inputKeys);
    });

    it('compiles a fragment body with a main entry point', () => {
      expect(effect.getBody()).toContain('void main');
    });
  });

  it('matches the locked parameter surface', () => {
    // Snapshot of every effect's params { type, default }. This is the safety
    // blanket: it fails on any param added, removed, retyped, or default-shifted.
    const surface = Object.fromEntries(
      registeredShaders.map((type: ShaderType) => {
        const effect = shaderLibrary[type];
        const params = Object.fromEntries(
          Object.entries(effect.inputs).map(([name, input]) => [
            name,
            { type: input.type, default: describeDefault(effect.defaultValues[name]) },
          ])
        );
        return [type, params];
      })
    );

    expect(surface).toMatchInlineSnapshot(`
{
  "blackAndWhite": {
    "blackPoint": {
      "default": 0,
      "type": "range",
    },
    "contrast": {
      "default": 1,
      "type": "range",
    },
    "imageTexture": {
      "default": null,
      "type": "image",
    },
    "opacity": {
      "default": 1,
      "type": "range",
    },
  },
  "blend": {
    "blendStrength": {
      "default": 0.5,
      "type": "range",
    },
    "imageTexture": {
      "default": null,
      "type": "image",
    },
    "imageTextureTwo": {
      "default": null,
      "type": "image",
    },
    "opacity": {
      "default": 1,
      "type": "range",
    },
  },
  "bloom": {
    "imageTexture": {
      "default": null,
      "type": "image",
    },
    "intensity": {
      "default": 1,
      "type": "range",
    },
    "opacity": {
      "default": 1,
      "type": "range",
    },
    "radius": {
      "default": 8,
      "type": "range",
    },
    "threshold": {
      "default": 0.6,
      "type": "range",
    },
  },
  "chromaticAberration": {
    "amount": {
      "default": 0.15,
      "type": "range",
    },
    "imageTexture": {
      "default": null,
      "type": "image",
    },
    "opacity": {
      "default": 1,
      "type": "range",
    },
  },
  "colorQuantize": {
    "colorLevels": {
      "default": 8,
      "type": "range",
    },
    "imageTexture": {
      "default": null,
      "type": "image",
    },
    "opacity": {
      "default": 1,
      "type": "range",
    },
  },
  "colorTint": {
    "imageTexture": {
      "default": null,
      "type": "image",
    },
    "opacity": {
      "default": 1,
      "type": "range",
    },
    "tintColor": {
      "default": "#ff0000",
      "type": "color",
    },
    "tintStrength": {
      "default": 0.5,
      "type": "range",
    },
  },
  "dream": {
    "blurAmount": {
      "default": 2,
      "type": "range",
    },
    "brightness": {
      "default": 1.2,
      "type": "range",
    },
    "imageTexture": {
      "default": null,
      "type": "image",
    },
    "opacity": {
      "default": 1,
      "type": "range",
    },
    "saturation": {
      "default": 1.3,
      "type": "range",
    },
  },
  "duotone": {
    "highlightColor": {
      "default": "#ffdb85",
      "type": "color",
    },
    "imageTexture": {
      "default": null,
      "type": "image",
    },
    "opacity": {
      "default": 1,
      "type": "range",
    },
    "shadowColor": {
      "default": "#1a0f4d",
      "type": "color",
    },
  },
  "filmGrain": {
    "amount": {
      "default": 0.12,
      "type": "range",
    },
    "colored": {
      "default": false,
      "type": "boolean",
    },
    "grainSize": {
      "default": 1.5,
      "type": "range",
    },
    "imageTexture": {
      "default": null,
      "type": "image",
    },
    "opacity": {
      "default": 1,
      "type": "range",
    },
  },
  "gaussianBlur": {
    "imageTexture": {
      "default": null,
      "type": "image",
    },
    "offset": {
      "default": 0.3,
      "type": "range",
    },
    "opacity": {
      "default": 1,
      "type": "range",
    },
    "pixelNumerator": {
      "default": 30,
      "type": "range",
    },
  },
  "glitch": {
    "imageTexture": {
      "default": null,
      "type": "image",
    },
    "intensity": {
      "default": 0.1,
      "type": "range",
    },
    "opacity": {
      "default": 1,
      "type": "range",
    },
    "speed": {
      "default": 1,
      "type": "range",
    },
  },
  "godRays": {
    "imageTexture": {
      "default": null,
      "type": "image",
    },
    "intensity": {
      "default": 0.8,
      "type": "range",
    },
    "lightX": {
      "default": 0.5,
      "type": "range",
    },
    "lightY": {
      "default": 0.2,
      "type": "range",
    },
    "opacity": {
      "default": 1,
      "type": "range",
    },
    "threshold": {
      "default": 0.6,
      "type": "range",
    },
  },
  "hueSwap": {
    "imageTexture": {
      "default": null,
      "type": "image",
    },
    "imageTextureTwo": {
      "default": null,
      "type": "image",
    },
    "opacity": {
      "default": 1,
      "type": "range",
    },
  },
  "kaleidoscope": {
    "gridSize": {
      "default": 1,
      "type": "range",
    },
    "imageTexture": {
      "default": null,
      "type": "image",
    },
    "opacity": {
      "default": 1,
      "type": "range",
    },
    "rotation": {
      "default": 0,
      "type": "range",
    },
    "segments": {
      "default": 8,
      "type": "range",
    },
  },
  "lensDistortion": {
    "amount": {
      "default": 0.4,
      "type": "range",
    },
    "imageTexture": {
      "default": null,
      "type": "image",
    },
    "opacity": {
      "default": 1,
      "type": "range",
    },
  },
  "lightLeak": {
    "angle": {
      "default": 0.8,
      "type": "range",
    },
    "imageTexture": {
      "default": null,
      "type": "image",
    },
    "intensity": {
      "default": 0.8,
      "type": "range",
    },
    "leakColor": {
      "default": "#ff7333",
      "type": "color",
    },
    "opacity": {
      "default": 1,
      "type": "range",
    },
  },
  "lightThresholdSwap": {
    "imageTexture": {
      "default": null,
      "type": "image",
    },
    "imageTextureTwo": {
      "default": null,
      "type": "image",
    },
    "isHighPass": {
      "default": false,
      "type": "boolean",
    },
    "opacity": {
      "default": 1,
      "type": "range",
    },
    "threshold": {
      "default": 383,
      "type": "range",
    },
  },
  "luminanceQuantize": {
    "imageTexture": {
      "default": null,
      "type": "image",
    },
    "opacity": {
      "default": 1,
      "type": "range",
    },
    "stepSize": {
      "default": 0.1,
      "type": "range",
    },
  },
  "neonGlow": {
    "glowColor": {
      "default": "#00ffff",
      "type": "color",
    },
    "glowRadius": {
      "default": 0.2,
      "type": "range",
    },
    "glowStrength": {
      "default": 0.1,
      "type": "range",
    },
    "imageTexture": {
      "default": null,
      "type": "image",
    },
    "opacity": {
      "default": 1,
      "type": "range",
    },
  },
  "outline": {
    "imageTexture": {
      "default": null,
      "type": "image",
    },
    "lineColor": {
      "default": "#ffffff",
      "type": "color",
    },
    "opacity": {
      "default": 1,
      "type": "range",
    },
    "overImage": {
      "default": false,
      "type": "boolean",
    },
    "thickness": {
      "default": 1,
      "type": "range",
    },
    "threshold": {
      "default": 0.2,
      "type": "range",
    },
  },
  "pixelate": {
    "imageTexture": {
      "default": null,
      "type": "image",
    },
    "opacity": {
      "default": 1,
      "type": "range",
    },
    "pixelSize": {
      "default": 4,
      "type": "range",
    },
    "resolution": {
      "default": [
        1920,
        1080,
      ],
      "type": "vec2",
    },
  },
  "rgbSplit": {
    "angle": {
      "default": 0,
      "type": "range",
    },
    "imageTexture": {
      "default": null,
      "type": "image",
    },
    "opacity": {
      "default": 1,
      "type": "range",
    },
    "splitOffset": {
      "default": 0.005,
      "type": "range",
    },
  },
  "sepia": {
    "imageTexture": {
      "default": null,
      "type": "image",
    },
    "intensity": {
      "default": 1,
      "type": "range",
    },
    "opacity": {
      "default": 1,
      "type": "range",
    },
  },
  "sharpen": {
    "amount": {
      "default": 1.2,
      "type": "range",
    },
    "imageTexture": {
      "default": null,
      "type": "image",
    },
    "opacity": {
      "default": 1,
      "type": "range",
    },
    "radius": {
      "default": 1,
      "type": "range",
    },
  },
  "splitTone": {
    "highlightColor": {
      "default": "#ffc773",
      "type": "color",
    },
    "imageTexture": {
      "default": null,
      "type": "image",
    },
    "opacity": {
      "default": 1,
      "type": "range",
    },
    "shadowColor": {
      "default": "#4d8ca6",
      "type": "color",
    },
    "strength": {
      "default": 0.5,
      "type": "range",
    },
  },
  "swirl": {
    "amount": {
      "default": 3,
      "type": "range",
    },
    "imageTexture": {
      "default": null,
      "type": "image",
    },
    "opacity": {
      "default": 1,
      "type": "range",
    },
    "radius": {
      "default": 0.5,
      "type": "range",
    },
  },
  "tiltShift": {
    "bandWidth": {
      "default": 0.15,
      "type": "range",
    },
    "blurAmount": {
      "default": 4,
      "type": "range",
    },
    "focusY": {
      "default": 0.5,
      "type": "range",
    },
    "imageTexture": {
      "default": null,
      "type": "image",
    },
    "opacity": {
      "default": 1,
      "type": "range",
    },
  },
  "vibrance": {
    "amount": {
      "default": 0.6,
      "type": "range",
    },
    "imageTexture": {
      "default": null,
      "type": "image",
    },
    "opacity": {
      "default": 1,
      "type": "range",
    },
  },
  "vignette": {
    "imageTexture": {
      "default": null,
      "type": "image",
    },
    "intensity": {
      "default": 0.5,
      "type": "range",
    },
    "opacity": {
      "default": 1,
      "type": "range",
    },
    "smoothness": {
      "default": 0.5,
      "type": "range",
    },
  },
  "wave": {
    "amplitude": {
      "default": 0.02,
      "type": "range",
    },
    "frequency": {
      "default": 10,
      "type": "range",
    },
    "imageTexture": {
      "default": null,
      "type": "image",
    },
    "opacity": {
      "default": 1,
      "type": "range",
    },
    "speed": {
      "default": 2,
      "type": "range",
    },
  },
}
`);
  });
});

/** Render a default value as a stable, human-readable token for the snapshot. */
function describeDefault(value: unknown): unknown {
  if (value instanceof Color) return value.toHex();
  return value;
}
