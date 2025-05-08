declare module 'file-saver' {
  export function saveAs(data: Blob | File, filename?: string, options?: FileSaverOptions): void;
  
  interface FileSaverOptions {
    type?: string;
  }
} 