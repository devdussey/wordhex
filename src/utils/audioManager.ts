class AudioManager {
  private audioEnabled: boolean = true;
  private audioContext: AudioContext | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'AudioContext' in window) {
      this.audioContext = new AudioContext();
    }
  }

  setEnabled(enabled: boolean) {
    this.audioEnabled = enabled;
  }

  isEnabled(): boolean {
    return this.audioEnabled;
  }

  playLetterClick(index: number) {
    if (!this.audioEnabled || !this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    const baseFrequency = 440;
    const frequency = baseFrequency + (index * 50);

    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.15);
  }

  playWordSubmit(isValid: boolean) {
    if (!this.audioEnabled || !this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    if (isValid) {
      oscillator.frequency.setValueAtTime(523.25, this.audioContext.currentTime);
      oscillator.frequency.setValueAtTime(659.25, this.audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(783.99, this.audioContext.currentTime + 0.2);
    } else {
      oscillator.frequency.setValueAtTime(220, this.audioContext.currentTime);
      oscillator.frequency.setValueAtTime(196, this.audioContext.currentTime + 0.1);
    }

    oscillator.type = 'triangle';
    gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.3);
  }
}

export const audioManager = new AudioManager();
