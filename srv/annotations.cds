// DecisionCore AI - UI Annotations

using { DecisionService, DecisionAdminService } from './services';

// ============================================================
// SCENARIOS - Full Annotation
// ============================================================

annotate DecisionService.Scenarios with @(
    Common.SemanticKey: [name],
    UI: {
        HeaderInfo: {
            TypeName: 'Decision Scenario',
            TypeNamePlural: 'Decision Scenarios',
            Title: { Value: name },
            Description: { Value: displayName },
            ImageUrl: 'sap-icon://decision'
        },
        SelectionFields: [ name, status, sourceSystem ],
        LineItem: [
            { Value: name, Label: 'Scenario ID' },
            { Value: displayName, Label: 'Name' },
            { Value: status, Label: 'Status' },
            { Value: version, Label: 'Version' },
            { Value: rulesWeight, Label: 'Rules %' },
            { Value: aiWeight, Label: 'AI %' },
            { Value: approvalThreshold, Label: 'Threshold' },
            { Value: sourceSystem, Label: 'Source' }
        ],
        Facets: [
            { $Type: 'UI.ReferenceFacet', ID: 'GeneralFacet', Label: 'General', Target: '@UI.FieldGroup#General' },
            { $Type: 'UI.ReferenceFacet', ID: 'ScoringFacet', Label: 'Scoring Configuration', Target: '@UI.FieldGroup#Scoring' },
            { $Type: 'UI.ReferenceFacet', ID: 'AIFacet', Label: 'AI Settings', Target: '@UI.FieldGroup#AI' },
            { $Type: 'UI.ReferenceFacet', ID: 'BehaviorFacet', Label: 'Behavior', Target: '@UI.FieldGroup#Behavior' },
            { $Type: 'UI.ReferenceFacet', ID: 'RulesFacet', Label: 'Decision Rules', Target: 'rules/@UI.LineItem' }
        ],
        FieldGroup#General: {
            Data: [
                { Value: name, Label: 'Scenario ID' },
                { Value: displayName, Label: 'Display Name' },
                { Value: description, Label: 'Description' },
                { Value: status, Label: 'Status' },
                { Value: version, Label: 'Version' },
                { Value: validFrom, Label: 'Valid From' },
                { Value: validTo, Label: 'Valid To' }
            ]
        },
        FieldGroup#Scoring: {
            Data: [
                { Value: rulesWeight, Label: 'Rules Weight (%)' },
                { Value: aiWeight, Label: 'AI Weight (%)' },
                { Value: approvalThreshold, Label: 'Approval Threshold' },
                { Value: reviewThreshold, Label: 'Review Threshold' }
            ]
        },
        FieldGroup#AI: {
            Data: [
                { Value: aiProvider_ID, Label: 'AI Provider' },
                { Value: aiModelId, Label: 'Model ID' }
            ]
        },
        FieldGroup#Behavior: {
            Data: [
                { Value: sourceSystem, Label: 'Source System' },
                { Value: sapObjectType, Label: 'SAP Object Type' },
                { Value: allowSimulation, Label: 'Allow Simulation' },
                { Value: requireApproval, Label: 'Require Approval' },
                { Value: maxRetries, Label: 'Max Retries' },
                { Value: timeoutMs, Label: 'Timeout (ms)' }
            ]
        }
    }
);

annotate DecisionService.Scenarios with {
    name @Common.Label: 'Scenario ID' @Common.FieldControl: #Mandatory;
    displayName @Common.Label: 'Display Name';
    description @UI.MultiLineText;
    status @Common.Label: 'Status' @Common.ValueListWithFixedValues;
    rulesWeight @Measures.Unit: '%';
    aiWeight @Measures.Unit: '%';
};

// ============================================================
// RULES - Full Annotation
// ============================================================

