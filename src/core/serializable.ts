/**
 * JSON-compatible value. Navigation params must satisfy this constraint so the
 * whole navigation state stays serializable (History API state, deep links,
 * persistence on native containers).
 */
export type Serializable =
  | string
  | number
  | boolean
  | null
  | undefined
  | Serializable[]
  | { [key: string]: Serializable };
