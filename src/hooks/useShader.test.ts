/**
 * @vitest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react'
import { useShader } from './useShader'
import { Texture } from 'three'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useWindowSize } from './useWindowSize'

// Mock Three.js Texture
vi.mock('three', () => ({
  Texture: class MockTexture {
    constructor() {
      return {}
    }
  }
}))

vi.mock('./useWindowSize', () => ({
  useWindowSize: () => ({ width: 100, height: 100 })
}))

type ShaderVars = {
  blur: {
    resolution: [number, number];
    pixelSize: number;
    offset: number;
    imageTexture: Texture | null;
  };
  whiteout: {
    threshold: number;
    imageTexture: Texture | null;
  };
  wave: {
    imageTexture: Texture | null;
  };
}

describe('useShader', () => {
  let mockTexture: Texture

  beforeEach(() => {
    mockTexture = new Texture()
  })

  it('should initialize with correct default values', () => {
    const { result } = renderHook(() => useShader(mockTexture, 'blur'))

    expect(result.current.effectName).toBe('Gaussian Blur')
    expect(result.current.varValues).toEqual({
      resolution: [useWindowSize().width, useWindowSize().height],
      pixelSize: 3.2,
      offset: 5.0,
      imageTexture: mockTexture
    })
  })

  it('should update var values correctly', () => {
    const { result } = renderHook(() => useShader(mockTexture, 'blur'))

    act(() => {
      result.current.updateVarValue('pixelSize', 5.0)
    })

    expect((result.current.varValues as ShaderVars['blur']).pixelSize).toBe(5.0)
  })

  it('should reset values when effect type changes', () => {
    const { result, rerender } = renderHook(
      ({ image, effectType }: { image: Texture | null, effectType: 'blur' | 'whiteout' | 'wave' }) => useShader(image, effectType),
      {
        initialProps: { image: mockTexture, effectType: 'blur' }
      }
    )

    // First check blur effect values
    expect((result.current.varValues as ShaderVars['blur']).pixelSize).toBe(3.2)

    // Change to whiteout effect
    rerender({ image: mockTexture, effectType: 'whiteout' })

    // Should now have whiteout default values
    expect(result.current.varValues).toEqual({
      threshold: 0.75,
      imageTexture: mockTexture,
      resolution: [100, 100]
    })
  })

  it('should update shader when effect changes', () => {
    const { result, rerender } = renderHook(
      ({ image, effectType }: { image: Texture | null, effectType: 'blur' | 'whiteout' | 'wave' }) => useShader(image, effectType),
      {
        initialProps: { image: mockTexture, effectType: 'blur' }
      }
    )

    const initialShader = result.current.shader

    rerender({ image: mockTexture, effectType: 'whiteout' })

    expect(result.current.shader).not.toBe(initialShader)
  })

  it('should provide list of available effects', () => {
    const { result } = renderHook(() => useShader(mockTexture, 'blur'))

    expect(result.current.availableEffects).toEqual(['blur', 'whiteout', 'wave'])
  })

  it('should handle null image texture', () => {
    const { result } = renderHook(() => useShader(null, 'blur'))

    expect(result.current.varValues.imageTexture).toBeNull()
  })
}) 