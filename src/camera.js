// getUserMedia lifecycle: the stream, the <video> playing it, and the frame grab.
// Nothing in here knows about the interface around it — it takes a container to
// draw into and hands back a data URL, and the caller decides what to say about it.

const CAPTURE_QUALITY = 0.92;

let stream = null;
let videoElement = null;
let lifecycleToken = 0;

export function isSupported() {
  return Boolean(navigator.mediaDevices?.getUserMedia);
}

export function isActive() {
  return stream !== null;
}

// Resolves false when the device has no camera at all — a different situation
// from the permission being refused, which throws. Any other failure is thrown
// as it came from getUserMedia; pass it to statusKeyForError() to say why.
export async function start({ container, label }) {
  stop();
  const token = lifecycleToken;

  if ((await hasVideoInput()) === false) return false;
  if (token !== lifecycleToken) return false;

  const nextStream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: { ideal: 'environment' },
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
    audio: false,
  });

  // A reset or a newer camera request may happen while the permission prompt
  // is open. Never let that older request resurrect a stream afterwards.
  if (token !== lifecycleToken) {
    nextStream.getTracks().forEach((track) => track.stop());
    return false;
  }

  stream = nextStream;

  const video = document.createElement('video');
  video.className = 'camera-preview';
  video.id = 'cameraPreview';
  video.autoplay = true;
  video.muted = true;
  video.playsInline = true;
  video.setAttribute('aria-label', label);

  container.replaceChildren(video);
  video.srcObject = stream;
  await video.play();

  if (token !== lifecycleToken) {
    video.srcObject = null;
    return false;
  }

  videoElement = video;

  return true;
}

// Null when the stream is running but has not produced a sized frame yet.
export function capture() {
  if (!videoElement?.videoWidth || !videoElement.videoHeight) return null;

  const canvas = document.createElement('canvas');
  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;
  canvas.getContext('2d').drawImage(videoElement, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL('image/jpeg', CAPTURE_QUALITY);
}

export function stop() {
  lifecycleToken += 1;

  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
    stream = null;
  }

  videoElement = null;
}

export function statusKeyForError(error) {
  if (error?.name === 'NotFoundError' || error?.name === 'OverconstrainedError') {
    return 'cameraNotFound';
  }

  if (error?.name === 'NotAllowedError' || error?.name === 'SecurityError') {
    return 'cameraDenied';
  }

  if (error?.name === 'NotReadableError') {
    return 'cameraBusy';
  }

  return 'cameraUnavailable';
}

// Null, not false, when the browser will not enumerate devices: that means "no
// answer", and asking for the stream anyway is the only way to find out.
async function hasVideoInput() {
  if (!navigator.mediaDevices?.enumerateDevices) return null;

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.some((device) => device.kind === 'videoinput');
  } catch {
    return null;
  }
}
