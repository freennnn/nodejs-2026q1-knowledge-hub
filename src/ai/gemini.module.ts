import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GeminiService } from '@/ai/providers/gemini.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10_000,
      maxRedirects: 3,
    }),
  ],
  providers: [GeminiService],
  exports: [GeminiService],
})
export class GeminiModule {}
