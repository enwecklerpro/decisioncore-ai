using DecisionService as service from '../../srv/services';

annotate service.DecisionHistory with @(
    UI: {
        HeaderInfo: {
            TypeName: 'Audit Record',
            TypeNamePlural: 'Decision History',
            Title: { Value: scenarioName },
            Description: { Value: decidedAt }
        },
        SelectionFields: [ scenarioName, executionMode, finalDecision, decidedAt, correlationId ],
        LineItem: [
            { Value: decidedAt, Label: 'Timestamp' },
            { Value: scenarioName, Label: 'Scenario' },
            { Value: executionMode, Label: 'Mode' },
            { Value: finalDecision, Label: 'Decision' },
            { Value: finalScore, Label: 'Final Score' },
            { Value: processingTimeMs, Label: 'Duration (ms)' },
            { Value: status, Label: 'Status' }
        ],
        Facets: [
            {
                $Type: 'UI.ReferenceFacet',
                Label: 'Execution Details',
                Target: '@UI.FieldGroup#Main'
            },
            {
                $Type: 'UI.ReferenceFacet',
                Label: 'AI & Rules Analysis',
                Target: '@UI.FieldGroup#Analysis'
            },
            {
                $Type: 'UI.ReferenceFacet',
                Label: 'Technical Data',
                Target: '@UI.FieldGroup#Tech'
            }
        ],
        FieldGroup#Main: {
            Data: [
                { Value: scenarioName, Label: 'Scenario Name' },
                { Value: finalDecision, Label: 'Final Decision' },
                { Value: finalScore, Label: 'Calculated Score' },
                { Value: executionMode, Label: 'Execution Mode' }
            ]
        },
        FieldGroup#Analysis: {
            Data: [
                { Value: rulesFired, Label: 'Triggered Rules' },
                // aiDetails is LargeString, might be JSON
                { Value: aiDetails, Label: 'AI Analysis' },
                { Value: explanation, Label: 'Decision Explanation' }
            ]
        },
        FieldGroup#Tech: {
            Data: [
                { Value: correlationId, Label: 'Correlation ID' },
                { Value: processingTimeMs, Label: 'Processing Time' },
                { Value: status, Label: 'Status' },
                { Value: errorCode, Label: 'Error Code' },
                { Value: errorMessage, Label: 'Error Message' }
            ]
        }
    }
);
