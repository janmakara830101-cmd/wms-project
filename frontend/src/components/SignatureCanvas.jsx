import React, { useRef, useEffect, useState } from 'react';

export default function SignatureCanvas({ onSave, onClear }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#185FA5';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  function getPos(e, canvas) {
    const r = canvas.getBoundingClientRect();
    const sx = canvas.width / r.width;
    const sy = canvas.height / r.height;
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (cx - r.left) * sx, y: (cy - r.top) * sy };
  }

  function startDraw(e) {
    e.preventDefault();
    setDrawing(true);
    lastPos.current = getPos(e, canvasRef.current);
  }
  function draw(e) {
    e.preventDefault();
    if (!drawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
  }
  function endDraw() { setDrawing(false); }

  function clear() {
    const canvas = canvasRef.current;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    if (onClear) onClear();
  }

  function save() {
    const data = canvasRef.current.toDataURL('image/png');
    if (onSave) onSave(data);
  }

  return (
    <div>
      <div className="border border-gray-200 rounded-md overflow-hidden bg-white cursor-crosshair">
        <canvas
          ref={canvasRef}
          width={480} height={100}
          style={{ display: 'block', width: '100%', height: 100 }}
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}
        />
      </div>
      <div className="flex gap-2 mt-2">
        <button type="button" onClick={clear}
          className="px-2 py-1 text-[11.5px] border border-red-200 text-red-600 rounded hover:bg-red-50 flex items-center gap-1">
          <i className="ti ti-eraser" /> Clear
        </button>
        <button type="button" onClick={save}
          className="px-2 py-1 text-[11.5px] bg-[#1D9E75] text-white rounded hover:bg-[#0F6E56] flex items-center gap-1">
          <i className="ti ti-check" /> Save
        </button>
      </div>
    </div>
  );
}
