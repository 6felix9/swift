import { liangChenPrompt } from './liang-chen';
import { eleanorVancePrompt } from './eleanor-vance';
import { trainingAlexMillerPrompt } from './alex-miller';
import { chloeZhangPrompt } from './chloe-zhang';
import { sarahLeePrompt } from './sarah-lee';
import { mariaGomezPrompt } from './maria-gomez'; 
import { angelaBrownPrompt } from './angela-brown';

export const PERSONA_PROMPTS: Record<string, string> = {
  LIANG_CHEN: liangChenPrompt,
  ELEANOR_VANCE: eleanorVancePrompt,
  ALEX_MILLER: trainingAlexMillerPrompt,
  CHLOE_ZHANG: chloeZhangPrompt,
  SARAH_LEE: sarahLeePrompt,
  MARIA_GOMEZ: mariaGomezPrompt,
  ANGELA_BROWN: angelaBrownPrompt
};