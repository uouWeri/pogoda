// Погода берётся с бесплатного сервиса Open-Meteo (ключ не нужен).
const GEO_URL = "https://geocoding-api.open-meteo.com/v1/search";
const WEATHER_URL = "https://api.open-meteo.com/v1/forecast";

const form = document.getElementById("form");
const input = document.getElementById("q");
const errorEl = document.getElementById("error");

// Код погоды Open-Meteo -> тип фона и подпись
function describe(code) {
  if (code === 0) return { type: "sun", text: "Ясно" };
  if (code <= 2) return { type: "sun", text: "Малооблачно" };
  if (code === 3) return { type: "cloud", text: "Облачно" };
  if (code === 45 || code === 48) return { type: "cloud", text: "Туман" };
  if (code >= 51 && code <= 57) return { type: "rain", text: "Морось" };
  if (code >= 61 && code <= 67) return { type: "rain", text: "Дождь" };
  if (code >= 71 && code <= 77) return { type: "snow", text: "Снег" };
  if (code >= 80 && code <= 82) return { type: "rain", text: "Ливень" };
  if (code === 85 || code === 86) return { type: "snow", text: "Снегопад" };
  if (code >= 95) return { type: "rain", text: "Гроза" };
  return { type: "cloud", text: "Облачно" };
}

async function loadCity(name) {
  errorEl.hidden = true;
  try {
    const g = await (await fetch(`${GEO_URL}?name=${encodeURIComponent(name)}&count=1&language=ru`)).json();
    if (!g.results || !g.results.length) throw new Error("Город не найден");
    const place = g.results[0];
    const url = `${WEATHER_URL}?latitude=${place.latitude}&longitude=${place.longitude}` +
      `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,is_day&wind_speed_unit=ms`;
    const w = (await (await fetch(url)).json()).current;
    const d = describe(w.weather_code);
    const t = Math.round(w.temperature_2m);
    document.getElementById("city").textContent = place.name + (place.country ? ", " + place.country : "");
    document.getElementById("temp").textContent = (t > 0 ? "+" : "") + t + "°";
    document.getElementById("cond").textContent = d.text;
    document.getElementById("hum").textContent = "Влажность: " + w.relative_humidity_2m + "%";
    document.getElementById("wind").textContent = "Ветер: " + Math.round(w.wind_speed_10m) + " м/с";
    setScene(d.type, w.is_day === 1);
    localStorage.setItem("city", place.name);
  } catch (e) {
    errorEl.textContent = e.message === "Город не найден" ? e.message : "Не удалось получить погоду. Проверьте интернет.";
    errorEl.hidden = false;
  }
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (input.value.trim()) loadCity(input.value.trim());
});

/* ---------- Анимированный фон ---------- */
const cv = document.getElementById("bg");
const ctx = cv.getContext("2d");
let W, H, parts = [], clouds = [], scene = "sun", day = true, t = 0;
const SKY = {
  sun: ["#2f8fe8", "#9fd6ff"], rain: ["#2b3a4d", "#5d7288"],
  snow: ["#6f8196", "#c3cfdb"], cloud: ["#5b7da3", "#b9c8d8"], night: ["#0a1430", "#26356b"]
};

function resize() {
  const d = window.devicePixelRatio || 1;
  W = innerWidth; H = innerHeight;
  cv.width = W * d; cv.height = H * d;
  ctx.setTransform(d, 0, 0, d, 0, 0);
  build();
}

function setScene(type, isDay) { scene = type; day = isDay; build(); }

