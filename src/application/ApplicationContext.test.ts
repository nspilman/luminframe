import { ApplicationContext } from './ApplicationContext';
import { registeredShaders } from '@/types/shader';

/**
 * Wiring smoke test for the dependency-injection container. It guards the
 * consolidation refactors: removing dead code or moving adapters must not break
 * construction, and the shader "door" must keep opening onto the full library.
 *
 * Note: getInstance() builds the Three.js adapter without a canvas, so no WebGL
 * context is created here — only the object graph is exercised.
 */
describe('ApplicationContext', () => {
  it('is a singleton', () => {
    expect(ApplicationContext.getInstance()).toBe(ApplicationContext.getInstance());
  });

  it('exposes every use case as a constructed instance', () => {
    const context = ApplicationContext.getInstance();

    expect(context.getApplyShaderEffectUseCase()).toBeDefined();
    expect(context.getLoadImageUseCase()).toBeDefined();
    expect(context.getExportCanvasUseCase()).toBeDefined();
    expect(context.getSaveCanvasAsInputUseCase()).toBeDefined();
  });

  it('reaches the full shader library through the wired use case', () => {
    const available = ApplicationContext.getInstance()
      .getApplyShaderEffectUseCase()
      .getAvailableShaders()
      .sort();

    expect(available).toEqual([...registeredShaders].sort());
  });
});
