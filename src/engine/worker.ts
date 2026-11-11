import { analyzeText } from './analyze'

self.onmessage = (e: MessageEvent) => {
  const { id, text, fileName, bytes, opts } = e.data
  try {
    const result = analyzeText(text, fileName, bytes, opts)
    ;(self as unknown as Worker).postMessage({ id, result })
  } catch (err) {
    ;(self as unknown as Worker).postMessage({ id, error: String(err) })
  }
}
