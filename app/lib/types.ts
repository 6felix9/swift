export type Message = {
  role: "advisor" | "client";
  content: string;
  latency?: number;
};
