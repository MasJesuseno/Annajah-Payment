// In-memory store untuk captcha
const captchaStore = new Map();
const CAPTCHA_TTL = 5 * 60 * 1000; // 5 menit

// Bersihkan captcha kadaluarsa setiap 2 menit
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of captchaStore.entries()) {
    if (now > data.expiresAt) {
      captchaStore.delete(token);
    }
  }
}, 2 * 60 * 1000);

function generateCaptcha() {
  const ops = ['+', '-'];
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a, b, answer;

  if (op === '+') {
    a = Math.floor(Math.random() * 50) + 1;
    b = Math.floor(Math.random() * 50) + 1;
    answer = a + b;
  } else {
    a = Math.floor(Math.random() * 50) + 10;
    b = Math.floor(Math.random() * a) + 1; // b < a biar hasil positif
    answer = a - b;
  }

  const question = `${a} ${op} ${b}`;
  const token = require('crypto').randomBytes(16).toString('hex');

  captchaStore.set(token, {
    answer: answer.toString(),
    expiresAt: Date.now() + CAPTCHA_TTL
  });

  return { token, question };
}

function validateCaptcha(token, answer) {
  if (!token || !answer) return false;
  const data = captchaStore.get(token);
  if (!data) return false;
  if (Date.now() > data.expiresAt) {
    captchaStore.delete(token);
    return false;
  }
  const isValid = data.answer === answer.toString().trim();
  captchaStore.delete(token); // One-time use
  return isValid;
}

module.exports = { generateCaptcha, validateCaptcha };
