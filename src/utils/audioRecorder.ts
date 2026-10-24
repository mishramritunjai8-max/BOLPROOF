/**
 * Audio Recording and PCM/WAV Conversion Utility
 *
 * Implements a reliable browser recording path:
 * 1. Captures audio via MediaRecorder from the microphone.
 * 2. Decodes the recorded compressed audio (WebM/Opus) into PCM samples using Web Audio API AudioContext.
 * 3. Resamples audio to 16,000 Hz mono using OfflineAudioContext (ideal for speech-to-text models like Prisma).
 * 4. Encodes raw PCM float samples into a genuine 16-bit linear PCM RIFF/WAV audio blob.
 *
 * Note: Never simply rename a .webm file to .wav.
 */

export interface RecordingResult {
  rawBlob: Blob;
  wavBlob: Blob;
  durationMs: number;
}

export class AudioRecordingService {
  private mediaRecorder: MediaRecorder | null = null;
  private mediaStream: MediaStream | null = null;
  private recordedChunks: Blob[] = [];
  private startTime: number = 0;

  /**
   * Checks whether the current browser supports audio recording.
   */
  public static isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function' &&
      typeof window.MediaRecorder !== 'undefined'
    );
  }

  /**
   * Starts recording from the microphone after explicit user interaction.
   */
  public async start(): Promise<void> {
    if (!AudioRecordingService.isSupported()) {
      throw new Error('Microphone recording is not supported in this browser.');
    }

    // Stop any existing tracks if still running
    this.cleanup();

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });
    } catch (err: unknown) {
      const error = err as Error;
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        throw new Error('Microphone permission was denied. Please allow microphone access in your browser settings.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        throw new Error('No microphone device found. Please connect a microphone and try again.');
      }
      throw new Error(`Could not access microphone: ${error.message || 'Unknown error'}`);
    }

    this.recordedChunks = [];
    this.startTime = Date.now();

    // Determine supported mime type for MediaRecorder
    let mimeType = '';
    const preferredTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
    for (const type of preferredTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        mimeType = type;
        break;
      }
    }

    this.mediaRecorder = mimeType
      ? new MediaRecorder(this.mediaStream, { mimeType })
      : new MediaRecorder(this.mediaStream);

    this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
      if (event.data && event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    this.mediaRecorder.start(100); // chunk every 100ms
  }

  /**
   * Stops recording, releases the microphone stream, and converts the audio to true 16-bit PCM WAV.
   */
  public async stop(): Promise<RecordingResult> {
    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
      throw new Error('No active recording found to stop.');
    }

    const durationMs = Date.now() - this.startTime;

    const stopPromise = new Promise<Blob>((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('MediaRecorder not initialized'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const mime = this.mediaRecorder?.mimeType || 'audio/webm';
        const rawBlob = new Blob(this.recordedChunks, { type: mime });
        resolve(rawBlob);
      };

      this.mediaRecorder.onerror = (e) => {
        reject(new Error(`Recording error: ${e.error?.message || 'Unknown recorder error'}`));
      };

      this.mediaRecorder.stop();
    });

    const rawBlob = await stopPromise;
    this.cleanup();

    if (rawBlob.size === 0) {
      throw new Error('Recorded audio is empty. Please speak into the microphone and try again.');
    }

    // Convert raw browser blob to genuine 16-bit PCM WAV
    const wavBlob = await convertBlobToWav(rawBlob, 16000);

    return {
      rawBlob,
      wavBlob,
      durationMs,
    };
  }

  /**
   * Cancels active recording and releases hardware stream.
   */
  public cancel(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {
        // ignore
      }
    }
    this.cleanup();
  }

  private cleanup(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      this.mediaStream = null;
    }
    this.mediaRecorder = null;
    this.recordedChunks = [];
  }
}

/**
 * Decodes compressed audio and re-encodes to a genuine 16-bit linear PCM WAV file.
 * Resamples to 16,000 Hz mono (ideal for speech-to-text models like Gnani Prisma).
 */
export async function convertBlobToWav(rawBlob: Blob, targetSampleRate = 16000): Promise<Blob> {
  const arrayBuffer = await rawBlob.arrayBuffer();

  const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtxClass) {
    throw new Error('Web Audio API is not supported in this browser.');
  }

  const audioContext = new AudioCtxClass();
  let decodedBuffer: AudioBuffer;

  try {
    decodedBuffer = await audioContext.decodeAudioData(arrayBuffer);
  } catch (err: unknown) {
    await audioContext.close().catch(() => {});
    throw new Error('Failed to decode recorded audio. The audio format was not recognized by the browser.');
  } finally {
    await audioContext.close().catch(() => {});
  }

  // Resample using OfflineAudioContext
  const numberOfChannels = 1; // mono
  const targetLength = Math.max(1, Math.round(decodedBuffer.duration * targetSampleRate));

  const OfflineCtxClass =
    window.OfflineAudioContext ||
    (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext }).webkitOfflineAudioContext;

  const offlineContext = new OfflineCtxClass(numberOfChannels, targetLength, targetSampleRate);
  const source = offlineContext.createBufferSource();
  source.buffer = decodedBuffer;
  source.connect(offlineContext.destination);
  source.start(0);

  const resampledBuffer = await offlineContext.startRendering();
  const samples = resampledBuffer.getChannelData(0);

  // Encode Float32 PCM to 16-bit linear PCM WAV with standard 44-byte RIFF header
  const wavBytes = encodePcmToWav(samples, targetSampleRate);
  return new Blob([wavBytes], { type: 'audio/wav' });
}

/**
 * Encodes Float32Array PCM samples into a 16-bit mono RIFF/WAV ArrayBuffer.
 */
function encodePcmToWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);

  // Helper to write ASCII string bytes
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  // 1. ChunkID: "RIFF"
  writeString(0, 'RIFF');
  // 2. ChunkSize: 36 + SubChunk2Size
  view.setUint32(4, 36 + dataSize, true);
  // 3. Format: "WAVE"
  writeString(8, 'WAVE');

  // 4. Subchunk1ID: "fmt "
  writeString(12, 'fmt ');
  // 5. Subchunk1Size: 16 for PCM
  view.setUint32(16, 16, true);
  // 6. AudioFormat: 1 (Linear PCM)
  view.setUint16(20, 1, true);
  // 7. NumChannels: 1 (Mono)
  view.setUint16(22, numChannels, true);
  // 8. SampleRate
  view.setUint32(24, sampleRate, true);
  // 9. ByteRate: SampleRate * NumChannels * BitsPerSample/8
  view.setUint32(28, byteRate, true);
  // 10. BlockAlign: NumChannels * BitsPerSample/8
  view.setUint16(32, blockAlign, true);
  // 11. BitsPerSample: 16
  view.setUint16(34, bitsPerSample, true);

  // 12. Subchunk2ID: "data"
  writeString(36, 'data');
  // 13. Subchunk2Size
  view.setUint32(40, dataSize, true);

  // Write 16-bit PCM samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    // Convert float [-1.0, 1.0] to signed 16-bit integer [-32768, 32767]
    const pcm = s < 0 ? s * 0x8000 : s * 0x7fff;
    view.setInt16(offset, pcm, true);
  }

  return buffer;
}
