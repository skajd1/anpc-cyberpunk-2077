import { writeFileSync } from 'node:fs';
import { buildGameStoryData, renderGameStoryCollector } from './game-story-data.mjs';
writeFileSync(new URL('../game/redscript/ANPC/Story.reds',import.meta.url),renderGameStoryCollector(buildGameStoryData()),'utf8');
