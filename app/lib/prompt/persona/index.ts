import { liangChenPrompt } from './liang-chen';
import { eleanorVancePrompt } from './eleanor-vance';
import { trainingAlexMillerPrompt } from './alex-miller';

export const PERSONA_PROMPTS: Record<string, string> = {
  LIANG_CHEN: liangChenPrompt,
  ELEANOR_VANCE: eleanorVancePrompt,
  ALEX_MILLER: trainingAlexMillerPrompt,
};