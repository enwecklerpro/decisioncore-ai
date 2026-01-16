/**
 * DecisionCore AI - Azure OpenAI Provider
 * Azure-hosted GPT models for enterprise deployments
 */

'use strict';

const AIProvider = require('./ai-provider');

class AzureOpenAIProvider extends AIProvider {
    constructor(config = {}) {
        super(config);
        this.name = 'Azure OpenAI';
        this.type = 'AZURE_OPENAI';
        this.apiKey = config.apiKey || process.env.AZURE_OPENAI_KEY;
        this.endpoint = config.endpoint || process.env.AZURE_OPENAI_ENDPOINT;
        this.deploymentName = config.deploymentName || config.model || process.env.AZURE_OPENAI_DEPLOYMENT;
        this.apiVersion = config.apiVersion || '2024-02-15-preview';
        this.maxTokens = config.maxTokens || 500;
    }

    validateConfig() {
        const errors = [];
        if (!this.apiKey) errors.push('AZURE_OPENAI_KEY is required');
        if (!this.endpoint) errors.push('AZURE_OPENAI_ENDPOINT is required');
        if (!this.deploymentName) errors.push('AZURE_OPENAI_DEPLOYMENT is required');
        return { valid: errors.length === 0, errors };
    }

    async score(payload, context = {}) {
        const startTime = Date.now();

        const validation = this.validateConfig();
        if (!validation.valid) {
            console.warn('[AzureOpenAI] Config invalid:', validation.errors);
            return this.getDefaultResponse();
        }

        try {
            const prompt = this.buildPrompt(context.promptTemplate, payload, context);
            const url = `${this.endpoint}/openai/deployments/${this.deploymentName}/chat/completions?api-version=${this.apiVersion}`;

            const response = await this._callAPI(url, {
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
                model: this.deploymentName,
                processingTimeMs: Date.now() - startTime,
                tokensUsed: response.usage?.total_tokens || 0
            };

        } catch (error) {
            console.error('[AzureOpenAI] Error:', error.message);
            return {
                ...this.getDefaultResponse(),
                error: error.message,
                processingTimeMs: Date.now() - startTime
            };
        }
    }

    async _callAPI(url, requestBody) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'api-key': this.apiKey
                },
                body: JSON.stringify(requestBody),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Azure OpenAI error ${response.status}: ${error}`);
            }

            return await response.json();

        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error(`Azure OpenAI timeout after ${this.timeout}ms`);
            }
            throw error;
        }
    }

    async healthCheck() {
        const validation = this.validateConfig();
        return validation.valid
            ? { status: 'configured', provider: this.name, type: this.type, deployment: this.deploymentName }
            : { status: 'not_configured', provider: this.name, type: this.type, errors: validation.errors };
    }
}

module.exports = AzureOpenAIProvider;
