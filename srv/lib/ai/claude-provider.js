/**
 * DecisionCore AI - Claude Provider
 * Anthropic Claude integration for advanced reasoning
 */

'use strict';

const AIProvider = require('./ai-provider');

class ClaudeProvider extends AIProvider {
    constructor(config = {}) {
        super(config);
        this.name = 'Anthropic Claude';
        this.type = 'CLAUDE';
        this.apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
        this.model = config.model || 'claude-3-haiku-20240307';
        this.endpoint = config.endpoint || 'https://api.anthropic.com/v1/messages';
        this.maxTokens = config.maxTokens || 500;
        this.apiVersion = config.apiVersion || '2023-06-01';
    }

    validateConfig() {
        const errors = [];
        if (!this.apiKey) errors.push('ANTHROPIC_API_KEY or CLAUDE_API_KEY is required');
        return { valid: errors.length === 0, errors };
    }

    async score(payload, context = {}) {
        const startTime = Date.now();

        const validation = this.validateConfig();
        if (!validation.valid) {
            console.warn('[Claude] Config invalid:', validation.errors);
            return this.getDefaultResponse();
        }

        try {
            const prompt = this.buildPrompt(context.promptTemplate, payload, context);

            const response = await this._callAPI({
                model: this.model,
                max_tokens: this.maxTokens,
                messages: [
                    { role: 'user', content: prompt }
                ],
                system: 'You are an enterprise decision scoring engine. Always respond with valid JSON only, no additional text.'
            });

            const content = response.content?.[0]?.text || '';
            const parsed = this.parseResponse(content);

            return {
                ...parsed,
                provider: this.type,
                model: this.model,
                processingTimeMs: Date.now() - startTime,
                tokensUsed: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0)
            };

        } catch (error) {
            console.error('[Claude] Error:', error.message);
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
                    'x-api-key': this.apiKey,
                    'anthropic-version': this.apiVersion
                },
                body: JSON.stringify(requestBody),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Claude API error ${response.status}: ${error}`);
            }

            return await response.json();

        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error(`Claude timeout after ${this.timeout}ms`);
            }
            throw error;
        }
    }

    async healthCheck() {
        const validation = this.validateConfig();
        return validation.valid
            ? { status: 'configured', provider: this.name, type: this.type, model: this.model }
            : { status: 'not_configured', provider: this.name, type: this.type, errors: validation.errors };
    }
}

module.exports = ClaudeProvider;
