/**
 * DecisionCore AI - Public API Handler
 */

'use strict';

const cds = require('@sap/cds');

module.exports = class APIServiceHandler extends cds.ApplicationService {

    async init() {
        await super.init();

        // Simple API for external systems
        this.on('evaluate', async (req) => {
            const { scenario, data, correlation, simulate } = req.data;

            // Delegate to main service
            const decisionService = await cds.connect.to('DecisionService');
            const result = await decisionService.EvaluateDecision({
                scenarioName: scenario,
                payload: data,
                correlationId: correlation,
                isSimulation: simulate || false
            });

            return {
                requestId: result.ID,
                decision: result.decision,
                score: result.finalScore,
                confidence: result.confidence,
                explanation: result.explanation?.substring(0, 500),
                processingMs: result.processingTimeMs
            };
        });

        this.on('status', async (req) => {
            const { requestId } = req.data;
            const { DecisionOutputs } = cds.entities('decisioncore');

            const output = await SELECT.one.from(DecisionOutputs).where({ ID: requestId });
            if (!output) return req.error(404, 'Request not found');

            return {
                decision: output.decision,
                score: output.finalScore,
                confidence: output.confidence,
                explanation: output.explanation,
                completedAt: output.decidedAt
            };
        });

        this.on('scenarios', async () => {
            const { DecisionScenarios } = cds.entities('decisioncore');
            const scenarios = await SELECT.from(DecisionScenarios)
                .where({ status: 'ACTIVE' })
                .columns('name', 'displayName', 'description', 'status');

            return scenarios;
        });

        this.on('health', async () => ({
            status: 'healthy',
            version: '2.0.0'
        }));
    }
};
