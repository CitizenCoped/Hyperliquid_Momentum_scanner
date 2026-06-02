export class PollGate {
  private active: Promise<void> | null = null;

  async run(task: () => Promise<void>): Promise<boolean> {
    if (this.active) return false;

    const active = Promise.resolve().then(task);
    this.active = active;

    try {
      await active;
    } finally {
      if (this.active === active) {
        this.active = null;
      }
    }

    return true;
  }

  isActive(): boolean {
    return this.active !== null;
  }
}
