import { renderHook, act } from '@testing-library/react'
import { useAsyncStatus } from './useAsyncStatus'

/** A promise whose settlement is controlled by the test, for ordering races. */
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('useAsyncStatus', () => {
  it('is pending while a task is in flight', async () => {
    const task = deferred<void>()
    const { result } = renderHook(() => useAsyncStatus(() => task.promise))

    act(() => {
      result.current.run()
    })
    expect(result.current.status).toBe('pending')

    await act(async () => {
      task.resolve()
      await task.promise
    })
  })

  it('is idle after a task resolves', async () => {
    const { result } = renderHook(() => useAsyncStatus(() => Promise.resolve('ok')))

    await act(async () => {
      await result.current.run()
    })
    expect(result.current.status).toBe('idle')
  })

  it('is error and exposes the cause after a task rejects', async () => {
    const boom = new Error('boom')
    const { result } = renderHook(() => useAsyncStatus(() => Promise.reject(boom)))

    await act(async () => {
      await result.current.run()
    })
    expect(result.current.status).toBe('error')
    expect(result.current.error).toBe(boom)
  })

  it('ignores a stale run that settles after a newer run', async () => {
    // Two runs in flight at once. The newer run (b) is the live one; the older
    // run (a) settles later and must not overwrite the live status.
    const a = deferred<string>()
    const b = deferred<string>()
    const pending = [a.promise, b.promise]
    let call = 0
    const task = () => pending[call++]
    const { result } = renderHook(() => useAsyncStatus(task))

    await act(async () => {
      result.current.run() // token 1 -> a
      result.current.run() // token 2 -> b (live)
    })

    // The live run resolves first: status settles to idle.
    await act(async () => {
      b.resolve('new')
      await b.promise
    })
    expect(result.current.status).toBe('idle')

    // The stale run rejects late. If the guard works, it is ignored.
    await act(async () => {
      a.reject(new Error('stale'))
      await a.promise.catch(() => {})
    })
    expect(result.current.status).toBe('idle')
  })
})
