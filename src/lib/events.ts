import { EventEmitter } from 'events';

// Garantir que a instância do EventEmitter sobreviva ao Hot Reload do Next.js no ambiente de dev
const globalForEvents = global as unknown as { eventBus: EventEmitter };

export const eventBus = globalForEvents.eventBus || new EventEmitter();

if (process.env.NODE_ENV !== 'production') {
  globalForEvents.eventBus = eventBus;
}
