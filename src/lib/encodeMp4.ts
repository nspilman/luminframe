import { Muxer, ArrayBufferTarget } from 'mp4-muxer'

/**
 * H.264 encodes chroma at half resolution (4:2:0), so each frame side must be
 * even. Round down to the nearest even number, floored at 2 so a degenerate 1px
 * capture still yields a valid dimension the encoder accepts rather than zero.
 */
export function evenDimension(n: number): number {
  return Math.max(2, Math.floor(n / 2) * 2)
}

/**
 * H.264 profile/level strings to try, widest-support first: Constrained Baseline
 * 3.1, then Main 4.0, then High 4.0. isConfigSupported picks the first the
 * browser can actually encode, so we favour compatibility but accept better
 * profiles when only they are offered.
 */
const CODEC_CANDIDATES = ['avc1.42001f', 'avc1.4d0028', 'avc1.640028'] as const

/** Whether this browser can encode H.264 at all — i.e. WebCodecs is present. */
export function isMp4EncodingSupported(): boolean {
  return typeof VideoEncoder !== 'undefined'
}

/**
 * A target bitrate for a short looping clip. Scaled by frame area against a 480p
 * reference so small captures get small files and larger ones stay crisp; H.264
 * is efficient enough that this is generous for the ~2s clips we produce.
 */
function bitrateFor(width: number, height: number): number {
  const reference = 640 * 480
  return Math.round((width * height) / reference * 3_000_000)
}

/** The first candidate codec the browser reports it can encode, or null. */
async function firstSupportedCodec(base: VideoEncoderConfig): Promise<string | null> {
  for (const codec of CODEC_CANDIDATES) {
    const { supported } = await VideoEncoder.isConfigSupported({ ...base, codec })
    if (supported) return codec
  }
  return null
}

/**
 * Encode a sequence of RGBA frames into an H.264 MP4, looping length implied by
 * the frame timestamps. Standard, well-compressed and full-colour (no GIF
 * banding), and playable anywhere an MP4 is — including Bluesky's video embed.
 *
 * Async and browser-only: it drives WebCodecs' VideoEncoder and a muxer to
 * assemble the container. Throws where WebCodecs is unavailable or no H.264
 * config is supported, so callers can fall back to another format.
 */
export async function encodeMp4(frames: ImageData[], fps: number): Promise<Uint8Array> {
  if (frames.length === 0) throw new Error('encodeMp4: no frames to encode')
  if (!isMp4EncodingSupported()) throw new Error('encodeMp4: WebCodecs VideoEncoder unavailable')

  const width = evenDimension(frames[0].width)
  const height = evenDimension(frames[0].height)
  const bitrate = bitrateFor(width, height)

  const codec = await firstSupportedCodec({ codec: '', width, height, framerate: fps, bitrate })
  if (!codec) throw new Error('encodeMp4: no supported H.264 configuration')

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: 'avc', width, height },
    // Write the moov atom up front so the file plays without downloading it whole.
    fastStart: 'in-memory',
  })

  let encoderError: DOMException | null = null
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => {
      encoderError = e
    },
  })
  encoder.configure({ codec, width, height, framerate: fps, bitrate })

  const frameDurationUs = Math.round(1_000_000 / fps)
  frames.forEach((frame, i) => {
    const videoFrame = new VideoFrame(frame.data, {
      format: 'RGBA',
      codedWidth: frame.width,
      codedHeight: frame.height,
      // Crop odd captures to the even encode size (≤1px, invisible).
      visibleRect: { x: 0, y: 0, width, height },
      timestamp: i * frameDurationUs,
      duration: frameDurationUs,
    })
    // Periodic keyframes keep the clip seekable and every player happy.
    encoder.encode(videoFrame, { keyFrame: i % fps === 0 })
    videoFrame.close()
  })

  await encoder.flush()
  encoder.close()
  if (encoderError) throw encoderError

  muxer.finalize()
  return new Uint8Array(muxer.target.buffer)
}
