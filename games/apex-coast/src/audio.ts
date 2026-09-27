export class EngineAudio {
  context: AudioContext | null = null;
  private gain: GainNode | null = null;
  private engine: OscillatorNode | null = null;
  private harmonic: OscillatorNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private tireGain: GainNode | null = null;
  volume = 0.45;
  muted = false;
  start() {
    try {
      if (!this.context) {
        const ctx = (this.context = new AudioContext());
        this.gain = ctx.createGain();
        this.gain.gain.value = 0;
        this.gain.connect(ctx.destination);
        this.filter = ctx.createBiquadFilter();
        this.filter.type = 'lowpass';
        this.filter.frequency.value = 450;
        this.filter.Q.value = 0.7;
        this.filter.connect(this.gain);
        this.engine = ctx.createOscillator();
        this.engine.type = 'sawtooth';
        this.engine.frequency.value = 40;
        this.engine.connect(this.filter);
        this.engine.start();
        this.harmonic = ctx.createOscillator();
        this.harmonic.type = 'triangle';
        this.harmonic.frequency.value = 80;
        const hGain = ctx.createGain();
        hGain.gain.value = 0.4;
        this.harmonic.connect(hGain);
        hGain.connect(this.filter);
        this.harmonic.start();
        const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++)
          data[i] = (Math.random() * 2 - 1) * 0.3;
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;
        const tireFilter = ctx.createBiquadFilter();
        tireFilter.type = 'bandpass';
        tireFilter.frequency.value = 1400;
        tireFilter.Q.value = 0.7;
        this.tireGain = ctx.createGain();
        this.tireGain.gain.value = 0;
        noise.connect(tireFilter);
        tireFilter.connect(this.tireGain);
        this.tireGain.connect(ctx.destination);
        noise.start();
      }
      void this.context.resume().catch(() => {});
    } catch {
      /* Driving remains available when browser audio is unavailable. */
    }
  }
  update(rpm: number, throttle: number, slip: number, active: boolean) {
    if (
      !this.context ||
      !this.gain ||
      !this.engine ||
      !this.harmonic ||
      !this.filter ||
      !this.tireGain
    )
      return;
    const t = this.context.currentTime,
      level = active && !this.muted ? this.volume : 0;
    this.engine.frequency.setTargetAtTime(25 + rpm / 32, t, 0.08);
    this.harmonic.frequency.setTargetAtTime(50 + rpm / 16, t, 0.08);
    this.filter.frequency.setTargetAtTime(
      180 + rpm * 0.09 + throttle * 340,
      t,
      0.1,
    );
    this.gain.gain.setTargetAtTime(level * (0.028 + throttle * 0.045), t, 0.08);
    this.tireGain.gain.setTargetAtTime(
      level * Math.min(0.17, Math.max(0, slip - 2) * 0.018),
      t,
      0.1,
    );
  }
}
