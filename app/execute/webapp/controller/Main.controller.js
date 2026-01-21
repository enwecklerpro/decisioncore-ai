sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (Controller, JSONModel, MessageToast, MessageBox) {
    "use strict";

    return Controller.extend("decisioncore.execute.controller.Main", {

        onInit: function () {
            // Template definitions - Enterprise Decision Templates
            this._templates = {
                // Asset Management
                asset_lifecycle: {
                    assetId: "AST-10045",
                    assetType: "MACHINERY",
                    acquisitionDate: "2018-06-15",
                    currentValue: 125000,
                    maintenanceCostYTD: 18500,
                    estimatedRepairCost: 35000,
                    replacementCost: 180000,
                    remainingUsefulLife: 3,
                    criticality: "HIGH",
                    downtimeImpact: 45000
                },
                // Finance - Capex
                capex_budget: {
                    requestId: "CAPEX-2026-0012",
                    requestor: "M. Schmidt",
                    department: "Operations",
                    projectName: "Automation Line Upgrade",
                    requestedAmount: 850000,
                    currency: "EUR",
                    budgetCode: "CAPEX-OPS-2026",
                    availableBudget: 1200000,
                    roi: 24.5,
                    paybackMonths: 28,
                    priority: "HIGH"
                },
                // Finance - Credit
                credit_application: {
                    applicationId: "CA-2026-0089",
                    customerId: "C-45678",
                    customerName: "Müller Industries GmbH",
                    requestedLimit: 500000,
                    currency: "EUR",
                    riskScore: 72,
                    paymentHistory: "GOOD",
                    yearsAsCustomer: 5,
                    annualRevenue: 12500000,
                    outstandingBalance: 125000
                },
                // Finance AP
                invoice_approval: {
                    invoiceNumber: "INV-2026-0042",
                    vendorId: "V-9921",
                    vendorName: "TechConsult AG",
                    poNumber: "PO-2026-0155",
                    grNumber: "GR-2026-0312",
                    invoiceAmount: 12500,
                    poAmount: 12500,
                    grAmount: 12500,
                    currency: "EUR",
                    tolerance: 0.02,
                    paymentTerms: "NET30"
                },
                // General
                generic_json: {
                    entityId: "ENTITY-001",
                    entityType: "GENERIC",
                    attributes: {
                        key1: "value1",
                        key2: 100,
                        key3: true
                    },
                    metadata: {
                        source: "EXTERNAL",
                        timestamp: "2026-01-17T10:30:00Z"
                    }
                },
                // HR
                hr_promotion: {
                    employeeId: "E-12345",
                    employeeName: "Anna Weber",
                    currentGrade: "L5",
                    targetGrade: "L6",
                    yearsInGrade: 3,
                    performanceRating: 4.2,
                    lastPromotionDate: "2023-04-01",
                    managerRecommendation: true,
                    completedTrainings: 8,
                    leadershipScore: 85
                },
                // IT
                it_access: {
                    requestId: "ACC-2026-0456",
                    employeeId: "E-56789",
                    employeeName: "Thomas Bauer",
                    systemName: "SAP_PROD",
                    accessLevel: "WRITE",
                    businessJustification: "Project Lead for Alpha",
                    managerApproved: true,
                    securityClearance: "CONFIDENTIAL",
                    riskClassification: "MEDIUM",
                    temporaryAccess: false
                },
                // Legal - KYC
                kyc_compliance: {
                    customerId: "CUS-78901",
                    customerType: "CORPORATE",
                    legalName: "Global Trade Partners Ltd",
                    registrationCountry: "GB",
                    documentType: "CERTIFICATE_OF_INCORPORATION",
                    documentVerified: true,
                    beneficialOwners: 3,
                    pepStatus: false,
                    sanctionListMatch: false,
                    riskScore: 28,
                    lastReviewDate: "2025-06-15"
                },
                // Legal - Contract
                contract_renewal: {
                    contractId: "CON-2026-0089",
                    vendorId: "V-1234",
                    vendorName: "CloudServices Inc",
                    contractType: "SaaS Subscription",
                    startDate: "2024-02-01",
                    endDate: "2026-01-31",
                    annualValue: 48000,
                    currency: "EUR",
                    autoRenewalClause: true,
                    noticePeriodDays: 90,
                    performanceScore: 92
                },
                // Plant Maintenance
                maintenance_priority: {
                    notificationId: "PM-2026-0789",
                    equipmentId: "EQ-PUMP-045",
                    equipmentType: "CENTRIFUGAL_PUMP",
                    plant: "1000",
                    workCenter: "PM-MECH",
                    breakdownRisk: "HIGH",
                    assetCriticality: "A",
                    safetyImpact: true,
                    productionImpact: 15000,
                    estimatedDowntime: 8,
                    sparePartsAvailable: true
                },
                // Quality
                quality_inspection: {
                    inspectionLotId: "QI-2026-0456",
                    materialNumber: "MAT-10045",
                    batchNumber: "BATCH-2026-0089",
                    plant: "1000",
                    vendor: "V-5678",
                    quantity: 5000,
                    unit: "PC",
                    vendorQualityScore: 94,
                    previousDefectRate: 0.02,
                    criticalMaterial: false,
                    skipInspectionAllowed: true
                },
                // Sales - Discount
                sales_discount: {
                    salesOrderId: "SO-2026-0123",
                    customerId: "C-98765",
                    customerTier: "GOLD",
                    orderValue: 125000,
                    currency: "EUR",
                    requestedDiscount: 12,
                    standardDiscount: 8,
                    productMargin: 35,
                    ytdVolume: 850000,
                    strategicAccount: true,
                    competitorPressure: "MEDIUM"
                },
                // Sales - Returns
                return_request: {
                    returnId: "RET-2026-0056",
                    salesOrderId: "SO-2025-4567",
                    customerId: "C-34567",
                    materialNumber: "MAT-20089",
                    quantity: 50,
                    returnReason: "DEFECTIVE",
                    daysFromDelivery: 15,
                    originalValue: 2500,
                    currency: "EUR",
                    warrantyValid: true,
                    customerHistory: "GOOD"
                },
                // Security - Fraud
                fraud_detection: {
                    transactionId: "TXN-2026-0089",
                    accountId: "ACC-56789",
                    amount: 4500,
                    currency: "EUR",
                    merchantCategory: "ELECTRONICS",
                    merchantCountry: "RO",
                    cardPresent: false,
                    ipCountry: "NL",
                    deviceFingerprint: "fp-abc123xyz",
                    velocityScore: 78,
                    historicalAvg: 250,
                    distanceFromHome: 1500
                },
                // Sourcing
                vendor_risk: {
                    vendorId: "V-45678",
                    vendorName: "GlobalParts Manufacturing",
                    country: "CN",
                    purchaseOrderValue: 750000,
                    currency: "USD",
                    singleSourced: true,
                    qualityScore: 88,
                    deliveryScore: 82,
                    financialRating: "BBB",
                    geopoliticalRisk: "MEDIUM",
                    leadTimeDays: 45,
                    alternativeVendors: 2
                },
                // Supply Chain
                supply_chain_risk: {
                    shipmentId: "SHIP-2026-0234",
                    origin: "Shanghai, CN",
                    destination: "Hamburg, DE",
                    carrier: "Maersk",
                    transportMode: "SEA",
                    cargoValue: 450000,
                    currency: "EUR",
                    estimatedDays: 32,
                    weatherRisk: "LOW",
                    portCongestion: "MEDIUM",
                    insuranceCoverage: true,
                    hazardousCargo: false
                },
                // Travel
                travel_expense: {
                    expenseReportId: "EXP-2026-0189",
                    employeeId: "E-23456",
                    employeeName: "Lisa Müller",
                    tripPurpose: "Customer Meeting",
                    destination: "London, UK",
                    totalAmount: 2850.50,
                    currency: "EUR",
                    hotelCost: 890,
                    flightCost: 650,
                    mealsCost: 285.50,
                    transportCost: 125,
                    otherCost: 900,
                    policyLimit: 3000,
                    receiptsAttached: true
                },
                // Warehouse
                warehouse_transfer: {
                    transferId: "TR-2026-0567",
                    sourceWarehouse: "WH-1000",
                    targetWarehouse: "WH-2000",
                    materialNumber: "MAT-30045",
                    quantity: 500,
                    unit: "PC",
                    sourceStock: 2500,
                    targetStock: 150,
                    reorderPoint: 300,
                    demandForecast: 450,
                    transportCost: 850,
                    urgency: "NORMAL"
                }
            };

            // View model for UI state
            var oViewModel = new JSONModel({
                busy: false,
                scenario: "",
                selectedTemplate: "",
                executionMode: "simulate",
                correlationId: "",
                payload: '{\n  "amount": 5000,\n  "riskLevel": 3,\n  "customerType": "STANDARD",\n  "country": "DE"\n}',
                result: null,
                hasResult: false
            });
            this.getView().setModel(oViewModel, "view");
        },

        onTemplateChange: function (oEvent) {
            var sKey = oEvent.getParameter("selectedItem").getKey();
            if (sKey && this._templates[sKey]) {
                var sPayload = JSON.stringify(this._templates[sKey], null, 2);
                this.getView().getModel("view").setProperty("/payload", sPayload);
                MessageToast.show("Template loaded: " + sKey.replace(/_/g, " ").toUpperCase());
            }
        },

        onValidateJson: function () {
            var sPayload = this.getView().getModel("view").getProperty("/payload");
            try {
                JSON.parse(sPayload);
                MessageToast.show("✓ JSON is valid!");
            } catch (e) {
                MessageToast.show("✗ Invalid JSON: " + e.message);
            }
        },

        onFormatJson: function () {
            var oModel = this.getView().getModel("view");
            var sPayload = oModel.getProperty("/payload");
            try {
                var oJson = JSON.parse(sPayload);
                oModel.setProperty("/payload", JSON.stringify(oJson, null, 2));
                MessageToast.show("JSON formatted");
            } catch (e) {
                MessageToast.show("Cannot format: Invalid JSON");
            }
        },

        onCopyPayload: function () {
            var sPayload = this.getView().getModel("view").getProperty("/payload");
            navigator.clipboard.writeText(sPayload).then(function () {
                MessageToast.show("Payload copied to clipboard");
            });
        },

        onScenarioChange: function (oEvent) {
            var oItem = oEvent.getParameter("selectedItem");
            if (oItem) {
                var oCtx = oItem.getBindingContext();
                // Request the inputSchema property explicitly if it's not automatically loaded
                oCtx.requestProperty("inputSchema").then(function (sSchema) {
                    if (sSchema) {
                        this.getView().getModel("view").setProperty("/payload", sSchema);
                        MessageToast.show("Template loaded from Scenario");
                    }
                }.bind(this));
            }
        },

        onEvaluate: function () {
            var oViewModel = this.getView().getModel("view");
            var oSelect = this.byId("scenarioSelect");
            var oItem = oSelect.getSelectedItem();

            if (!oItem) {
                MessageToast.show("Please select a scenario.");
                oSelect.open();
                return;
            }

            var sScenarioName = oItem.getText();
            var sPayload = oViewModel.getProperty("/payload");

            oViewModel.setProperty("/busy", true);

            // Use OData V4 Context Binding for Action
            var oModel = this.getView().getModel();
            var oBindContext = oModel.bindContext("/SimulateDecision(...)");

            // Pass parameters. Note: sPayload is handled as string.
            oBindContext.setParameter("scenarioName", sScenarioName);
            oBindContext.setParameter("payload", sPayload);

            oBindContext.execute().then(function () {
                var oContext = oBindContext.getBoundContext();
                var data = oContext.getObject();

                // Check if data is null (void return?)
                if (!data) {
                    throw new Error("No data returned from simulation.");
                }

                // Parse nested JSON strings from backend
                var aRules = [];
                try { if (data.rulesFired) aRules = JSON.parse(data.rulesFired); } catch (e) { }

                var oResultUI = {
                    decision: data.decision || "UNKNOWN",
                    finalScore: data.finalScore || 0,
                    confidence: data.confidence || 0,
                    processingTimeMs: Math.floor(Math.random() * 80) + 40, // Mock time or use header
                    explanation: data.explanation || "",
                    rulesFired: aRules,
                    rawJson: JSON.stringify(data, null, 2)
                };

                oViewModel.setProperty("/result", oResultUI);
                oViewModel.setProperty("/hasResult", true);
                oViewModel.setProperty("/busy", false);
                MessageToast.show("Simulation successful: " + oResultUI.decision);
            }).catch(function (err) {
                oViewModel.setProperty("/busy", false);
                console.error(err);
                MessageBox.error("Execution Error: " + err.message);
            });
        },

        onLoadSample: function () {
            var sSample = JSON.stringify({
                "amount": 12500,
                "currency": "EUR",
                "vendorId": "V-9921",
                "riskCategory": "MEDIUM",
                "description": "Consulting services for Q1 Project Alpha"
            }, null, 2);
            this.getView().getModel("view").setProperty("/payload", sSample);
            MessageToast.show("Sample loaded");
        },

        onClear: function () {
            this.getView().getModel("view").setProperty("/result", null);
            this.getView().getModel("view").setProperty("/hasResult", false);
        }
    });
});
