// Rotary knob component. Canvas-drawn, drag up/down to change value.
// makeKnob(containerEl, { min, max, step, value, onChange, formatVal }) → { getValue, setValue }

const A_START = (135 * Math.PI) / 180; // 7:30 o'clock (SW) in canvas coords
const A_RANGE = (270 * Math.PI) / 180; // 270° clockwise sweep

function draw(canvas, value01) {
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const cx = W / 2;
  const cy = H / 2;
  const R  = Math.min(W, H) / 2 - 2;

  ctx.clearRect(0, 0, W, H);

  // Knob body — reflective black disc
  const bodyGrd = ctx.createRadialGradient(cx - R * 0.1, cy - R * 0.1, R * 0.04, cx, cy, R);
  bodyGrd.addColorStop(0, "#3C2A18");
  bodyGrd.addColorStop(1, "#160C06");
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fillStyle = bodyGrd;
  ctx.fill();

  // Rim — inset shadow ring
  ctx.beginPath();
  ctx.arc(cx, cy, R - 0.5, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(0,0,0,0.65)";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Indicator line — floats on the disc, does not pass through center
  const cAngle = A_START + value01 * A_RANGE;
  const sx = cx + Math.cos(cAngle) * (R * 0.25);
  const sy = cy + Math.sin(cAngle) * (R * 0.25);
  const ix = cx + Math.cos(cAngle) * (R * 0.87);
  const iy = cy + Math.sin(cAngle) * (R * 0.87);
  ctx.save();
  ctx.shadowColor = "#F0962E";
  ctx.shadowBlur  = 8;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(ix, iy);
  ctx.strokeStyle = "#F0962E";
  ctx.lineWidth   = 2.5;
  ctx.lineCap     = "round";
  ctx.stroke();
  ctx.restore();
}

export function makeKnob(container, { min, max, step, value, onChange, formatVal }) {
  const canvas = container.querySelector("canvas");
  const valEl  = container.querySelector(".knob-val");
  let current      = value;
  let dragStartY   = null;
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

  // Mouse — relative-to-start so fast moves don't skip
  canvas.addEventListener("mousedown", (e) => {
    if (isDisabled()) return;
    dragStartY   = e.clientY;
    dragStartVal = current;
    e.preventDefault();
    const onMove = (ev) => {
      const dy = dragStartY - ev.clientY; // up = positive = increase
      setValue(dragStartVal + dy * (max - min) / 150);
      onChange(current);
    };
    const onUp = () => {
      dragStartY = dragStartVal = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup",   onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
  });

  // Touch
  canvas.addEventListener("touchstart", (e) => {
    if (isDisabled()) return;
    dragStartY   = e.touches[0].clientY;
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
  canvas.addEventListener("touchend", () => { dragStartY = dragStartVal = null; });

  // Keyboard accessibility
  canvas.addEventListener("keydown", (e) => {
    if (isDisabled()) return;
    if (e.key === "ArrowUp" || e.key === "ArrowRight") {
      setValue(current + step); onChange(current); e.preventDefault();
    } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
      setValue(current - step); onChange(current); e.preventDefault();
    }
  });

  canvas.setAttribute("role",         "slider");
  canvas.setAttribute("aria-valuemin", min);
  canvas.setAttribute("aria-valuemax", max);
  canvas.setAttribute("aria-valuenow", current);

  setValue(value);
  return { getValue: () => current, setValue };
}
