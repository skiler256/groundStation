/* =========================
   🎵 SONS CLASSIQUES
========================= */

const sounds = {
    LIFTOFF: new Audio("sound/lift_off.wav"),
    BEEP: new Audio("sound/beep.mp3"),
    ENGON: new Audio("sound/engines_on.wav"),
    LOCK: new Audio("sound/lock.mp3"),
    WARN: new Audio("sound/warning.mp3"),
    STARTUP: new Audio("sound/start.wav")
};

function unlockSounds() {
    sounds.STARTUP.currentTime = 0;
    sounds.STARTUP.play();

    initAudioContext(); // 🔓 nécessaire pour WebAudio
}

function soundAlert(msg) {
    if(msg == "DORAD")
        doRadar = true;
    if(msg == "STRAD")
        doRadar = false;
    const sound = sounds[msg];
    if (sound) {
        sound.currentTime = 0;
        sound.play();
    }
}

/* =========================
   🔊 RADAR ENGINE PROPRE
========================= */

let audioCtx = null;
let masterGain = null;

let doRadar = false;

let currentAltitude = 999;
let lastBeepTime = 0;

// 🎯 Paramètres radar
const minInterval = 40;     // altitude = 0 → bip très rapide
const maxInterval = 1000;    // altitude = maxAlt → bip lent
const maxAlt = 100;          // altitude max prise en compte

// 🔓 Création après interaction utilisateur
function initAudioContext() {

    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        masterGain = audioCtx.createGain();
        masterGain.gain.value = 0.2; // 🎚 volume global
        masterGain.connect(audioCtx.destination);

        console.log("AudioContext ready ✅");

        requestAnimationFrame(radarEngine);
    } else {
        audioCtx.resume();
    }
}

/* =========================
   📡 À appeler depuis WebSocket
========================= */

function updateRadarAltitude(alt) {
    currentAltitude = alt;
}

/* =========================
   ⚙️ MOTEUR RADAR (60 Hz indépendant)
========================= */

function radarEngine(timestamp) {

    if (!audioCtx) {
        requestAnimationFrame(radarEngine);
        return;
    }

    if (currentAltitude <= maxAlt) {

        const interval = getRadarInterval(currentAltitude);

        if (timestamp - lastBeepTime > interval) {

            const freq = getRadarFrequency(currentAltitude);

            playBeep(freq, 70);

            lastBeepTime = timestamp;
        }
    }

    requestAnimationFrame(radarEngine);
}

/* =========================
   📈 LOI AFFINE INTERVALLE
========================= */

function getRadarInterval(altitude) {

    altitude = Math.max(0, Math.min(maxAlt, altitude));

    // interval = m * altitude + b
    const m = (maxInterval - minInterval) / maxAlt;
    const b = minInterval;

    return m * altitude + b;
}

/* =========================
   🎵 LOI AFFINE FREQUENCE
========================= */

function getRadarFrequency(altitude) {

    altitude = Math.max(0, Math.min(maxAlt, altitude));

    const minFreq = 600;
    const maxFreq = 2000;

    const m = (maxFreq - minFreq) / maxAlt;
    const b = minFreq;

    return maxFreq - m * altitude; 
    // plus on est bas → plus la fréquence est haute
}

/* =========================
   🔔 BEEP SINUS PROPRE
========================= */

function playBeep(freq, duration) {

    if (!audioCtx) return;
    if(!doRadar) return;

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = freq;

    const now = audioCtx.currentTime;

    // enveloppe anti-clic
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(1, now + 0.01);
    gainNode.gain.linearRampToValueAtTime(0, now + duration / 1000);

    oscillator.connect(gainNode);
    gainNode.connect(masterGain);

    oscillator.start(now);
    oscillator.stop(now + duration / 1000);
}

/* =========================
   🎚 Réglage Volume Global
========================= */

function setRadarVolume(value) {
    if (masterGain) {
        masterGain.gain.value = Math.max(0, Math.min(1, value));
    }
}
