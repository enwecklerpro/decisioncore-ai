/**
 * DecisionCore AI - AI Provider Factory
 * Manages provider instantiation, fallback, and caching
 * 
 * @author Taha Khattari
 * @copyright 2026 Taha Khattari
 * @version 2.0.0
 */

'use strict';

const AIProvider = require('./ai-provider');
const MockProvider = require('./mock-provider');
const OpenAIProvider = require('./openai-provider');
const AzureOpenAIProvider = require('./azure-openai-provider');
const ClaudeProvider = require('./claude-provider');
const SAPAICoreProvider = require('./sap-ai-core-provider');

const LOG = '[AIFactory]';

// Provider registry
const PROVIDERS = {
    'MOCK': MockProvider,
    'OPENAI': OpenAIProvider,
    'AZURE_OPENAI': AzureOpenAIProvider,
    'CLAUDE': ClaudeProvider,
    'SAP_AI_CORE': SAPAICoreProvider
};

// Cache for provider instances
const providerCache = new Map();

// Response cache for repeated requests
const responseCache = new Map();

/**
 * Get an AI provider instance by type
 * @param {string} type - Provider type (MOCK, OPENAI, AZURE_OPENAI, CLAUDE, SAP_AI_CORE)
 * @param {Object} config - Provider configuration
 * @returns {AIProvider} Provider instance
 */
function getProvider(type, config = {}) {
    const providerType = (type || 'MOCK').toUpperCase();
    const ProviderClass = PROVIDERS[providerType];

    if (!ProviderClass) {
        console.warn(`${LOG} Unknown provider type "${type}", falling back to MOCK`);
        return new MockProvider(config);
    }

    return new ProviderClass(config);
}

/**
 * Create a provider from database configuration
 * @param {Object} dbConfig - AIProvider entity from database
 * @returns {AIProvider} Configured provider instance
 */
function createFromDBConfig(dbConfig) {
    if (!dbConfig) {
        return new MockProvider({});
    }

    const config = {
        apiKey: dbConfig.apiKey,
        endpoint: dbConfig.endpoint,
        model: dbConfig.model || dbConfig.deploymentName,
        deploymentName: dbConfig.deploymentName,
        destinationName: dbConfig.destinationName,
        timeout: dbConfig.timeoutMs || 5000,
        retries: dbConfig.retryCount || 2,
        promptTemplate: dbConfig.promptTemplate,
        maxTokens: dbConfig.maxTokens || 500
    };

    return getProvider(dbConfig.providerType, config);
}

/**
 * Score with automatic fallback
 * @param {string} providerType - Primary provider type
 * @param {Object} config - Provider configuration
 * @param {Object} payload - Data to score
 * @param {Object} context - Additional context
 * @returns {Promise<Object>} Score result
 */
async function score(providerType, config, payload, context = {}) {
    const type = (providerType || 'MOCK').toUpperCase();

    // Check cache
    const cacheKey = _getCacheKey(type, payload, context.scenarioName);
    const cacheTTL = config.cacheTTLSeconds || 0;

    if (cacheTTL > 0) {
        const cached = responseCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < cacheTTL * 1000) {
            console.log(`${LOG} Cache hit for ${context.scenarioName}`);
            return { ...cached.result, cached: true };
        }
    }

    // Try primary provider
    const provider = getProvider(type, config);

    try {
        console.log(`${LOG} Scoring with ${provider.name}`);
        const result = await provider.score(payload, context);

        // Cache successful result
        if (cacheTTL > 0 && !result.error) {
            responseCache.set(cacheKey, { result, timestamp: Date.now() });
        }

        return result;

    } catch (error) {
        console.error(`${LOG} ${provider.name} failed:`, error.message);

        // Fallback to mock
        if (type !== 'MOCK') {
            console.log(`${LOG} Falling back to MOCK provider`);
            const mockProvider = new MockProvider(config);
            const fallbackResult = await mockProvider.score(payload, context);

            return {
                ...fallbackResult,
                fallback: true,
                originalProvider: type,
                fallbackReason: error.message
            };
        }

        throw error;
    }
}

/**
 * Health check all providers
 * @param {Object} configs - Provider configurations keyed by type
 * @returns {Promise<Object>} Health status for each provider
 */
async function healthCheckAll(configs = {}) {
    const results = {};

    for (const [type, ProviderClass] of Object.entries(PROVIDERS)) {
        const config = configs[type] || {};
        const provider = new ProviderClass(config);

        try {
            results[type] = await provider.healthCheck();
        } catch (error) {
            results[type] = { status: 'error', error: error.message };
        }
    }

    return results;
}

/**
 * Clear response cache
 */
function clearCache() {
    responseCache.clear();
    console.log(`${LOG} Response cache cleared`);
}

/**
 * Register a custom provider
 * @param {string} type - Provider type identifier
 * @param {class} ProviderClass - Provider class extending AIProvider
 */
function registerProvider(type, ProviderClass) {
    if (!(ProviderClass.prototype instanceof AIProvider)) {
        throw new Error('Provider must extend AIProvider');
    }
    PROVIDERS[type.toUpperCase()] = ProviderClass;
    console.log(`${LOG} Registered custom provider: ${type}`);
}

/**
 * List available provider types
 * @returns {Array<string>} Available provider types
 */
function listProviders() {
    return Object.keys(PROVIDERS);
}

function _getCacheKey(provider, payload, scenario) {
    const data = JSON.stringify({ provider, payload, scenario });
    // Simple hash
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return `cache_${Math.abs(hash).toString(36)}`;
}

// Export everything
module.exports = {
    // Main functions
    getProvider,
    createFromDBConfig,
    score,
    healthCheckAll,
    clearCache,
    registerProvider,
    listProviders,

    // Provider classes for extension
    AIProvider,
    MockProvider,
    OpenAIProvider,
    AzureOpenAIProvider,
    ClaudeProvider,
    SAPAICoreProvider,

    // Constants
    PROVIDERS
};
