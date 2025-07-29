declare module 'gtts' {
  class Gtts {
    constructor(text: string, lang?: string);
    save(filepath: string, callback: (err: Error | null) => void): void;
  }

  export = Gtts;
}
