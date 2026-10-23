// The little of Node's `process` the stdio transport uses: the package has no
// other use for Node's types, and none of its own dependencies.
declare const process: {
  stdin: {
    setEncoding(encoding: 'utf8'): void;
    on(event: 'data', listener: (chunk: string) => void): void;
    on(event: 'end', listener: () => void): void;
  };
  stdout: { write(text: string): boolean };
};
