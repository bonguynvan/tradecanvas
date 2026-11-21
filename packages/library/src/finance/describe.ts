/** A count with its noun, as a sentence for screen readers has it: "1 leg", "3 legs", "1 axis", "4 axes". */
export function counted(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}
