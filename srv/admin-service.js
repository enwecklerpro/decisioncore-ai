/**
 * DecisionCore AI - Admin Service Handler
 */

'use strict';

const cds = require('@sap/cds');
const aiScoring = require('./lib/ai-scoring');

const LOG = '[DecisionAdmin]';

module.exports = class AdminServiceHandler extends cds.ApplicationService {

    async init() {
        await super.init();

        const {
            DecisionScenarios, DecisionRules, AIProviders, AuditLogs
        } = cds.entities('decisioncore');

        // --------------------------------------------------------
        // EXPORT SCENARIO
        // --------------------------------------------------------

        this.on('exportScenario', async (req) => {
            const { scenarioId } = req.data;

            const scenario = await SELECT.one.from(DecisionScenarios).where({ ID: scenarioId });
            if (!scenario) return req.error(404, 'Scenario not found');

            const rules = await SELECT.from(DecisionRules).where({ scenario_ID: scenarioId });

            const exportData = {
                exportVersion: '2.0',
                exportedAt: new Date().toISOString(),
                exportedBy: req.user?.id || 'anonymous',
                scenario: {
                    ...scenario,
                    ID: undefined,
                    createdAt: undefined,
                    createdBy: undefined,
                    modifiedAt: undefined,
                    modifiedBy: undefined
                },
                rules: rules.map(r => ({
                    ...r,
                    ID: undefined,
                    scenario_ID: undefined,
                    createdAt: undefined,
                    createdBy: undefined,
                    modifiedAt: undefined,
                    modifiedBy: undefined
                }))
            };

            console.log(`${LOG} Exported scenario: ${scenario.name}`);
            return JSON.stringify(exportData, null, 2);
        });

        // --------------------------------------------------------
        // IMPORT SCENARIO
        // --------------------------------------------------------

        this.on('importScenario', async (req) => {
            const { configJson, overwrite } = req.data;

            let config;
            try {
                config = JSON.parse(configJson);
            } catch (e) {
                return { success: false, scenarioId: null, message: 'Invalid JSON' };
            }

            if (!config.scenario || !config.scenario.name) {
                return { success: false, scenarioId: null, message: 'Invalid export format' };
            }

            // Check if exists
            const existing = await SELECT.one.from(DecisionScenarios)
                .where({ name: config.scenario.name });

            if (existing && !overwrite) {
                return {
                    success: false,
                    scenarioId: existing.ID,
                    message: 'Scenario already exists. Set overwrite=true to replace.'
                };
            }

            const scenarioId = existing?.ID || cds.utils.uuid();

            // Delete existing if overwriting
            if (existing && overwrite) {
                await DELETE.from(DecisionRules).where({ scenario_ID: existing.ID });
                await DELETE.from(DecisionScenarios).where({ ID: existing.ID });
            }

            // Insert scenario
            await INSERT.into(DecisionScenarios).entries({
                ID: scenarioId,
                ...config.scenario,
                status: 'DRAFT',
                version: existing ? (existing.version + 1) : 1
            });

            // Insert rules
            for (const rule of config.rules || []) {
                await INSERT.into(DecisionRules).entries({
                    ID: cds.utils.uuid(),
                    scenario_ID: scenarioId,
                    ...rule,
                    status: 'DRAFT'
                });
            }

            console.log(`${LOG} Imported scenario: ${config.scenario.name}`);
            return {
                success: true,
                scenarioId,
                message: `Imported ${config.scenario.name} with ${(config.rules || []).length} rules`
            };
        });

        // --------------------------------------------------------
        // PURGE AUDIT LOGS
        // --------------------------------------------------------

        this.on('purgeAuditLogs', async (req) => {
            const { olderThanDays } = req.data;

            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

            const result = await DELETE.from(AuditLogs)
                .where({ timestamp: { '<': cutoffDate } });

            console.log(`${LOG} Purged audit logs older than ${olderThanDays} days`);
            return { deletedCount: result || 0 };
        });

        // --------------------------------------------------------
        // REFRESH STATISTICS
        // --------------------------------------------------------

        this.on('refreshStatistics', async (req) => {
            const { scenarioName } = req.data;
            // TODO: Implement statistics aggregation
            console.log(`${LOG} Statistics refresh requested for: ${scenarioName}`);
            return { success: true, message: 'Statistics refresh scheduled' };
        });

        // --------------------------------------------------------
        // VALIDATE SCENARIO
        // --------------------------------------------------------

        this.on('validateScenario', async (req) => {
            const { scenarioId } = req.data;
            const errors = [];
            const warnings = [];

            const scenario = await SELECT.one.from(DecisionScenarios).where({ ID: scenarioId });
            if (!scenario) {
                return { valid: false, errors: ['Scenario not found'], warnings: [] };
            }

            // Validate weights
            if ((scenario.rulesWeight || 0) + (scenario.aiWeight || 0) !== 100) {
                errors.push('Rules weight + AI weight must equal 100%');
            }

            // Validate thresholds
            if (scenario.reviewThreshold >= scenario.approvalThreshold) {
                warnings.push('Review threshold should be less than approval threshold');
            }

            // Load and validate rules
            const rules = await SELECT.from(DecisionRules).where({ scenario_ID: scenarioId });

            if (rules.length === 0) {
                warnings.push('Scenario has no rules defined');
            }

            const activeRules = rules.filter(r => r.status === 'ACTIVE');
            if (activeRules.length === 0) {
                errors.push('Scenario has no active rules');
            }

            // Check for duplicate priorities
            const priorities = activeRules.map(r => r.priority);
            const duplicates = priorities.filter((p, i) => priorities.indexOf(p) !== i);
            if (duplicates.length > 0) {
                warnings.push(`Duplicate rule priorities found: ${[...new Set(duplicates)].join(', ')}`);
            }

            // Validate each rule
            for (const rule of rules) {
                if (!rule.action) {
                    errors.push(`Rule "${rule.ruleCode}": Missing action`);
                }
                if (!rule.conditionExpression && !rule.fieldName) {
                    warnings.push(`Rule "${rule.ruleCode}": No condition defined`);
                }
                if (rule.action === 'SET_DECISION' && !rule.decisionOverride) {
                    errors.push(`Rule "${rule.ruleCode}": SET_DECISION requires decisionOverride`);
                }
            }

            return {
                valid: errors.length === 0,
                errors,
                warnings
            };
        });

        // --------------------------------------------------------
        // AI PROVIDER ACTIONS
        // --------------------------------------------------------

        this.on('testConnection', 'AIProviders', async (req) => {
            const providerId = req.params[0];
            const provider = await SELECT.one.from(AIProviders).where({ ID: providerId });

            if (!provider) {
                return { success: false, latencyMs: 0, message: 'Provider not found' };
            }

            const startTime = Date.now();
            try {
                const result = await aiScoring.score(
                    provider.providerType,
                    provider,
                    { test: true },
                    'CONNECTION_TEST'
                );

                await UPDATE(AIProviders)
                    .set({ lastHealthCheck: new Date(), healthStatus: 'HEALTHY' })
                    .where({ ID: providerId });

                return {
                    success: true,
                    latencyMs: Date.now() - startTime,
                    message: `Connected successfully. Model: ${result.model || 'unknown'}`
                };
            } catch (e) {
                await UPDATE(AIProviders)
                    .set({ lastHealthCheck: new Date(), healthStatus: 'ERROR' })
                    .where({ ID: providerId });

                return {
                    success: false,
                    latencyMs: Date.now() - startTime,
                    message: e.message
                };
            }
        });

        this.on('setAsDefault', 'AIProviders', async (req) => {
            const providerId = req.params[0];

            // Clear all defaults
            await UPDATE(AIProviders).set({ isDefault: false });

            // Set new default
            await UPDATE(AIProviders)
                .set({ isDefault: true })
                .where({ ID: providerId });

            return SELECT.one.from(AIProviders).where({ ID: providerId });
        });

        console.log(`${LOG} Admin handlers initialized`);
    }
};
