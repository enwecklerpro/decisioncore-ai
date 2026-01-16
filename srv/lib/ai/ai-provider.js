/**
 * DecisionCore AI - AI Provider Interface
 * Base class for all AI scoring providers
 */

'use strict';

class AIProvider {
    constructor(config = {}) {
        this.config = config;
        this.name = 'Base Provider';
        this.type = 'BASE';
        this.timeout = config.timeout || 5000;
        this.retries = config.retries || 2;
    }

    /**
     * Score a payload and return decision factors
     * @param {Object} payload - Input data to score
     * @param {Object} context - Additional context (scenario, user, etc.)
     * @returns {Promise<Object>} Score result
     */
    async score(payload, context = {}) {
        throw new Error('score() must be implemented by provider');
    }

    /**
     * Health check for the provider
     * @returns {Promise<Object>} Health status
     */
    async healthCheck() {
        return {
            status: 'unknown',
            provider: this.name,
            type: this.type
        };
    }

    /**
     * Validate provider configuration
     * @returns {Object} Validation result
     */
    validateConfig() {
        return { valid: true, errors: [] };
    }

    /**
     * Get default response for fallback
     */
    getDefaultResponse() {
        return {
            score: 50,
            confidence: 50,
            explanation: 'Default fallback response',
            factors: [],
            provider: this.type,
            fallback: true
        };
    }

    /**
     * Build prompt from template and payload
     */
    buildPrompt(template, payload, context) {
        let prompt = template || this.getDefaultPrompt();

        // Replace placeholders
        prompt = prompt.replace('{{PAYLOAD}}', JSON.stringify(payload, null, 2));
        prompt = prompt.replace('{{SCENARIO}}', context.scenarioName || 'unknown');
        prompt = prompt.replace('{{CONTEXT}}', JSON.stringify(context, null, 2));

        return prompt;
    }

    getDefaultPrompt() {
        return `You are an enterprise decision scoring engine. Analyze the following data and provide a risk/approval score.

INPUT DATA:
{{PAYLOAD}}

Respond ONLY with valid JSON in this exact format:
{
  "score": <number 0-100, higher = more favorable>,
  "confidence": <number 0-100>,
  "factors": [
    {"factor": "<factor name>", "impact": <number -50 to +50>, "reason": "<explanation>"}
  ],
  "recommendation": "<APPROVE|REJECT|REVIEW>",
  "explanation": "<one sentence summary>"
}`;
    }

    /**
     * Parse AI response to extract score
     */
    parseResponse(response) {
        try {
            // Try to parse as JSON
            if (typeof response === 'object') {
                return this._normalizeResponse(response);
            }

            // Try to extract JSON from text
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return this._normalizeResponse(parsed);
            }

            // Fallback: try to extract numbers
            const scoreMatch = response.match(/score[:\s]+(\d+)/i);
            const confMatch = response.match(/confidence[:\s]+(\d+)/i);

            return {
                score: scoreMatch ? parseInt(scoreMatch[1]) : 50,
                confidence: confMatch ? parseInt(confMatch[1]) : 50,
                explanation: response.substring(0, 500),
                factors: [],
                raw: response
            };
        } catch (e) {
            console.error('[AIProvider] Parse error:', e.message);
            return this.getDefaultResponse();
        }
    }

    _normalizeResponse(data) {
        return {
            score: Math.min(100, Math.max(0, parseInt(data.score) || 50)),
            confidence: Math.min(100, Math.max(0, parseInt(data.confidence) || 50)),
            explanation: data.explanation || data.summary || '',
            factors: Array.isArray(data.factors) ? data.factors : [],
            recommendation: data.recommendation || null,
            raw: data
        };
    }
}

module.exports = AIProvider;
