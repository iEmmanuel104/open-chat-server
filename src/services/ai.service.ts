// src/services/ai.service.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import { RedisService } from './redis.service';

export class AiService {
    private genAI: GoogleGenerativeAI;
    private model: any;
    private cache: RedisService;
    private CACHE_TTL = 3600; // 1 hour

    constructor(
        private redisService: RedisService
    ) {
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
        this.model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
        this.cache = redisService;
    }

    async analyzeMessage(message: string) {
        try {
            const cacheKey = `analysis:${Buffer.from(message).toString('base64')}`;
            const cachedAnalysis = await this.redisService.get(cacheKey);

            if (cachedAnalysis) {
                return JSON.parse(cachedAnalysis);
            }

            const analysis = await this.performAnalysis(message);
            await this.redisService.set(
                cacheKey,
                JSON.stringify(analysis),
                this.CACHE_TTL
            );

            return analysis;
        } catch (error) {
            console.error('AI analysis failed:', error);
            return this.getFallbackAnalysis();
        }
    }

    private async performAnalysis(message: string) {
        const prompt = `Analyze this chat message and provide scores for the following aspects:
            - Quality (0-100): Based on substance, clarity, and value
            - Sentiment (positive/neutral/negative)
            - Topics (comma-separated keywords)
            - Spam likelihood (0-100)
            
            Message: "${message}"
            
            Respond in JSON format only.`;

        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        const analysis = JSON.parse(response.text());

        return {
            contentQuality: analysis.Quality,
            sentiment: analysis.Sentiment.toLowerCase(),
            topics: analysis.Topics.split(',').map((t: string) => t.trim()),
            spamScore: analysis.SpamLikelihood
        };
    }

    private getFallbackAnalysis() {
        return {
            contentQuality: 50,
            sentiment: 'neutral',
            topics: [],
            spamScore: 0
        };
    }
}

