import { Module } from '@nestjs/common';
import { InMemoryStore } from './in-memory/in-memory.store';

@Module({
  providers: [InMemoryStore],
  exports: [InMemoryStore],
})
export class PersistenceModule {}
