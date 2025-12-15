export class IdGenerator {
  private static counter = 0;

  static generate(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    const counter = ++this.counter;
    return `${timestamp}-${random}-${counter}`;
  }

  static reset(): void {
    this.counter = 0;
  }
}
