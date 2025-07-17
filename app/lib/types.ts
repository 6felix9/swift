export type Message = {
  role: "advisor" | "client" | "system";
  content: string;
  latency?: number;
};

export type TrainingDomain = 'financial-advisor' | 'healthcare' | 'customer-service';