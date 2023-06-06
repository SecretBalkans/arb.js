// types.d.ts
declare global {
  type Nullable<T extends Record<string | number, unknown> | number | any> = {
    [P in keyof T]: T[P] | null;
  }
}
export {}
