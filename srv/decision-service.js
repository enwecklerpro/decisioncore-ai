/**
 * DecisionCore AI - Main Service Handler
 * Enterprise decision execution with full audit trail
 * 
 * @author Taha Khattari
 * @copyright 2026 Taha Khattari
 * @version 2.0.0
 */

'use strict';

const cds = require('@sap/cds');
const rulesEngine = require('./lib/rules-engine');
const aiScoring = require('./lib/ai-scoring');

const LOG = '[DecisionCore]';

// Reference data definitions
const REFERENCE_DATA = {
    RuleOperators: [
        { code: 'EQ', name: 'Equals', descr: 'Value equals', symbol: '=', example: 'status EQ "ACTIVE"' },
        { code: 'NE', name: 'Not Equals', descr: 'Value not equals', symbol: '≠', example: 'type NE "BLOCKED"' },
        { code: 'GT', name: 'Greater Than', descr: 'Greater than', symbol: '>', example: 'amount GT 1000' },
        { code: 'LT', name: 'Less Than', descr: 'Less than', symbol: '<', example: 'risk LT 5' },
        { code: 'GTE', name: 'Greater or Equal', descr: 'Greater than or equal', symbol: '≥', example: 'score GTE 60' },
        { code: 'LTE', name: 'Less or Equal', descr: 'Less than or equal', symbol: '≤', example: 'age LTE 65' },
        { code: 'BETWEEN', name: 'Between', descr: 'Value between two values', symbol: '↔', example: 'amount BETWEEN 1000 AND 5000' },
        { code: 'IN', name: 'In List', descr: 'Value in comma-separated list', symbol: '∈', example: 'country IN ("DE","FR","US")' },
        { code: 'NOT_IN', name: 'Not In List', descr: 'Value not in list', symbol: '∉', example: 'status NOT_IN ("BLOCKED")' },
        { code: 'CONTAINS', name: 'Contains', descr: 'Text contains substring', symbol: '⊃', example: 'name CONTAINS "Corp"' },
        { code: 'REGEX', name: 'Regex Match', descr: 'Matches regular expression', symbol: '~', example: 'email REGEX ".*@company.com"' },
        { code: 'IS_NULL', name: 'Is Null', descr: 'Value is null/empty', symbol: '∅', example: 'manager IS_NULL' },
        { code: 'IS_NOT_NULL', name: 'Is Not Null', descr: 'Value exists', symbol: '∃', example: 'approver IS_NOT_NULL' }
    ],
    RuleActions: [
        { code: 'ADD_SCORE', name: 'Add Score', descr: 'Add/subtract points from score', impact: 'Scoring' },
        { code: 'SET_DECISION', name: 'Set Decision', descr: 'Force specific decision', impact: 'Decision' },
        { code: 'BLOCK', name: 'Block', descr: 'Immediately reject request', impact: 'Critical' },
        { code: 'FLAG', name: 'Add Flag', descr: 'Add warning flag', impact: 'Warning' },
        { code: 'REQUIRE_REVIEW', name: 'Require Review', descr: 'Route to manual review', impact: 'Review' }
    ],
    DecisionTypes: [
        { code: 'APPROVED', name: 'Approved', descr: 'Request approved', severity: 1, color: 'green' },
        { code: 'REJECTED', name: 'Rejected', descr: 'Request rejected', severity: 4, color: 'red' },
        { code: 'REVIEW', name: 'Manual Review', descr: 'Requires manual review', severity: 2, color: 'yellow' },
        { code: 'PENDING', name: 'Pending', descr: 'Decision pending', severity: 1, color: 'grey' },
        { code: 'ERROR', name: 'Error', descr: 'Processing error', severity: 5, color: 'red' }
    ],
    SourceSystems: [
        { code: 'SAP_S4', name: 'SAP S/4HANA', descr: 'SAP S/4HANA Cloud or On-Premise', sapModule: 'S4' },
        { code: 'SAP_ECC', name: 'SAP ECC', descr: 'SAP ERP Central Component', sapModule: 'ECC' },
        { code: 'SAP_CX', name: 'SAP Customer Experience', descr: 'SAP Commerce, Sales, Service Cloud', sapModule: 'CX' },
        { code: 'SAP_ARIBA', name: 'SAP Ariba', descr: 'SAP Ariba Procurement', sapModule: 'ARIBA' },
        { code: 'SAP_FSCD', name: 'SAP FS-CD', descr: 'SAP Financial Services', sapModule: 'FSCD' },
        { code: 'SAP_BW', name: 'SAP BW/4HANA', descr: 'SAP Analytics', sapModule: 'BW' },
        { code: 'EXTERNAL', name: 'External System', descr: 'Non-SAP external system', sapModule: 'EXT' }
    ]
};

