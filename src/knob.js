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
  const R  = Math.min(W, H) / 2 - 2; // outer radius
  const bR = R * 0.75;                // knob-body radius

  ctx.clearRect(0, 0, W, H);

  // Outer bezel ring — warm cream with radial depth
  const bezGrd = ctx.createRadialGradient(cx - R * 0.22, cy - R * 0.22, R * 0.08, cx, cy, R);
  bezGrd.addColorStop(0,   "#EDE0C0");
  bezGrd.addColorStop(0.5, "#C6A872");
  bezGrd.addColorStop(1,   "#7A5828");
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fillStyle = bezGrd;
  ctx.fill();

  // Bezel highlight — upper-left glint
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R - 1.5, Math.PI * 1.05, Math.PI * 1.78);
  ctx.strokeStyle = "rgba(255,255,255,0.38)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // Bezel shadow — lower-right
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R - 0.5, Math.PI * 0.08, Math.PI * 0.82);
  ctx.strokeStyle = "rgba(0,0,0,0.28)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  // Tick marks on bezel
  for (let i = 0; i <= 10; i++) {
    const a     = A_START + (i / 10) * A_RANGE;
    const major = i === 0 || i === 5 || i === 10;
    const r1    = R - 2;
    const r2    = major ? R - 9 : R - 6;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
    ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.strokeStyle = major ? "rgba(50,30,10,0.9)" : "rgba(50,30,10,0.4)";
    ctx.lineWidth   = major ? 1.5 : 1;
    ctx.stroke();
  }

  // Knob body — dark recessed disk
  const bodyGrd = ctx.createRadialGradient(cx - bR * 0.1, cy - bR * 0.1, bR * 0.04, cx, cy, bR);
  bodyGrd.addColorStop(0, "#3C2A18");
  bodyGrd.addColorStop(1, "#160C06");
  ctx.beginPath();
  ctx.arc(cx, cy, bR, 0, Math.PI * 2);
  ctx.fillStyle = bodyGrd;
  ctx.fill();

  // Body rim — inset shadow ring
  ctx.beginPath();
  ctx.arc(cx, cy, bR - 0.5, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(0,0,0,0.65)";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Arc track — inactive groove
  const tR = bR * 0.80;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, tR, A_START, A_START + A_RANGE);
  ctx.strokeStyle = "#231208";
  ctx.lineWidth   = 3.5;
  ctx.lineCap     = "round";
  ctx.stroke();
  ctx.restore();

  // Arc fill — active range, amber glow
  const cAngle = A_START + value01 * A_RANGE;
  if (value01 > 0.001) {
    ctx.save();
    ctx.shadowColor = "#F0962E";
    ctx.shadowBlur  = 5;
    ctx.beginPath();
    ctx.arc(cx, cy, tR, A_START, cAngle);
    ctx.strokeStyle = "#C97B2C";
    ctx.lineWidth   = 3.5;
    ctx.lineCap     = "round";
    ctx.stroke();
    ctx.restore();
  }

  // Indicator line
  const iR = bR * 0.63;
  const ix  = cx + Math.cos(cAngle) * iR;
  const iy  = cy + Math.sin(cAngle) * iR;
  ctx.save();
  ctx.shadowColor = "#F0962E";
  ctx.shadowBlur  = 8;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(ix, iy);
  ctx.strokeStyle = "#F0962E";
  ctx.lineWidth   = 2.5;
  ctx.lineCap     = "round";
  ctx.stroke();
  ctx.restore();

  // Indicator tip dot
  ctx.save();
  ctx.shadowColor = "#F0962E";
  ctx.shadowBlur  = 12;
  ctx.beginPath();
  ctx.arc(ix, iy, 2.8, 0, Math.PI * 2);
  ctx.fillStyle = "#FFB84A";
  ctx.fill();
  ctx.restore();

  // Center hub
  const hubGrd = ctx.createRadialGradient(cx - 1, cy - 1, 0.5, cx, cy, 5);
  hubGrd.addColorStop(0, "#4A2E10");
  hubGrd.addColorStop(1, "#140800");
  ctx.beginPath();
  ctx.arc(cx, cy, 5, 0, Math.PI * 2);
  ctx.fillStyle = hubGrd;
  ctx.fill();
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