annotate DecisionService.Rules with @(
    Common.SemanticKey: [ruleCode],
    UI: {
        HeaderInfo: {
            TypeName: 'Decision Rule',
            TypeNamePlural: 'Decision Rules',
            Title: { Value: ruleName },
            Description: { Value: description }
        },
        SelectionFields: [ ruleCode, status, action, ruleGroup ],
        LineItem: [
            { Value: ruleCode, Label: 'Rule Code' },
            { Value: ruleName, Label: 'Name' },
            { Value: priority, Label: 'Priority' },
            { Value: status, Label: 'Status' },
            { Value: ruleGroup, Label: 'Group' },
            { Value: conditionExpression, Label: 'Condition' },
            { Value: action, Label: 'Action' },
            { Value: scoreModifier, Label: 'Score +/-' }
        ],
        Facets: [
            { $Type: 'UI.ReferenceFacet', ID: 'GeneralFacet', Label: 'General', Target: '@UI.FieldGroup#General' },
            { $Type: 'UI.ReferenceFacet', ID: 'ConditionFacet', Label: 'Condition', Target: '@UI.FieldGroup#Condition' },
            { $Type: 'UI.ReferenceFacet', ID: 'OutcomeFacet', Label: 'Outcome', Target: '@UI.FieldGroup#Outcome' },
            { $Type: 'UI.ReferenceFacet', ID: 'ExplanationFacet', Label: 'Explanation', Target: '@UI.FieldGroup#Explanation' }
        ],
        FieldGroup#General: {
            Data: [
                { Value: ruleCode, Label: 'Rule Code' },
                { Value: ruleName, Label: 'Rule Name' },
                { Value: description, Label: 'Description' },
                { Value: status, Label: 'Status' },
                { Value: version, Label: 'Version' },
                { Value: priority, Label: 'Priority' },
                { Value: ruleGroup, Label: 'Rule Group' },
                { Value: stopOnMatch, Label: 'Stop on Match' }
            ]
        },
        FieldGroup#Condition: {
            Data: [
                { Value: conditionExpression, Label: 'Expression (e.g., amount > 1000 && riskLevel < 5)' },
                { Value: fieldName, Label: 'Field Name (alternative)' },
                { Value: operator, Label: 'Operator' },
                { Value: value1, Label: 'Value 1' },
                { Value: value2, Label: 'Value 2 (for BETWEEN)' }
            ]
        },
        FieldGroup#Outcome: {
            Data: [
                { Value: action, Label: 'Action' },
                { Value: scoreModifier, Label: 'Score Modifier' },
                { Value: decisionOverride, Label: 'Decision Override' },
                { Value: confidence, Label: 'Confidence (%)' }
            ]
        },
        FieldGroup#Explanation: {
            Data: [
                { Value: explanation, Label: 'Explanation Text' },
                { Value: businessRationale, Label: 'Business Rationale' }
            ]
        }
    }
);

annotate DecisionService.Rules with {
    ruleCode @Common.Label: 'Rule Code' @Common.FieldControl: #Mandatory;
    ruleName @Common.Label: 'Rule Name' @Common.FieldControl: #Mandatory;
    description @UI.MultiLineText;
    conditionExpression @UI.MultiLineText;
    explanation @UI.MultiLineText;
    businessRationale @UI.MultiLineText;
    action @Common.ValueListWithFixedValues;
    operator @Common.ValueListWithFixedValues;
    decisionOverride @Common.ValueListWithFixedValues;
};

// ============================================================
// DECISION OUTPUTS - Full Annotation  
// ============================================================

annotate DecisionService.Outputs with @(
    UI: {
        HeaderInfo: {
            TypeName: 'Decision Output',
            TypeNamePlural: 'Decision Outputs',
            Title: { Value: decision },
            Description: { Value: explanation }
        },
        SelectionFields: [ decision, status, createdAt ],
        LineItem: [
            { Value: createdAt, Label: 'Timestamp' },
            { Value: decision, Label: 'Decision' },
            { Value: finalScore, Label: 'Score' },
            { Value: confidence, Label: 'Confidence %' },
            { Value: rulesScore, Label: 'Rules' },
            { Value: aiScore, Label: 'AI' },
            { Value: processingTimeMs, Label: 'Time (ms)' },
            { Value: status, Label: 'Status' }
        ],
        Facets: [
            { $Type: 'UI.ReferenceFacet', ID: 'DecisionFacet', Label: 'Decision', Target: '@UI.FieldGroup#Decision' },
            { $Type: 'UI.ReferenceFacet', ID: 'ScoresFacet', Label: 'Scores', Target: '@UI.FieldGroup#Scores' },
            { $Type: 'UI.ReferenceFacet', ID: 'DetailsFacet', Label: 'Details', Target: '@UI.FieldGroup#Details' }
        ],
        FieldGroup#Decision: {
            Data: [
                { Value: decision, Label: 'Decision' },
                { Value: confidence, Label: 'Confidence' },
                { Value: status, Label: 'Status' },
                { Value: decidedAt, Label: 'Decided At' },
                { Value: processingTimeMs, Label: 'Processing Time (ms)' }
            ]
        },
        FieldGroup#Scores: {
            Data: [
                { Value: rulesScore, Label: 'Rules Score' },
                { Value: aiScore, Label: 'AI Score' },
                { Value: finalScore, Label: 'Final Score' },
                { Value: rulesTimeMs, Label: 'Rules Time (ms)' },
                { Value: aiTimeMs, Label: 'AI Time (ms)' }
            ]
        },
        FieldGroup#Details: {
            Data: [
                { Value: explanation, Label: 'Explanation' },
                { Value: rulesFired, Label: 'Rules Fired' },
                { Value: flags, Label: 'Flags' },
                { Value: blockedBy, Label: 'Blocked By' }
            ]
        }
    }
);