function build() {
  parts = []; clouds = [];
  const n = scene === "rain" ? Math.round(W / 4) : scene === "snow" ? Math.round(W / 8) : 0;
  for (let i = 0; i < n; i++) {
    parts.push({ x: Math.random() * W, y: Math.random() * H,
      v: scene === "rain" ? 12 + Math.random() * 8 : 1 + Math.random() * 2, r: 1 + Math.random() * 2.5 });
  }
  const c = scene === "sun" ? 2 : scene === "cloud" ? 7 : 6;
  for (let j = 0; j < c; j++) {
    clouds.push({ x: Math.random() * W, y: 30 + Math.random() * H * 0.4, s: 0.6 + Math.random(), v: 0.15 + Math.random() * 0.3 });
  }
  if (scene === "sun" && !day) {
    for (let k = 0; k < 120; k++) parts.push({ x: Math.random() * W, y: Math.random() * H * 0.8, r: Math.random() * 1.5 + 0.3, v: 0 });
  }
}

function drawCloud(c, color) {
  const s = c.s * 60;
  ctx.fillStyle = color; ctx.beginPath();
  ctx.arc(c.x, c.y, s * 0.7, 0, 7);
  ctx.arc(c.x + s * 0.8, c.y - s * 0.3, s * 0.9, 0, 7);
  ctx.arc(c.x + s * 1.7, c.y, s * 0.7, 0, 7);
  ctx.rect(c.x, c.y, s * 1.7, s * 0.7);
  ctx.fill();
}

function frame() {
  const night = scene === "sun" && !day;
  const sky = SKY[night ? "night" : scene];
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, sky[0]); g.addColorStop(1, sky[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  if (scene === "sun" && day) {
    const sx = W * 0.8, sy = H * 0.2, r = Math.min(W, H) * 0.1;
    const gl = ctx.createRadialGradient(sx, sy, r * 0.5, sx, sy, r * 4);
    gl.addColorStop(0, "rgba(255,230,120,.7)"); gl.addColorStop(1, "rgba(255,230,120,0)");
    ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(255,225,100,.8)"; ctx.lineWidth = 4;
    for (let k = 0; k < 16; k++) {
      const a = k * Math.PI / 8 + t * 0.004;
      ctx.beginPath();
      ctx.moveTo(sx + Math.cos(a) * r * 1.3, sy + Math.sin(a) * r * 1.3);
      ctx.lineTo(sx + Math.cos(a) * r * 1.9, sy + Math.sin(a) * r * 1.9);
      ctx.stroke();
    }
    ctx.fillStyle = "#ffd84a"; ctx.beginPath(); ctx.arc(sx, sy, r, 0, 7); ctx.fill();
  }
  if (night) {
    ctx.fillStyle = "rgba(255,255,255,.85)";
    parts.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); });
    ctx.fillStyle = "#f4f1d0"; ctx.beginPath(); ctx.arc(W * 0.8, H * 0.2, Math.min(W, H) * 0.07, 0, 7); ctx.fill();
  }

  const cc = scene === "rain" ? "rgba(40,52,68,.85)" : night ? "rgba(60,70,110,.5)" : scene === "sun" ? "rgba(255,255,255,.85)" : "rgba(235,240,246,.8)";
  clouds.forEach(c => { drawCloud(c, cc); c.x += c.v; if (c.x > W + 150) c.x = -200; });

  if (scene === "rain") {
    ctx.strokeStyle = "rgba(190,215,240,.65)"; ctx.lineWidth = 1.5; ctx.beginPath();
    parts.forEach(p => {
      ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - 2, p.y + 14);
      p.y += p.v; p.x -= 0.5;
      if (p.y > H) { p.y = -20; p.x = Math.random() * W; }
    });
    ctx.stroke();
  } else if (scene === "snow") {
    ctx.fillStyle = "rgba(255,255,255,.9)";
    parts.forEach(p => {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
      p.y += p.v; p.x += Math.sin((t + p.y) / 40) * 0.5;
      if (p.y > H) { p.y = -5; p.x = Math.random() * W; }
    });
  }
  t++;
  requestAnimationFrame(frame);
}

addEventListener("resize", resize);
resize();
requestAnimationFrame(frame);
loadCity(localStorage.getItem("city") || "Москва");
