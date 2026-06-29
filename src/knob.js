// Rotary knob component (simplified aesthetic)
// makeKnob(containerEl, { min, max, step, value, onChange, formatVal })

const A_START = (135 * Math.PI) / 180;
const A_RANGE = (270 * Math.PI) / 180;

function draw(canvas, value01) {
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const cx = W / 2;
  const cy = H / 2;

  const R  = Math.min(W, H) / 2 - 2;
  const bR = R * 0.75;

  ctx.clearRect(0, 0, W, H);

  // Background
  ctx.fillStyle = "#14070A";
  ctx.fillRect(0, 0, W, H);

  // Outer ring (flat burgundy-brown)
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fillStyle = "#2A0F14";
  ctx.fill();

  ctx.strokeStyle = "#3A1418";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Tick marks (WHITE, inward)
  for (let i = 0; i <= 10; i++) {
    const a = A_START + (i / 10) * A_RANGE;
    const major = i === 0 || i === 5 || i === 10;

    const r1 = R - 2;
    const r2 = major ? R - 12 : R - 8;

    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
    ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = major ? 2 : 1;
    ctx.stroke();

    // Labels on major ticks (centered properly)
    if (major) {
      const labelR = R - 22;
      const lx = cx + Math.cos(a) * labelR;
      const ly = cy + Math.sin(a) * labelR;

      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const label = i === 0 ? "0" : i === 5 ? "50" : "100";
      ctx.fillText(label, lx, ly);
    }
  }

  // Knob body (flat dark burgundy)
  ctx.beginPath();
  ctx.arc(cx, cy, bR, 0, Math.PI * 2);
  ctx.fillStyle = "#1A0A0D";
  ctx.fill();

  ctx.strokeStyle = "#2E0F14";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Track
  const tR = bR * 0.80;
  ctx.beginPath();
  ctx.arc(cx, cy, tR, A_START, A_START + A_RANGE);
  ctx.strokeStyle = "#3A1418";
  ctx.lineWidth = 4;
  ctx.stroke();

  // Active arc
  const cAngle = A_START + value01 * A_RANGE;

  if (value01 > 0.001) {
    ctx.beginPath();
    ctx.arc(cx, cy, tR, A_START, cAngle);
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 4;
    ctx.stroke();
  }

  // Indicator line (kept, white)
  const iR = bR * 0.65;
  const ix = cx + Math.cos(cAngle) * iR;
  const iy = cy + Math.sin(cAngle) * iR;

  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(ix, iy);
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Center hub
  ctx.beginPath();
  ctx.arc(cx, cy, 5, 0, Math.PI * 2);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
}

export function makeKnob(container, { min, max, step, value, onChange, formatVal }) {
  const canvas = container.querySelector("canvas");
  const valEl  = container.querySelector(".knob-val");

  let current = value;
  let dragStartY = null;
  let dragStartVal = null;

  const norm  = (v) => (v - min) / (max - min);
  const clamp = (v) => Math.max(min, Math.min(max, v));
  const snap  = (v) => Math.round(v / step) * step;

  function setValue(v) {
    current = clamp(snap(v));
    draw(canvas, norm(current));
    if (valEl) valEl.textContent = formatVal(current);
    canvas.setAttribute("aria-valuenow", current);
  }

  const isDisabled = () => container.dataset.disabled === "true";

  canvas.addEventListener("mousedown", (e) => {
    if (isDisabled()) return;
    dragStartY = e.clientY;
    dragStartVal = current;

    const onMove = (ev) => {
      const dy = dragStartY - ev.clientY;
      setValue(dragStartVal + dy * (max - min) / 150);
      onChange(current);
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      dragStartY = dragStartVal = null;
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  });

  canvas.addEventListener("touchstart", (e) => {
    if (isDisabled()) return;
    dragStartY = e.touches[0].clientY;
    dragStartVal = current;
    e.preventDefault();
  }, { passive: false });

  canvas.addEventListener("touchmove", (e) => {
    if (dragStartY === null) return;
    const dy = dragStartY - e.touches[0].clientY;
    setValue(dragStartVal + dy * (max - min) / 150);
    onChange(current);
    e.preventDefault();
  }, { passive: false });

  canvas.addEventListener("touchend", () => {
    dragStartY = dragStartVal = null;
  });

  canvas.addEventListener("keydown", (e) => {
    if (isDisabled()) return;

    if (e.key === "ArrowUp" || e.key === "ArrowRight") {
      setValue(current + step);
      onChange(current);
      e.preventDefault();
    } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
      setValue(current - step);
      onChange(current);
      e.preventDefault();
    }
  });

  canvas.setAttribute("role", "slider");
  canvas.setAttribute("aria-valuemin", min);
  canvas.setAttribute("aria-valuemax", max);
  canvas.setAttribute("aria-valuenow", current);

  setValue(value);

  return {
    getValue: () => current,
    setValue
  };
}