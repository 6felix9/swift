import { liangChenPrompt } from './liang-chen';
import { eleanorVancePrompt } from './eleanor-vance';
import { trainingAlexMillerPrompt } from './alex-miller';
import { chloeZhangPrompt } from './chloe-zhang';
import { sarahLeePrompt } from './sarah-lee';

export const PERSONA_PROMPTS: Record<string, string> = {
  LIANG_CHEN: liangChenPrompt,
  ELEANOR_VANCE: eleanorVancePrompt,
  ALEX_MILLER: trainingAlexMillerPrompt,
  CHLOE_ZHANG: chloeZhangPrompt,
  SARAH_LEE: sarahLeePrompt,
};