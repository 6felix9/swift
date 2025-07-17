export type Message = {
  role: string;
  content: string;
  latency?: number;
};

export type TrainingDomain = 'financial-advisor' | 'healthcare' | 'customer-service';