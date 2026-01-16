/**
 * DecisionCore AI - Decision Templates
 * Pre-built scenario templates for common enterprise use cases
 */

namespace decisioncore;

using { cuid } from '@sap/cds/common';

// ============================================================
// SCENARIO TEMPLATES
// ============================================================

entity ScenarioTemplates : cuid {
    code              : String(50) @mandatory;
    name              : localized String(200);
    description       : localized String(1000);
    category          : String(50);
    icon              : String(100);
    
    // Default Configuration
    defaultRulesWeight      : Integer default 60;
    defaultAIWeight         : Integer default 40;
    defaultApprovalThreshold: Integer default 60;
    defaultReviewThreshold  : Integer default 40;
    defaultAIProvider       : String(30) default 'MOCK';
    
    // Sample Schema & Payload
    samplePayloadSchema     : LargeString;
    samplePayload           : LargeString;
    
    // Template Rules
    templateRules           : Composition of many TemplateRules on templateRules.template = $self;
}

entity TemplateRules : cuid {
    template          : Association to ScenarioTemplates;
    
    ruleCode          : String(50);
    ruleName          : String(200);
    description       : String(500);
    priority          : Integer default 100;
    
    // Condition
    conditionExpression : LargeString;
    fieldName         : String(100);
    operator          : String(20);
    value1            : String(500);
    value2            : String(500);
    
    // Outcome
    action            : String(30);
    scoreModifier     : Integer default 0;
    decisionOverride  : String(30);
    explanation       : String(500);
}