module.exports = class DecisionServiceHandler extends cds.ApplicationService {

    async init() {
        await super.init();

        const {
            DecisionScenarios, DecisionRules, DecisionInputs, DecisionOutputs,
            AIProviders, AuditLogs, ScenarioStatistics
        } = cds.entities('decisioncore');

        // --------------------------------------------------------
        // REFERENCE DATA HANDLERS
        // --------------------------------------------------------

        this.on('READ', 'RuleOperators', () => REFERENCE_DATA.RuleOperators);
        this.on('READ', 'RuleActions', () => REFERENCE_DATA.RuleActions);
        this.on('READ', 'DecisionTypes', () => REFERENCE_DATA.DecisionTypes);
        this.on('READ', 'SourceSystems', () => REFERENCE_DATA.SourceSystems);

        // --------------------------------------------------------
        // COMPUTED FIELDS
        // --------------------------------------------------------

        this.after('READ', 'Scenarios', (data) => {
            const items = Array.isArray(data) ? data : [data];
            items.forEach(item => {
                if (item) {
                    item.statusCriticality = this._getStatusCriticality(item.status);
                }
            });
        });

        this.after('READ', 'Rules', (data) => {
            const items = Array.isArray(data) ? data : [data];
            items.forEach(item => {
                if (item) {
                    item.statusCriticality = this._getStatusCriticality(item.status);
                }
            });
        });

        this.after('READ', 'Outputs', (data) => {
            const items = Array.isArray(data) ? data : [data];
            items.forEach(item => {
                if (item) {
                    item.decisionCriticality = this._getDecisionCriticality(item.decision);
                }
            });
        });

        // --------------------------------------------------------
        // MAIN DECISION ACTION
        // --------------------------------------------------------

        this.on('EvaluateDecision', async (req) => {
            const startTime = Date.now();
            const {
                scenarioName, payload: payloadStr, correlationId,
                isSimulation, sapObjectType, sapObjectId
            } = req.data;

            console.log(`${LOG} EvaluateDecision: scenario=${scenarioName}, simulation=${isSimulation}`);

            // Parse payload
            let payload;
            try {
                payload = JSON.parse(payloadStr);
            } catch (e) {
                return req.error(400, 'Invalid JSON payload');
            }

            // Load scenario (allow DRAFT for simulation)
            const scenario = await SELECT.one.from(DecisionScenarios)
                .where({ name: scenarioName });

            if (!scenario || scenario.status === 'ARCHIVED') {
                return req.error(404, `Scenario "${scenarioName}" not found or archived`);
            }

            // Check simulation allowed
            if (isSimulation && !scenario.allowSimulation) {
                return req.error(403, 'Simulation not allowed for this scenario');
            }

            // Generate IDs
            const inputId = cds.utils.uuid();
            const outputId = cds.utils.uuid();
            const corrId = correlationId || inputId;

            // Persist input (unless simulation)
            if (!isSimulation) {
                await INSERT.into(DecisionInputs).entries({
                    ID: inputId,
                    scenario_ID: scenario.ID,
                    scenarioVersion: scenario.version,
                    correlationId: corrId,
                    requestSource: req.user?.id || 'API',
                    requestUser: req.user?.id || 'anonymous',
                    sapObjectType: sapObjectType || scenario.sapObjectType,
                    sapObjectId,
                    payload: payloadStr,
                    isSimulation: false,
                    requestedAt: new Date()
                });
            }

            // Load rules
            const rules = await SELECT.from(DecisionRules)
                .where({ scenario_ID: scenario.ID, status: 'ACTIVE' })
                .orderBy('priority asc');

            console.log(`${LOG} Loaded ${rules.length} active rules`);

            // Evaluate rules
            const rulesStartTime = Date.now();
            const rulesResult = rulesEngine.evaluate(rules, payload, scenario);
            const rulesTimeMs = Date.now() - rulesStartTime;

            // Get AI score
            const aiStartTime = Date.now();
            let aiProvider = null;

            if (scenario.aiProvider_ID) {
                aiProvider = await SELECT.one.from(AIProviders)
                    .where({ ID: scenario.aiProvider_ID });
            }

            const aiResult = await aiScoring.score(
                aiProvider?.providerType || 'MOCK',
                aiProvider || {},
                payload,
                scenarioName
            );
            const aiTimeMs = Date.now() - aiStartTime;

            // Calculate final decision
            const rulesWeight = scenario.rulesWeight || 60;
            const aiWeight = scenario.aiWeight || 40;
            const approvalThreshold = scenario.approvalThreshold || 60;
            const reviewThreshold = scenario.reviewThreshold || 40;

            const rulesScore = rulesResult.score;
            const aiScore = aiResult.score;
            const finalScore = Math.round((rulesScore * rulesWeight + aiScore * aiWeight) / 100);

            // Determine decision
            let decision;
            if (rulesResult.forcedDecision) {
                decision = rulesResult.forcedDecision;
            } else if (finalScore >= approvalThreshold) {
                decision = 'APPROVED';
            } else if (finalScore >= reviewThreshold) {
                decision = 'REVIEW';
            } else {
                decision = 'REJECTED';
            }

            // Build explanation
            const explanation = this._buildExplanation(
                decision, finalScore, rulesScore, aiScore,
                rulesWeight, aiWeight, approvalThreshold, reviewThreshold,
                rulesResult, aiResult
            );

            const processingTimeMs = Date.now() - startTime;

            // Persist output (unless simulation)
            if (!isSimulation) {
                await INSERT.into(DecisionOutputs).entries({
                    ID: outputId,
                    input_ID: inputId,
                    decision,
                    confidence: aiResult.confidence || 75,
                    rulesScore,
                    aiScore,
                    finalScore,
                    explanation,
                    rulesFired: JSON.stringify(rulesResult.firedRules),
                    rulesSkipped: JSON.stringify(rulesResult.skippedRules),
                    aiDetails: JSON.stringify(aiResult.details || {}),
                    flags: JSON.stringify(rulesResult.flags),
                    blockedBy: rulesResult.blockedBy,
                    processingTimeMs,
                    rulesTimeMs,
                    aiTimeMs,
                    status: 'COMPLETED',
                    decidedAt: new Date()
                });

                // Update input with output reference
                await UPDATE(DecisionInputs)
                    .set({ output_ID: outputId, completedAt: new Date() })
                    .where({ ID: inputId });

                // Audit log
                await this._auditLog({
                    eventType: 'DECISION_MADE',
                    severity: 'INFO',
                    scenarioId: scenario.ID,
                    scenarioName: scenario.name,
                    inputId,
                    outputId,
                    userId: req.user?.id || 'anonymous',
                    message: `Decision: ${decision}, Score: ${finalScore}`,
                    details: { decision, finalScore, rulesScore, aiScore },
                    durationMs: processingTimeMs
                });
            }

            console.log(`${LOG} Decision: ${decision}, Score: ${finalScore}, Time: ${processingTimeMs}ms`);

            return {
                ID: outputId,
                decision,
                confidence: aiResult.confidence || 75,
                rulesScore,
                aiScore,
                finalScore,
                explanation,
                rulesFired: JSON.stringify(rulesResult.firedRules),
                flags: JSON.stringify(rulesResult.flags),
                processingTimeMs,
                status: 'COMPLETED'
            };
        });

        // --------------------------------------------------------
        // SIMULATE ACTION
        // --------------------------------------------------------

        this.on('SimulateDecision', async (req) => {
            // Call EvaluateDecision with simulation flag
            const result = await this.EvaluateDecision({
                ...req.data,
                isSimulation: true
            });
            return result;
        });

        // --------------------------------------------------------
        // SCENARIO ACTIONS
        // --------------------------------------------------------

        this.on('publish', 'Scenarios', async (req) => {
            const id = req.params[0];
            await UPDATE(DecisionScenarios)
                .set({ status: 'ACTIVE', publishedAt: new Date(), publishedBy: req.user?.id })
                .where({ ID: id });
            return SELECT.one.from(DecisionScenarios).where({ ID: id });
        });

        this.on('archive', 'Scenarios', async (req) => {
            const id = req.params[0];
            await UPDATE(DecisionScenarios)
                .set({ status: 'ARCHIVED' })
                .where({ ID: id });
            return SELECT.one.from(DecisionScenarios).where({ ID: id });
        });

        this.on('duplicate', 'Scenarios', async (req) => {
            const { newName } = req.data;
            const id = req.params[0];

            const source = await SELECT.one.from(DecisionScenarios).where({ ID: id });
            if (!source) return req.error(404, 'Scenario not found');

            const newId = cds.utils.uuid();
            const copy = {
                ...source,
                ID: newId,
                name: newName || `${source.name}_COPY`,
                status: 'DRAFT',
                version: 1,
                publishedAt: null,
                publishedBy: null
            };
            delete copy.createdAt;
            delete copy.modifiedAt;

            await INSERT.into(DecisionScenarios).entries(copy);

            // Copy rules
            const rules = await SELECT.from(DecisionRules).where({ scenario_ID: id });
            for (const rule of rules) {
                const newRule = {
                    ...rule,
                    ID: cds.utils.uuid(),
                    scenario_ID: newId,
                    status: 'DRAFT',
                    version: 1
                };
                delete newRule.createdAt;
                delete newRule.modifiedAt;
                await INSERT.into(DecisionRules).entries(newRule);
            }

            return SELECT.one.from(DecisionScenarios).where({ ID: newId });
        });

        // --------------------------------------------------------
        // RULE ACTIONS
        // --------------------------------------------------------

        this.on('testRule', 'Rules', async (req) => {
            const { testPayload } = req.data;
            const ruleId = req.params[0];

            let payload;
            try {
                payload = JSON.parse(testPayload);
            } catch (e) {
                return { matched: false, explanation: '', error: 'Invalid JSON' };
            }

            const rule = await SELECT.one.from(DecisionRules).where({ ID: ruleId });
            if (!rule) return { matched: false, explanation: '', error: 'Rule not found' };

            return rulesEngine.testRule(rule, payload);
        });

        this.on('publish', 'Rules', async (req) => {
            const id = req.params[0];
            await UPDATE(DecisionRules)
                .set({ status: 'ACTIVE' })
                .where({ ID: id });
            return SELECT.one.from(DecisionRules).where({ ID: id });
        });

        // --------------------------------------------------------
        // ANALYTICS
        // --------------------------------------------------------

        this.on('getScenarioStatistics', async (req) => {
            const { scenarioName } = req.data;

            const outputs = await SELECT.from(DecisionOutputs, o => {
                o.decision, o.confidence, o.processingTimeMs, o.status;
                o.input(i => { i.scenario(s => { s.name }) });
            }).where({ 'input.scenario.name': scenarioName });

            if (!outputs.length) {
                return {
                    totalDecisions: 0,
                    approvedCount: 0,
                    rejectedCount: 0,
                    reviewCount: 0,
                    errorCount: 0,
                    avgConfidence: 0,
                    avgProcessingTimeMs: 0,
                    successRate: 0
                };
            }

            const approved = outputs.filter(o => o.decision === 'APPROVED').length;
            const rejected = outputs.filter(o => o.decision === 'REJECTED').length;
            const review = outputs.filter(o => o.decision === 'REVIEW').length;
            const errors = outputs.filter(o => o.status === 'ERROR').length;

            return {
                totalDecisions: outputs.length,
                approvedCount: approved,
                rejectedCount: rejected,
                reviewCount: review,
                errorCount: errors,
                avgConfidence: outputs.reduce((s, o) => s + (o.confidence || 0), 0) / outputs.length,
                avgProcessingTimeMs: outputs.reduce((s, o) => s + (o.processingTimeMs || 0), 0) / outputs.length,
                successRate: (outputs.length - errors) / outputs.length * 100
            };
        });

        // --------------------------------------------------------
        // BATCH EVALUATION
        // --------------------------------------------------------

        this.on('EvaluateBatch', async (req) => {
            const { scenarioName, payloads } = req.data;
            const results = [];

            for (let i = 0; i < payloads.length; i++) {
                try {
                    const result = await this.EvaluateDecision({
                        scenarioName,
                        payload: payloads[i],
                        correlationId: `batch-${Date.now()}-${i}`,
                        isSimulation: false
                    });
                    results.push({
                        correlationId: result.ID,
                        decision: result.decision,
                        confidence: result.confidence,
                        finalScore: result.finalScore,
                        status: 'COMPLETED'
                    });
                } catch (error) {
                    results.push({
                        correlationId: `error-${i}`,
                        decision: 'ERROR',
                        confidence: 0,
                        finalScore: 0,
                        status: 'ERROR'
                    });
                }
            }

            console.log(`${LOG} Batch evaluation: ${results.length} items processed`);
            return results;
        });

        // --------------------------------------------------------
        // RULE PERFORMANCE ANALYTICS
        // --------------------------------------------------------

        this.on('getRulePerformance', async (req) => {
            const { scenarioName } = req.data;

            const outputs = await SELECT.from(DecisionOutputs).columns('rulesFired');
            const rules = scenarioName
                ? await SELECT.from(DecisionRules).where({ 'scenario.name': scenarioName })
                : await SELECT.from(DecisionRules);

            const ruleStats = {};

            // Initialize all rules
            for (const rule of rules) {
                ruleStats[rule.ruleCode] = {
                    ruleCode: rule.ruleCode,
                    ruleName: rule.ruleName,
                    triggerCount: 0,
                    totalImpact: 0
                };
            }

            // Count triggers from outputs
            for (const output of outputs) {
                try {
                    const fired = JSON.parse(output.rulesFired || '[]');
                    fired.forEach(r => {
                        if (ruleStats[r.ruleCode]) {
                            ruleStats[r.ruleCode].triggerCount++;
                            ruleStats[r.ruleCode].totalImpact += r.scoreModifier || 0;
                        }
                    });
                } catch (e) { }
            }

            const totalOutputs = outputs.length || 1;

            return Object.values(ruleStats).map(r => ({
                ruleCode: r.ruleCode,
                ruleName: r.ruleName,
                triggerCount: r.triggerCount,
                triggerRate: Math.round((r.triggerCount / totalOutputs) * 100 * 100) / 100,
                avgImpact: r.triggerCount > 0 ? Math.round((r.totalImpact / r.triggerCount) * 10) / 10 : 0
            })).sort((a, b) => b.triggerCount - a.triggerCount);
        });

        // --------------------------------------------------------
        // CREATE NEW VERSION
        // --------------------------------------------------------

        this.on('createNewVersion', 'Scenarios', async (req) => {
            const id = req.params[0];
            const { ScenarioVersions } = cds.entities('decisioncore');

            const scenario = await SELECT.one.from(DecisionScenarios).where({ ID: id });
            if (!scenario) return req.error(404, 'Scenario not found');

            // Create version snapshot
            const versionSnapshot = {
                ID: cds.utils.uuid(),
                scenario_ID: id,
                version: scenario.version,
                configSnapshot: JSON.stringify(scenario),
                changedFields: 'Initial version',
                changeReason: 'Version created'
            };

            await INSERT.into(ScenarioVersions).entries(versionSnapshot);

            // Increment version
            const newVersion = scenario.version + 1;
            await UPDATE(DecisionScenarios)
                .set({ version: newVersion })
                .where({ ID: id });

            console.log(`${LOG} Created version ${scenario.version} snapshot, incremented to ${newVersion}`);
            return SELECT.one.from(DecisionScenarios).where({ ID: id });
        });

        this.on('healthCheck', async () => {
            const scenarios = await SELECT.from(DecisionScenarios).where({ status: 'ACTIVE' });
            const aiHealth = await aiScoring.healthCheckAll();

            return {
                status: 'healthy',
                version: '2.0.0',
                timestamp: new Date(),
                dbStatus: 'connected',
                aiProviderStatus: aiHealth.MOCK?.status || 'unknown',
                activeScenarios: scenarios.length
            };
        });

        // --------------------------------------------------------
        // TEMPLATES
        // --------------------------------------------------------

        this.on('createFromTemplate', async (req) => {
            const { templateCode, newName, displayName } = req.data;
            const { ScenarioTemplates, TemplateRules } = cds.entities('decisioncore');

            const template = await SELECT.one.from(ScenarioTemplates).where({ code: templateCode });
            if (!template) return req.error(404, `Template "${templateCode}" not found`);

            const newId = cds.utils.uuid();

            // Create scenario from template
            await INSERT.into(DecisionScenarios).entries({
                ID: newId,
                name: newName,
                displayName: displayName || template.name,
                description: template.description,
                status: 'DRAFT',
                version: 1,
                rulesWeight: template.defaultRulesWeight,
                aiWeight: template.defaultAIWeight,
                approvalThreshold: template.defaultApprovalThreshold,
                reviewThreshold: template.defaultReviewThreshold,
                allowSimulation: true
            });

            // Copy template rules
            const templateRules = await SELECT.from(TemplateRules).where({ template_ID: template.ID });
            for (const tr of templateRules) {
                await INSERT.into(DecisionRules).entries({
                    ID: cds.utils.uuid(),
                    scenario_ID: newId,
                    ruleCode: tr.ruleCode,
                    ruleName: tr.ruleName,
                    description: tr.description,
                    priority: tr.priority,
                    status: 'DRAFT',
                    conditionExpression: tr.conditionExpression,
                    fieldName: tr.fieldName,
                    operator: tr.operator,
                    value1: tr.value1,
                    value2: tr.value2,
                    action: tr.action,
                    scoreModifier: tr.scoreModifier,
                    decisionOverride: tr.decisionOverride,
                    explanation: tr.explanation
                });
            }

            console.log(`${LOG} Created scenario "${newName}" from template "${templateCode}"`);
            return SELECT.one.from(DecisionScenarios).where({ ID: newId });
        });

        // --------------------------------------------------------
        // DASHBOARD & ANALYTICS
        // --------------------------------------------------------

        this.on('getDashboardStats', async () => {
            const outputs = await SELECT.from(DecisionOutputs);

            if (!outputs.length) {
                return {
                    totalDecisions: 0,
                    todayDecisions: 0,
                    approvalRate: 0,
                    rejectionRate: 0,
                    reviewRate: 0,
                    avgConfidence: 0,
                    avgProcessingMs: 0,
                    rulesContribution: 60,
                    aiContribution: 40
                };
            }

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const todayOutputs = outputs.filter(o => new Date(o.createdAt) >= today);
            const approved = outputs.filter(o => o.decision === 'APPROVED').length;
            const rejected = outputs.filter(o => o.decision === 'REJECTED').length;
            const review = outputs.filter(o => o.decision === 'REVIEW').length;
            const total = outputs.length;

            const avgRulesScore = outputs.reduce((s, o) => s + (o.rulesScore || 50), 0) / total;
            const avgAiScore = outputs.reduce((s, o) => s + (o.aiScore || 50), 0) / total;
            const totalContrib = avgRulesScore + avgAiScore;

            return {
                totalDecisions: total,
                todayDecisions: todayOutputs.length,
                approvalRate: Math.round((approved / total) * 100),
                rejectionRate: Math.round((rejected / total) * 100),
                reviewRate: Math.round((review / total) * 100),
                avgConfidence: Math.round(outputs.reduce((s, o) => s + (o.confidence || 0), 0) / total),
                avgProcessingMs: Math.round(outputs.reduce((s, o) => s + (o.processingTimeMs || 0), 0) / total),
                rulesContribution: Math.round((avgRulesScore / totalContrib) * 100),
                aiContribution: Math.round((avgAiScore / totalContrib) * 100)
            };
        });

        this.on('getTopRules', async (req) => {
            const { scenarioName, limit } = req.data;
            const outputs = await SELECT.from(DecisionOutputs).columns('rulesFired');

            const ruleCounts = {};
            for (const output of outputs) {
                try {
                    const rules = JSON.parse(output.rulesFired || '[]');
                    rules.forEach(r => {
                        if (!ruleCounts[r.ruleCode]) {
                            ruleCounts[r.ruleCode] = {
                                ruleCode: r.ruleCode,
                                ruleName: r.ruleName,
                                triggerCount: 0,
                                totalImpact: 0
                            };
                        }
                        ruleCounts[r.ruleCode].triggerCount++;
                        ruleCounts[r.ruleCode].totalImpact += r.scoreModifier || 0;
                    });
                } catch (e) { }
            }

            return Object.values(ruleCounts)
                .map(r => ({
                    ruleCode: r.ruleCode,
                    ruleName: r.ruleName,
                    triggerCount: r.triggerCount,
                    avgImpact: r.triggerCount > 0 ? r.totalImpact / r.triggerCount : 0
                }))
                .sort((a, b) => b.triggerCount - a.triggerCount)
                .slice(0, limit || 10);
        });

        this.on('getDecisionTrend', async (req) => {
            const { days } = req.data;
            const outputs = await SELECT.from(DecisionOutputs);

            const trend = {};
            const now = new Date();

            for (let i = 0; i < (days || 7); i++) {
                const date = new Date(now);
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];
                trend[dateStr] = { date: dateStr, approved: 0, rejected: 0, review: 0 };
            }

            outputs.forEach(o => {
                const dateStr = new Date(o.createdAt).toISOString().split('T')[0];
                if (trend[dateStr]) {
                    if (o.decision === 'APPROVED') trend[dateStr].approved++;
                    else if (o.decision === 'REJECTED') trend[dateStr].rejected++;
                    else if (o.decision === 'REVIEW') trend[dateStr].review++;
                }
            });

            return Object.values(trend).sort((a, b) => a.date.localeCompare(b.date));
        });

        console.log(`${LOG} Service handlers initialized`);
    }

    // --------------------------------------------------------
    // HELPER METHODS
    // --------------------------------------------------------

    _buildExplanation(decision, finalScore, rulesScore, aiScore, rulesWeight, aiWeight,
        approvalThreshold, reviewThreshold, rulesResult, aiResult) {
        const lines = [
            `═══════════════════════════════════════════`,
            `DECISION: ${decision}`,
            `═══════════════════════════════════════════`,
            ``,
            `SCORE BREAKDOWN`,
            `───────────────────────────────────────────`,
            `Final Score:     ${finalScore} / 100`,
            `Rules Score:     ${rulesScore} (weight: ${rulesWeight}%)`,
            `AI Score:        ${aiScore} (weight: ${aiWeight}%)`,
            ``,
            `THRESHOLDS`,
            `───────────────────────────────────────────`,
            `Approval:        ≥ ${approvalThreshold}`,
            `Review:          ≥ ${reviewThreshold}`,
            ``,
            `RULES FIRED (${rulesResult.firedRules.length})`,
            `───────────────────────────────────────────`
        ];

        for (const rule of rulesResult.firedRules) {
            const impact = rule.scoreModifier > 0 ? `+${rule.scoreModifier}` :
                rule.scoreModifier < 0 ? `${rule.scoreModifier}` : rule.action;
            lines.push(`• ${rule.ruleName}: ${impact}`);
            if (rule.explanation) lines.push(`  └─ ${rule.explanation}`);
        }

        if (rulesResult.flags.length > 0) {
            lines.push('');
            lines.push('FLAGS');
            lines.push('───────────────────────────────────────────');
            rulesResult.flags.forEach(f => lines.push(`⚠️ ${f.message}`));
        }

        if (aiResult.factors?.length > 0) {
            lines.push('');
            lines.push(`AI FACTORS (${aiResult.model || 'unknown'})`);
            lines.push('───────────────────────────────────────────');
            aiResult.factors.forEach(f => {
                const sign = f.impact > 0 ? '+' : '';
                lines.push(`• ${f.factor}: ${sign}${f.impact}`);
            });
        }

        return lines.join('\n');
    }

    _getStatusCriticality(status) {
        const map = { ACTIVE: 3, DRAFT: 2, SUSPENDED: 1, ARCHIVED: 0 };
        return map[status] || 0;
    }

    _getDecisionCriticality(decision) {
        const map = { APPROVED: 3, REVIEW: 2, REJECTED: 1, ERROR: 1 };
        return map[decision] || 0;
    }

    async _auditLog(data) {
        try {
            const { AuditLogs } = cds.entities('decisioncore');
            await INSERT.into(AuditLogs).entries({
                ID: cds.utils.uuid(),
                timestamp: new Date(),
                ...data,
                details: typeof data.details === 'object' ? JSON.stringify(data.details) : data.details
            });
        } catch (e) {
            console.error(`${LOG} Audit log failed:`, e.message);
        }
    }
};
