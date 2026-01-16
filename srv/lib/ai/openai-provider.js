/**
 * DecisionCore AI - OpenAI Provider
 * GPT-4o / GPT-4o-mini integration for intelligent scoring
 */

'use strict';

const AIProvider = require('./ai-provider');

class OpenAIProvider extends AIProvider {
    constructor(config = {}) {
        super(config);
        this.name = 'OpenAI GPT';
        this.type = 'OPENAI';
        this.apiKey = config.apiKey || process.env.OPENAI_API_KEY;
        this.model = config.model || 'gpt-4o-mini';
        this.endpoint = config.endpoint || 'https://api.openai.com/v1/chat/completions';
        this.maxTokens = config.maxTokens || 500;
    }

    validateConfig() {
        const errors = [];
        if (!this.apiKey) {
            errors.push('OPENAI_API_KEY is required');
        }
        return { valid: errors.length === 0, errors };
    }

    async score(payload, context = {}) {
        const startTime = Date.now();

        // Validate config
        const validation = this.validateConfig();
        if (!validation.valid) {
            console.warn('[OpenAI] Config invalid:', validation.errors);
            return this.getDefaultResponse();
        }

        try {
            const prompt = this.buildPrompt(context.promptTemplate, payload, context);

            const response = await this._callAPI({
                model: this.model,
                messages: [
                    {
                        role: 'system',
                        content: 'You are an enterprise decision scoring engine. Always respond with valid JSON only.'
                    },
                    { role: 'user', content: prompt }
                ],
                max_tokens: this.maxTokens,
                temperature: 0.3
            });

            const content = response.choices?.[0]?.message?.content || '';
            const parsed = this.parseResponse(content);

            return {
                ...parsed,
                provider: this.type,
                model: this.model,
                processingTimeMs: Date.now() - startTime,
                tokensUsed: response.usage?.total_tokens || 0
            };

        } catch (error) {
            console.error('[OpenAI] Error:', error.message);
            return {
                ...this.getDefaultResponse(),
                error: error.message,
                processingTimeMs: Date.now() - startTime
            };
        }
    }

    async _callAPI(requestBody) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify(requestBody),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`OpenAI API error ${response.status}: ${error}`);
            }

            return await response.json();

        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error(`OpenAI timeout after ${this.timeout}ms`);
            }
            throw error;
        }
    }

    async healthCheck() {
        const validation = this.validateConfig();
        if (!validation.valid) {
            return {
                status: 'not_configured',
                provider: this.name,
                type: this.type,
                errors: validation.errors
            };
        }

        try {
            const startTime = Date.now();
            await this._callAPI({
                model: this.model,
                messages: [{ role: 'user', content: 'ping' }],
                max_tokens: 5
            });

            return {
                status: 'healthy',
                provider: this.name,
                type: this.type,
                model: this.model,
                latencyMs: Date.now() - startTime
            };
        } catch (error) {
            return {
                status: 'error',
                provider: this.name,
                type: this.type,
                error: error.message
            };
        }
    }
}

module.exports = OpenAIProvider;