// ============================================================
// AI PROVIDERS - Full Annotation
// ============================================================

annotate DecisionAdminService.AIProviders with @(
    UI: {
        HeaderInfo: {
            TypeName: 'AI Provider',
            TypeNamePlural: 'AI Providers',
            Title: { Value: name },
            Description: { Value: description }
        },
        SelectionFields: [ code, providerType, status ],
        LineItem: [
            { Value: code, Label: 'Code' },
            { Value: name, Label: 'Name' },
            { Value: providerType, Label: 'Type' },
            { Value: status, Label: 'Status' },
            { Value: isDefault, Label: 'Default' },
            { Value: healthStatus, Label: 'Health' }
        ],
        Facets: [
            { $Type: 'UI.ReferenceFacet', ID: 'GeneralFacet', Label: 'General', Target: '@UI.FieldGroup#General' },
            { $Type: 'UI.ReferenceFacet', ID: 'ConnectionFacet', Label: 'Connection', Target: '@UI.FieldGroup#Connection' },
            { $Type: 'UI.ReferenceFacet', ID: 'MappingFacet', Label: 'Response Mapping', Target: '@UI.FieldGroup#Mapping' }
        ],
        FieldGroup#General: {
            Data: [
                { Value: code, Label: 'Provider Code' },
                { Value: name, Label: 'Name' },
                { Value: description, Label: 'Description' },
                { Value: providerType, Label: 'Type' },
                { Value: status, Label: 'Status' },
                { Value: isDefault, Label: 'Is Default' }
            ]
        },
        FieldGroup#Connection: {
            Data: [
                { Value: endpoint, Label: 'Endpoint URL' },
                { Value: authType, Label: 'Auth Type' },
                { Value: destinationName, Label: 'BTP Destination' },
                { Value: timeoutMs, Label: 'Timeout (ms)' },
                { Value: retryCount, Label: 'Retry Count' },
                { Value: cacheTTLSeconds, Label: 'Cache TTL (sec)' }
            ]
        },
        FieldGroup#Mapping: {
            Data: [
                { Value: requestTemplate, Label: 'Request Template' },
                { Value: responseScorePath, Label: 'Score JSON Path' },
                { Value: responseConfidencePath, Label: 'Confidence JSON Path' }
            ]
        }
    }
);

// ============================================================
// AUDIT LOGS - Full Annotation
// ============================================================

annotate DecisionAdminService.AuditLogs with @(
    UI: {
        HeaderInfo: {
            TypeName: 'Audit Log',
            TypeNamePlural: 'Audit Logs',
            Title: { Value: eventType },
            Description: { Value: message }
        },
        SelectionFields: [ eventType, severity, timestamp, userId ],
        LineItem: [
            { Value: timestamp, Label: 'Timestamp' },
            { Value: eventType, Label: 'Event' },
            { Value: severity, Label: 'Severity' },
            { Value: scenarioName, Label: 'Scenario' },
            { Value: userId, Label: 'User' },
            { Value: message, Label: 'Message' },
            { Value: durationMs, Label: 'Duration (ms)' }
        ]
    }
);
