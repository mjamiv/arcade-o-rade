export type RaceMode = 'time-trial' | 'practice';
export class RaceState {
  mode: RaceMode;
  lap = 1;
  laps = 3;
  elapsed = 0;
  lapTime = 0;
  nextCheckpoint = 1;
  times: number[] = [];
  valid = true;
  finished = false;
  checkpointCount = 16;
  previousProgress = 0;
  distance = 0;
  constructor(mode: RaceMode) {
    this.mode = mode;
  }
  resetLap(progress: number) {
    this.valid = false;
    this.previousProgress = progress;
  }
  update(dt: number, progress: number, onTrack: boolean) {
    if (this.finished) return false;
    this.elapsed += dt;
    this.lapTime += dt;
    let delta = progress - this.previousProgress;
    if (delta < -0.5) delta += 1;
    if (delta > 0.5) delta -= 1;
    // No checkpoint credit for teleporting or driving backwards.
    if (Math.abs(delta) > 0.07) this.valid = false;
    if (delta > 0 && delta < 0.07 && onTrack) {
      const target = this.nextCheckpoint / this.checkpointCount;
      const previous = this.previousProgress;
      const crossed =
        this.nextCheckpoint < this.checkpointCount
          ? previous < target && progress >= target
          : previous > 0.9 && progress < 0.1;
      if (crossed) this.nextCheckpoint++;
      this.distance += delta;
    }
    this.previousProgress = progress;
    if (this.nextCheckpoint > this.checkpointCount) {
      // Always require every gate and almost a full forward circuit.
      if (this.distance < 0.9) this.valid = false;
      this.times.push(this.valid ? this.lapTime : Infinity);
      this.lap++;
      this.lapTime = 0;
      this.nextCheckpoint = 1;
      this.distance = 0;
      this.valid = true;
      if (this.mode === 'time-trial' && this.lap > this.laps)
        this.finished = true;
      return true;
    }
    return false;
  }
}
