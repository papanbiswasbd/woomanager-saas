import { EventEmitter } from 'events';

class RealtimeEventEmitter extends EventEmitter {}

const globalForEmitter = globalThis as unknown as { realtimeEmitter: RealtimeEventEmitter };

export const realtimeEmitter = globalForEmitter.realtimeEmitter || new RealtimeEventEmitter();

if (process.env.NODE_ENV !== 'production') globalForEmitter.realtimeEmitter = realtimeEmitter;
