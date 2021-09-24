export interface Config {
  [dir: string]: { files: { [file: string]: string; };; dirs: string[]; };
}
