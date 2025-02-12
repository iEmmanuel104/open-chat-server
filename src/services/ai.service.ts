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
        const prompt = `You are a chat message analyzer and assistant. Analyze the following message and:
        1. If it's a question, provide a brief, helpful response
        2. Extract key topics and sentiment
        3. Return ONLY a JSON object (no markdown, no code blocks) with these exact keys:
        {
            "Quality": number between 0-100,
            "Sentiment": string ("positive", "neutral", or "negative" only),
            "Topics": array of strings (keywords),
            "Response": string (answer if message is a question, empty string if not),
            "SpamLikelihood": number between 0-100
        }

        Message to analyze: "${message}"`;

        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            const cleanedText = this.cleanJsonResponse(text);

            try {
                const analysis = JSON.parse(cleanedText);

                if (!this.isValidAnalysis(analysis)) {
                    throw new Error('Invalid analysis format');
                }

                return {
                    contentQuality: analysis.Quality,
                    sentiment: analysis.Sentiment.toLowerCase(),
                    topics: Array.isArray(analysis.Topics) ? analysis.Topics : [analysis.Topics],
                    response: analysis.Response || '',
                    spamScore: analysis.SpamLikelihood
                };
            } catch (parseError) {
                console.error('JSON parsing failed:', parseError);
                throw parseError;
            }
        } catch (error) {
            console.error('Analysis generation failed:', error);
            throw error;
        }
    }

    private cleanJsonResponse(text: string): string {
        // Remove markdown code blocks if present
        let cleaned = text.replace(/```json\n?|\n?```/g, '');

        // Remove any leading/trailing whitespace
        cleaned = cleaned.trim();

        // If the text starts with a newline or any other character before {, clean it
        const firstBrace = cleaned.indexOf('{');
        if (firstBrace > 0) {
            cleaned = cleaned.slice(firstBrace);
        }

        // If the text contains anything after the last }, remove it
        const lastBrace = cleaned.lastIndexOf('}');
        if (lastBrace !== -1 && lastBrace < cleaned.length - 1) {
            cleaned = cleaned.slice(0, lastBrace + 1);
        }

        return cleaned;
    }

    private isValidAnalysis(analysis: any): boolean {
        return (
            typeof analysis === 'object' &&
            typeof analysis.Quality === 'number' &&
            analysis.Quality >= 0 &&
            analysis.Quality <= 100 &&
            typeof analysis.Sentiment === 'string' &&
            ['positive', 'neutral', 'negative'].includes(analysis.Sentiment.toLowerCase()) &&
            (Array.isArray(analysis.Topics) || typeof analysis.Topics === 'string') &&
            typeof analysis.Response === 'string' &&
            typeof analysis.SpamLikelihood === 'number' &&
            analysis.SpamLikelihood >= 0 &&
            analysis.SpamLikelihood <= 100
        );
    }

    private getFallbackAnalysis() {
        return {
            contentQuality: 50,
            sentiment: 'neutral',
            topics: [],
            response: '',
            spamScore: 0
        };
    }
}