export type Message = {
  role: "advisor" | "client" | "system";
  content: string;
  latency?: number;
};
