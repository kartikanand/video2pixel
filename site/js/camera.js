// Thin wrapper around getUserMedia with human-readable errors.

export class CameraError extends Error {
  name = 'CameraError';
}

function explain(error) {
  switch (error?.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Camera access was blocked. Allow it in your browser’s site settings and try again.';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'No camera was found on this device.';
    case 'NotReadableError':
    case 'AbortError':
      return 'The camera is busy or unavailable. Close other apps using it and try again.';
    default:
      return 'Could not start the camera.';
  }
}

/** Starts the camera and plays it into `video`. Resolves once frames flow. */
export async function startCamera(video) {
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    throw new CameraError('Camera access needs a secure (https) connection and a supported browser.');
  }
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
    });
  } catch (error) {
    throw new CameraError(explain(error));
  }
  video.srcObject = stream;
  try {
    await video.play();
  } catch {
    stopCamera(video);
    throw new CameraError('Could not start the camera.');
  }
  return stream;
}

export function stopCamera(video) {
  for (const track of video.srcObject?.getTracks() ?? []) track.stop();
  video.srcObject = null;
}
