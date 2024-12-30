import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

// Enregistre le loader TS en ESM
register('ts-node/esm', pathToFileURL('./'));
