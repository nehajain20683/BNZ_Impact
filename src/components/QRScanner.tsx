'use client';
// src/components/QRScanner.tsx
// Opens the device camera and decodes a QR code in real time, matching
// this app's established pattern of loading a library via CDN rather than
// an npm dependency (same approach used for the donor dashboard map with
// Leaflet) — no library existed in this project for QR decoding at all.
// jsQR is a lightweight, pure-JS decoder: it takes raw pixel data, not a
// video element directly, so this component also owns the camera stream
// and the per-frame canvas capture loop that feeds it.
import { useEffect, useRef, useState } from 'react';
import { X, Camera as CameraIcon, AlertCircle } from 'lucide-react';

let jsQRLoadingPromise: Promise<void> | null = null;

function loadJsQR(): Promise<void> {
  if ((window as any).jsQR) return Promise.resolve();
  if (jsQRLoadingPromise) return jsQRLoadingPromise;
  jsQRLoadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/jsqr@1.4.0/dist/jsQR.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load QR scanner'));
    document.body.appendChild(script);
  });
  return jsQRLoadingPromise;
}

export function QRScanner({
  onScan, onClose, title = 'Scan Tree Tag QR Code',
}: {
  onScan: (text: string) => void;
  onClose: () => void;
  title?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const [status, setStatus] = useState<'loading' | 'scanning' | 'error'>('loading');
  const [error, setError] = useState('');
  const scannedRef = useRef(false); // guards against firing onScan multiple times for one code

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        await loadJsQR();
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setStatus('scanning');
        tick();
      } catch (err: any) {
        if (!cancelled) {
          setStatus('error');
          setError(err?.name === 'NotAllowedError' ? 'Camera permission denied — allow camera access to scan.' : 'Could not open the camera.');
        }
      }
    }

    function tick() {
      const video = videoRef.current, canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA && !scannedRef.current) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const jsQR = (window as any).jsQR;
          const result = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
          if (result?.data) {
            scannedRef.current = true;
            onScan(result.data);
            return; // stop the loop — parent decides what happens next (usually closes this)
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    start();
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 bg-black z-[200] flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <span className="font-semibold text-sm">{title}</span>
        <button onClick={onClose} className="text-white/80 hover:text-white"><X className="w-6 h-6"/></button>
      </div>

      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {status === 'error' ? (
          <div className="text-center px-6">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3"/>
            <p className="text-white text-sm">{error}</p>
          </div>
        ) : (
          <>
            <video ref={videoRef} playsInline muted className="w-full h-full object-cover"/>
            <canvas ref={canvasRef} className="hidden"/>
            {status === 'loading' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <CameraIcon className="w-8 h-8 text-white/60 animate-pulse"/>
              </div>
            )}
            {status === 'scanning' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-64 border-2 border-white/70 rounded-2xl"/>
              </div>
            )}
          </>
        )}
      </div>

      <div className="px-4 py-4 text-center text-white/60 text-xs">
        Point the camera at the QR code on the tree tag
      </div>
    </div>
  );
}
