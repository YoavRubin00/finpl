/**
 * The "living diagram" (Yoav 13.11.2026): nodes joined by curved paths that
 * draw themselves, a coin that rides each path, a ring that fills around the
 * node it lands on, a badge that pops when the node is done. The motion
 * language comes from Ensemble's product-flow island; the look is FinPlay's.
 *
 * Everything is plain data, so one renderer draws every concept: a chain, a
 * fan-out, a merge, or a two-node loop (compound interest, a debt snowball).
 */

export type FlowTone = "cyan" | "gold" | "green" | "red" | "violet";

export type FlowIconName =
  | "wallet"
  | "bank"
  | "banknote"
  | "coins"
  | "piggy"
  | "receipt"
  | "shield"
  | "briefcase"
  | "house"
  | "bag"
  | "cart"
  | "zap"
  | "pizza"
  | "trendUp"
  | "trendDown"
  | "percent"
  | "card"
  | "store"
  | "user"
  | "building"
  | "health"
  | "gift"
  | "wrench"
  | "scissors"
  | "tag"
  | "sprout"
  | "coffee"
  | "shirt"
  | "laptop"
  | "shoe"
  | "umbrella"
  | "chart"
  | "users"
  | "clock"
  | "calendar"
  | "handCoins"
  | "plane"
  | "wheat"
  | "package"
  | "hourglass"
  | "anchor"
  | "handshake"
  | "graduation"
  | "repeat"
  | "globe"
  | "snowflake";

export interface FlowAmount {
  /**
   * One value per state. A node that only sends shows `values[0]` from the
   * start; a node that receives shows nothing until its first coin lands,
   * then `values[0]`, then `values[1]` after the second landing, and so on.
   * With `fromStart`, `values[0]` shows at once and each landing moves on.
   */
  values: number[];
  prefix?: string;
  suffix?: string;
  fromStart?: boolean;
}

export interface FlowNodeSpec {
  id: string;
  /** One or two words. */
  label: string;
  icon: FlowIconName;
  tone?: FlowTone;
  /** Logical grid position. Column 0 is where reading starts (the right, in Hebrew). Fractions are allowed. */
  col: number;
  row: number;
  amount?: FlowAmount;
  /** How far the ring around the node fills, 0..1 (default 1). A share of the whole reads well here. */
  ring?: number;
  /** Pops on the node once its ring is full. */
  badge?: "check" | "alert";
  /** Put the label above the node (for a top-row node whose paths leave downwards). */
  labelAbove?: boolean;
}

export interface FlowStageSpec {
  /** Paths that run side by side in this stage: [from, to]. */
  legs: Array<[string, string]>;
  /** ms between the starts of this stage's legs (default 140). */
  staggerMs?: number;
  /** ms a coin rides one path in this stage (default 720). Shorter for a loop that repeats. */
  hopMs?: number;
  /** Extra ms after the landings, before the next stage. */
  holdMs?: number;
  /** "h": leaves sideways (default). "v": leaves downwards/upwards. */
  route?: "h" | "v";
  tone?: FlowTone;
  /** What rides the path (default "coin"). */
  token?: "coin" | "dot";
}

export interface FlowVisualSpec {
  kind: "flow";
  nodes: FlowNodeSpec[];
  stages: FlowStageSpec[];
  caption?: string;
  /** What a screen reader hears instead of the moving parts. One sentence. */
  a11y: string;
  /** Shows a small "לדוגמה" tag: the figures are an illustration, not a fact. */
  example?: boolean;
  /** Captain Shark reacts next to the caption when the diagram lands. */
  shark?: "happy" | "empathic";
  /** Reading direction of the columns (default "rtl": money flows right to left). */
  direction?: "rtl" | "ltr";
}

/** Purchasing power: the same banknote, a price tag that grows, a basket that empties. */
export interface ErosionVisualSpec {
  kind: "erosion";
  /** Text on the banknote, e.g. "₪100". */
  noteLabel: string;
  /** How many goods the note buys at the start (max 10). */
  items: number;
  /** How many of them drop out of the basket. */
  lost: number;
  priceLabel: string;
  basketLabel: string;
  caption?: string;
  a11y: string;
  example?: boolean;
}

/** Hard caps: a diagram never animates more than this, whatever the data says. */
export const FLOW_MAX_NODES = 7;
export const FLOW_MAX_LEGS = 8;
