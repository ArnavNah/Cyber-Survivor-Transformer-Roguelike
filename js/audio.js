// Survivors Arena Web Audio API Synthesizer (Crash-proofed)

class AudioManager {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  // Lazy initialize AudioContext on user interaction
  init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    } catch (e) {
      console.warn('Web Audio API is not supported in this browser.', e);
    }
  }

  resume() {
    try {
      this.init();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    } catch (e) {
      console.warn('Failed to resume AudioContext:', e);
    }
  }

  // Synthesize laser shoot sound
  playShoot() {
    try {
      this.resume();
      if (!this.ctx || this.muted) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      // High frequency downward sweep with pitch variation
      const pitch = 0.95 + Math.random() * 0.10;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800 * pitch, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150 * pitch, this.ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.15);
    } catch (e) {
      console.warn('Audio playShoot failed:', e);
    }
  }

  // Synthesize impact hit sound
  playHit() {
    try {
      this.resume();
      if (!this.ctx || this.muted) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      // Deep crunch sweep with pitch variation
      const pitch = 0.95 + Math.random() * 0.15;
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150 * pitch, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(40 * pitch, this.ctx.currentTime + 0.1);

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.1);
    } catch (e) {
      console.warn('Audio playHit failed:', e);
    }
  }

  // Synthesize gem collection chime
  playGem() {
    try {
      this.resume();
      if (!this.ctx || this.muted) return;

      const time = this.ctx.currentTime;
      
      // Quick double chime
      const playNote = (freq, delay, duration) => {
        try {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, time + delay);
          
          gain.gain.setValueAtTime(0.0001, time + delay); // non-zero starting point for safety
          gain.gain.linearRampToValueAtTime(0.06, time + delay + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, time + delay + duration);

          osc.start(time + delay);
          osc.stop(time + delay + duration);
        } catch (err) {
          // Ignore nested play failures
        }
      };

      playNote(987.77, 0, 0.12); // B5
      playNote(1318.51, 0.06, 0.18); // E6
    } catch (e) {
      console.warn('Audio playGem failed:', e);
    }
  }

  // Synthesize level up flourish
  playLevelUp() {
    try {
      this.resume();
      if (!this.ctx || this.muted) return;

      const time = this.ctx.currentTime;
      const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C4, E4, G4, C5, E5, G5, C6
      
      notes.forEach((freq, index) => {
        try {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          // Mix square and triangle for rich brassy sound
          osc.type = index % 2 === 0 ? 'sine' : 'triangle';
          osc.frequency.setValueAtTime(freq, time + index * 0.08);

          gain.gain.setValueAtTime(0.0001, time + index * 0.08);
          gain.gain.linearRampToValueAtTime(0.05, time + index * 0.08 + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.0001, time + index * 0.08 + 0.35);

          osc.start(time + index * 0.08);
          osc.stop(time + index * 0.08 + 0.4);
        } catch (err) {}
      });
    } catch (e) {
      console.warn('Audio playLevelUp failed:', e);
    }
  }

  // Synthesize boss spawning sound
  playBossSpawn() {
    try {
      this.resume();
      if (!this.ctx || this.muted) return;

      const time = this.ctx.currentTime;
      
      // Heavy warning siren
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, time);
      osc.frequency.linearRampToValueAtTime(80, time + 0.6);
      osc.frequency.linearRampToValueAtTime(160, time + 1.2);

      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.linearRampToValueAtTime(0.12, time + 0.1);
      gain.gain.linearRampToValueAtTime(0.08, time + 0.6);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 1.2);

      osc.start(time);
      osc.stop(time + 1.2);
    } catch (e) {
      console.warn('Audio playBossSpawn failed:', e);
    }
  }

  // Chest open jingle
  playChestOpen() {
    try {
      this.resume();
      if (!this.ctx || this.muted) return;

      const time = this.ctx.currentTime;
      // Celebratory major scale sweep
      const notes = [523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77, 1046.50, 1318.51, 1567.98]; // C5 to G6
      
      notes.forEach((freq, index) => {
        try {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, time + index * 0.06);

          gain.gain.setValueAtTime(0.0001, time + index * 0.06);
          gain.gain.linearRampToValueAtTime(0.06, time + index * 0.06 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, time + index * 0.06 + 0.3);

          osc.start(time + index * 0.06);
          osc.stop(time + index * 0.06 + 0.35);
        } catch (err) {}
      });
    } catch (e) {
      console.warn('Audio playChestOpen failed:', e);
    }
  }

  // Synthesize game over tune
  playGameOver() {
    try {
      this.resume();
      if (!this.ctx || this.muted) return;

      const time = this.ctx.currentTime;
      const notes = [293.66, 277.18, 261.63, 220.00]; // D4, C#4, C4, A3 (Sad descending minor)
      
      notes.forEach((freq, index) => {
        try {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, time + index * 0.25);

          gain.gain.setValueAtTime(0.0001, time + index * 0.25);
          gain.gain.linearRampToValueAtTime(0.08, time + index * 0.25 + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.0001, time + index * 0.25 + 0.6);

          osc.start(time + index * 0.25);
          osc.stop(time + index * 0.25 + 0.75);
        } catch (err) {}
      });
    } catch (e) {
      console.warn('Audio playGameOver failed:', e);
    }
  }
}

export const audio = new AudioManager();
