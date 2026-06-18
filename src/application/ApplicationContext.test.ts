import { ApplicationContext } from './ApplicationContext';

/**
 * Wiring smoke test for the dependency-injection container. It guards the
 * consolidation refactors: removing dead code or moving adapters must not break
 * construction of the use cases the live app reaches through the container.
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

    expect(context.getRenderEditUseCase()).toBeDefined();
    expect(context.getLoadImageUseCase()).toBeDefined();
    expect(context.getExportCanvasUseCase()).toBeDefined();
    expect(context.getSaveCanvasAsInputUseCase()).toBeDefined();
  });
});
