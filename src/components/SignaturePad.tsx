'use client';
// src/components/SignaturePad.tsx
// A simple draw-with-finger signature pad, used wherever a real digital
// signature needs capturing (field officer's own signature, org
// signatories entered by admin use file upload instead since those are
// typically an existing scanned signature, not drawn fresh).
import { useRef, useState, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';

export function SignaturePad({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const hasStroke = useRef(false);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1f2937';
  }, []);

  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    drawing.current = true;
    const ctx = canvasRef.current!.getContext('2d')!;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext('2d')!;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    hasStroke.current = true;
    setIsEmpty(false);
  }

  function end() {
    if (!drawing.current) return;
    drawing.current = false;
    if (hasStroke.current) onChange(canvasRef.current!.toDataURL('image/png'));
  }

  function clear() {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasStroke.current = false;
    setIsEmpty(true);
    onChange(null);
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerLeave={end}
        className="w-full h-40 bg-white border-2 border-dashed border-sage-200 rounded-2xl touch-none"
        style={{ touchAction: 'none' }}
      />
      <div className="flex items-center justify-between mt-2">
        <span className="text-sage-400 text-xs">{isEmpty ? 'Sign above with your finger' : 'Looks good'}</span>
        <button onClick={clear} type="button" className="flex items-center gap-1 text-xs text-sage-500 font-semibold">
          <RotateCcw className="w-3 h-3"/> Clear
        </button>
      </div>
    </div>
  );
}
