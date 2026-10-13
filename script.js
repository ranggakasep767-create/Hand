const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const hasil = document.getElementById('hasil');
const tombolMulai = document.getElementById('mulai');
const scareEl = document.getElementById('scare');

let audioCtx = null;
let cooldown = false;

// ---------- Deteksi gestur ----------

// Hitung jari yang terangkat
function hitungJari(lm) {
  const ujung = [8, 12, 16, 20]; // telunjuk, tengah, manis, kelingking
  const sendi = [6, 10, 14, 18];
  let n = 0;
  ujung.forEach((u, i) => { if (lm[u].y < lm[sendi[i]].y) n++; });
  if (Math.abs(lm[4].x - lm[17].x) > Math.abs(lm[3].x - lm[17].x)) n++; // jempol
  return n;
}

// Hanya jari tengah yang terangkat
function isMiddleFinger(lm) {
  const tengahNaik   = lm[12].y < lm[10].y && lm[12].y < lm[8].y;
  const lainTertekuk = lm[8].y > lm[6].y && lm[16].y > lm[14].y && lm[20].y > lm[18].y;
  return tengahNaik && lainTertekuk;
}

// ---------- Jumpscare ----------

function suaraJumpscare() {
  const t = audioCtx.currentTime;
  const master = audioCtx.createGain();
  master.gain.value = 100; // ubah ke 0.5 kalau terlalu keras
  master.connect(audioCtx.destination);

  // Teriakan: dua oscillator sawtooth yang pitch-nya naik
  [400, 633].forEach(f => {
    const o = audioCtx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * 3, t + 1);
    o.connect(master);
    o.start(t);
    o.stop(t + 1.5);
  });

  // Noise burst
  const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * 1.5, audioCtx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const noise = audioCtx.createBufferSource();
  noise.buffer = buf;
  noise.connect(master);
  noise.start(t);
}

function jumpscare() {
  if (cooldown) return;
  cooldown = true;
  scareEl.style.display = 'flex';
  suaraJumpscare();
  setTimeout(() => { scareEl.style.display = 'none'; }, 1500);
  setTimeout(() => { cooldown = false; }, 5000); // jeda 5 detik
}

// ---------- MediaPipe Hands ----------

const hands = new Hands({
  locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${f}`
});

hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7
});

hands.onResults(res => {
  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(res.image, 0, 0, canvas.width, canvas.height);

  if (res.multiHandLandmarks.length) {
    const lm = res.multiHandLandmarks[0];
    drawConnectors(ctx, lm, HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 3 });
    drawLandmarks(ctx, lm, { color: '#FF0000', radius: 4 });
    hasil.textContent = 'Jari terangkat: ' + hitungJari(lm);
    if (isMiddleFinger(lm)) jumpscare();
  } else {
    hasil.textContent = 'Tangan tidak terdeteksi';
  }
  ctx.restore();
});

const camera = new Camera(video, {
  onFrame: async () => { await hands.send({ image: video }); },
  width: 640,
  height: 480
});

// Browser memblokir suara sebelum ada klik, jadi semuanya dimulai dari tombol
tombolMulai.onclick = () => {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  camera.start();
  tombolMulai.style.display = 'none';
};
''