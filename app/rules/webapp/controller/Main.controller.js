sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (Controller, MessageToast, JSONModel, MessageBox, Filter, FilterOperator) {
    "use strict";

    return Controller.extend("decisioncore.rules.controller.Main", {

        onInit: function () {
            this._bFiltered = false;

            // Initialize stats model
            var oStatsModel = new JSONModel({
                totalRules: 0,
                activeRules: 0,
                draftRules: 0,
                avgImpact: "+0 pts"
            });
            this.getView().setModel(oStatsModel, "stats");

            // Load stats after data is loaded
            this._loadStats();

            // Set up automatic stats refresh when table updates
            var that = this;
            this.getView().attachAfterRendering(function () {
                var oTable = that.byId("rulesTable");
                if (oTable) {
                    var oBinding = oTable.getBinding("items");
                    if (oBinding) {
                        oBinding.attachDataReceived(function () {
                            that._loadStats();
                        });
                    }
                }
            });

            // Rule template definitions with sample condition logic
            this._ruleTemplates = {
                asset_lifecycle: { ruleCode: "R-AST-01", ruleName: "High Repair Cost", conditionExpression: "input.estimatedRepairCost > input.replacementCost * 0.5", action: "REVIEW", scoreModifier: -20 },
                capex_budget: { ruleCode: "R-CAP-01", ruleName: "Budget Check", conditionExpression: "input.requestedAmount <= input.availableBudget", action: "APPROVE", scoreModifier: 30 },
                credit_application: { ruleCode: "R-CRD-01", ruleName: "High Risk Score", conditionExpression: "input.riskScore > 80", action: "REJECT", scoreModifier: -50 },
                invoice_approval: { ruleCode: "R-INV-01", ruleName: "3-Way Match", conditionExpression: "Math.abs(input.invoiceAmount - input.poAmount) < 1.0", action: "APPROVE", scoreModifier: 40 },
                generic_json: { ruleCode: "R-GEN-01", ruleName: "Generic Check", conditionExpression: "input.value > 100", action: "APPROVE", scoreModifier: 10 },
                hr_promotion: { ruleCode: "R-HR-01", ruleName: "Time in Grade", conditionExpression: "input.yearsInGrade >= 2", action: "APPROVE", scoreModifier: 15 },
                it_access: { ruleCode: "R-IT-01", ruleName: "Security Clearance", conditionExpression: "input.securityClearanceLevel >= input.requiredClearance", action: "APPROVE", scoreModifier: 20 },
                kyc_compliance: { ruleCode: "R-KYC-01", ruleName: "PEP Check", conditionExpression: "input.isPEP === false", action: "APPROVE", scoreModifier: 30 },
                contract_renewal: { ruleCode: "R-CNT-01", ruleName: "Performance Met", conditionExpression: "input.performanceScore >= 90", action: "APPROVE", scoreModifier: 25 },
                maintenance_priority: { ruleCode: "R-PM-01", ruleName: "Critical Asset", conditionExpression: "input.criticality === 'HIGH'", action: "Review", scoreModifier: 10 },
                quality_inspection: { ruleCode: "R-QM-01", ruleName: "Vendor Quality", conditionExpression: "input.vendorQualityRating < 90", action: "Review", scoreModifier: -10 },
                sales_discount: { ruleCode: "R-SD-01", ruleName: "Margin Check", conditionExpression: "input.margin >= 20.0", action: "APPROVE", scoreModifier: 15 },
                return_request: { ruleCode: "R-RET-01", ruleName: "Return Policy", conditionExpression: "input.daysSincePurchase <= 30", action: "APPROVE", scoreModifier: 10 },
                fraud_detection: { ruleCode: "R-FRD-01", ruleName: "Fraud Alert", conditionExpression: "input.velocityScore > 70 || input.amount > input.historicalAvg * 10", action: "REJECT", scoreModifier: -50 },
                vendor_risk: { ruleCode: "R-SRC-01", ruleName: "Vendor Risk Assessment", conditionExpression: "input.qualityScore >= 80 && input.geopoliticalRisk !== 'HIGH'", action: "APPROVE", scoreModifier: 25 },
                supply_chain_risk: { ruleCode: "R-SCM-01", ruleName: "Shipment Risk", conditionExpression: "input.weatherRisk !== 'HIGH' && input.insuranceCoverage", action: "APPROVE", scoreModifier: 15 },
                travel_expense: { ruleCode: "R-TRV-01", ruleName: "Expense Policy Check", conditionExpression: "input.totalAmount <= input.policyLimit && input.receiptsAttached", action: "APPROVE", scoreModifier: 20 },
                warehouse_transfer: { ruleCode: "R-EWM-01", ruleName: "Stock Transfer Trigger", conditionExpression: "input.targetStock < input.reorderPoint && input.sourceStock > input.quantity", action: "APPROVE", scoreModifier: 10 }
            };
        },

        _loadStats: function () {
            var that = this;
            setTimeout(function () {
                that._updateStatsFromTable();
            }, 500);
        },

        _updateStatsFromTable: function () {
            var oTable = this.byId("rulesTable");
            if (!oTable) return;

            var aItems = oTable.getItems();
            var oStatsModel = this.getView().getModel("stats");

            var iTotal = aItems.length;
            var iActive = 0;
            var iDraft = 0;
            var iTotalImpact = 0;

            aItems.forEach(function (oItem) {
                var oCtx = oItem.getBindingContext();
                if (!oCtx) return;
                var oData = oCtx.getObject();
                if (oData.status === "ACTIVE") iActive++;
                else if (oData.status === "DRAFT") iDraft++;
                iTotalImpact += oData.scoreModifier || 0;
            });

            var iAvgImpact = iTotal > 0 ? Math.round(iTotalImpact / iTotal) : 0;

            oStatsModel.setData({
                totalRules: iTotal,
                activeRules: iActive,
                draftRules: iDraft,
                avgImpact: (iAvgImpact >= 0 ? "+" : "") + iAvgImpact + " pts"
            });
        },

        onRuleTemplateChange: function (oEvent) {
            var sKey = oEvent.getParameter("selectedItem").getKey();
            if (sKey && this._ruleTemplates[sKey]) {
                var oTemplate = this._ruleTemplates[sKey];
                var oModel = this.getView().getModel("newRule");
                oModel.setProperty("/ruleCode", oTemplate.ruleCode);
                oModel.setProperty("/ruleName", oTemplate.ruleName);
                oModel.setProperty("/conditionExpression", oTemplate.conditionExpression);
                oModel.setProperty("/action", oTemplate.action);
                oModel.setProperty("/scoreModifier", oTemplate.scoreModifier);
                MessageToast.show("Template loaded: " + oTemplate.ruleName);
            }
        },

        onOpenCreateRuleDialog: function () {
            var oView = this.getView();

            // Initialize model for the new rule form
            var oNewRuleModel = new JSONModel({
                ruleCode: "",
                ruleName: "",
                description: "",
                conditionExpression: "",
                action: "REJECT",
                scoreModifier: -10,
                priority: 10
            });
            oView.setModel(oNewRuleModel, "newRule");

            if (!this._pRuleDialog) {
                this._pRuleDialog = this.loadFragment({
                    name: "decisioncore.rules.view.CreateRuleDialog"
                });
            }
            this._pRuleDialog.then(function (oDialog) {
                oDialog.open();
            });
        },

        onCreateRuleConfirm: function () {
            var oView = this.getView();
            var oNewRuleData = oView.getModel("newRule").getData();

            // Access controls inside the fragment using byId
            var oScenarioSelect = this.byId("scenarioSelect");
            var sScenarioId = oScenarioSelect ? oScenarioSelect.getSelectedKey() : null;

            if (!sScenarioId) {
                MessageToast.show("Please select a target Scenario.");
                return;
            }
            if (!oNewRuleData.ruleCode || !oNewRuleData.conditionExpression) {
                MessageToast.show("Rule Code and Condition are required.");
                return;
            }

            // Create via OData v4 list binding
            var oListBinding = oView.getModel().bindList("/Rules");
            var oContext = oListBinding.create({
                scenario_ID: sScenarioId,
                ruleCode: oNewRuleData.ruleCode,
                ruleName: oNewRuleData.ruleName,
                description: oNewRuleData.description,
                conditionExpression: oNewRuleData.conditionExpression,
                action: oNewRuleData.action,
                scoreModifier: oNewRuleData.scoreModifier,
                priority: oNewRuleData.priority,
                status: "ACTIVE"
            });

            oContext.created().then(function () {
                MessageToast.show("Rule '" + oNewRuleData.ruleCode + "' created successfully.");
                this.byId("createRuleDialog").close();
                oView.getModel().refresh(); // Refresh table
            }.bind(this)).catch(function (err) {
                MessageToast.show("Error creating rule: " + err.message);
            });
        },

        onCreateRuleCancel: function () {
            this.byId("createRuleDialog").close();
        },

        onRefresh: function () {
            this.getView().getModel().refresh();
            this._loadStats();
            MessageToast.show("Refreshed");
        },

        onSearch: function (oEvent) {
            var sQuery = oEvent.getParameter("query") || oEvent.getParameter("newValue");
            var oTable = this.byId("rulesTable");
            var oBinding = oTable.getBinding("items");
            if (sQuery) {
                var oFilter = new Filter({
                    path: "ruleCode",
                    operator: FilterOperator.Contains,
                    value1: sQuery,
                    caseSensitive: false
                });
                oBinding.filter([oFilter]);
            } else {
                oBinding.filter([]);
            }
        },

        onFilter: function () {
            var oTable = this.byId("rulesTable");
            var oBinding = oTable.getBinding("items");

            if (this._bFiltered) {
                oBinding.filter([]);
                this._bFiltered = false;
                MessageToast.show("Filter off: Showing all Rules");
            } else {
                oBinding.filter([new Filter("status", FilterOperator.EQ, "ACTIVE")]);
                this._bFiltered = true;
                MessageToast.show("Filter active: Showing ACTIVE Rules only (Drafts hidden)");
            }
        },

        onDeleteRule: function (oEvent) {
            var oCtx = oEvent.getSource().getBindingContext();
            var sCode = oCtx.getProperty("ruleCode");
            MessageBox.confirm("Permanently delete rule " + sCode + "?", {
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        oCtx.delete().then(function () {
                            MessageToast.show("Rule deleted");
                        }).catch(function (e) {
                            MessageToast.show("Error: " + e.message);
                        });
                    }
                }
            });
        },

        onDeleteSelectedRules: function () {
            var oTable = this.byId("rulesTable");
            var aSelectedItems = oTable.getSelectedItems();

            if (aSelectedItems.length === 0) {
                MessageToast.show("No rules selected.");
                return;
            }

            MessageBox.confirm("Delete " + aSelectedItems.length + " rules?", {
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        var aPromises = [];
                        aSelectedItems.forEach(function (oItem) {
                            aPromises.push(oItem.getBindingContext().delete());
                        });

                        // Wait for all deletes
                        Promise.all(aPromises).then(function () {
                            MessageToast.show("Selected rules deleted");
                            oTable.removeSelections();
                        }).catch(function (e) {
                            MessageBox.error("Error during deletion: " + e.message);
                        });
                    }
                }
            });
        },

        // ========================================
        // NEW: Rule Click Handler - Open Detail Dialog
        // ========================================
        onRulePress: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext();
            var oRule = oContext.getObject();

            // Create and open detail dialog
            sap.ui.require([
                "sap/m/Dialog", "sap/m/VBox", "sap/m/HBox", "sap/m/Text", "sap/m/Title",
                "sap/m/Button", "sap/m/ObjectStatus", "sap/m/ObjectNumber", "sap/m/Label",
                "sap/ui/layout/form/SimpleForm", "sap/m/Input", "sap/m/TextArea"
            ], function (Dialog, VBox, HBox, Text, Title, Button, ObjectStatus, ObjectNumber, Label, SimpleForm, Input, TextArea) {
                var oDialog = new Dialog({
                    title: "Rule Details: " + oRule.ruleCode,
                    contentWidth: "500px",
                    content: [
                        new SimpleForm({
                            editable: false,
                            layout: "ResponsiveGridLayout",
                            labelSpanL: 4,
                            labelSpanM: 4,
                            content: [
                                new Label({ text: "Rule Code" }),
                                new Text({ text: oRule.ruleCode }),

                                new Label({ text: "Rule Name" }),
                                new Text({ text: oRule.ruleName }),

                                new Label({ text: "Status" }),
                                new ObjectStatus({
                                    text: oRule.status,
                                    state: oRule.status === "ACTIVE" ? "Success" : oRule.status === "INACTIVE" ? "Error" : "Warning",
                                    inverted: true
                                }),

                                new Label({ text: "Priority" }),
                                new ObjectNumber({ number: oRule.priority }),

                                new Label({ text: "Action" }),
                                new ObjectStatus({ text: oRule.action }),

                                new Label({ text: "Score Modifier" }),
                                new ObjectNumber({
                                    number: oRule.scoreModifier,
                                    unit: "pts",
                                    state: oRule.scoreModifier >= 0 ? "Success" : "Error"
                                }),

                                new Label({ text: "Condition" }),
                                new Text({ text: oRule.condition || "-" }),

                                new Label({ text: "Description" }),
                                new Text({ text: oRule.description || "-" })
                            ]
                        })
                    ],
                    beginButton: new Button({
                        text: "Edit",
                        type: "Emphasized",
                        press: function () {
                            oDialog.close();
                            this._openEditDialog(oContext);
                        }.bind(this)
                    }),
                    endButton: new Button({
                        text: "Close",
                        press: function () {
                            oDialog.close();
                            oDialog.destroy();
                        }
                    }),
                    afterClose: function () {
                        oDialog.destroy();
                    }
                });
                oDialog.open();
            }.bind(this));
        },

        // ========================================
        // NEW: Edit Rule
        // ========================================
        onEditRule: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext();
            this._openEditDialog(oContext);
        },

        _openEditDialog: function (oContext) {
            var oRule = oContext.getObject();

            sap.ui.require([
                "sap/m/Dialog", "sap/m/VBox", "sap/m/Button", "sap/m/Label",
                "sap/ui/layout/form/SimpleForm", "sap/m/Input", "sap/m/TextArea", "sap/m/Select",
                "sap/ui/core/Item"
            ], function (Dialog, VBox, Button, Label, SimpleForm, Input, TextArea, Select, Item) {
                var oRuleNameInput = new Input({ value: oRule.ruleName, width: "100%" });
                var oPriorityInput = new Input({ value: oRule.priority, type: "Number", width: "100%" });
                var oScoreInput = new Input({ value: oRule.scoreModifier, type: "Number", width: "100%" });
                var oConditionInput = new TextArea({ value: oRule.conditionExpression, rows: 3, width: "100%" });
                var oStatusSelect = new Select({
                    selectedKey: oRule.status,
                    items: [
                        new Item({ key: "ACTIVE", text: "Active" }),
                        new Item({ key: "INACTIVE", text: "Inactive" }),
                        new Item({ key: "DRAFT", text: "Draft" })
                    ]
                });
                var oActionSelect = new Select({
                    selectedKey: oRule.action,
                    items: [
                        new Item({ key: "APPROVE", text: "Approve" }),
                        new Item({ key: "REJECT", text: "Reject" }),
                        new Item({ key: "REVIEW", text: "Review" }),
                        new Item({ key: "FLAG", text: "Flag" })
                    ]
                });

                var oEditDialog = new Dialog({
                    title: "Edit Rule: " + oRule.ruleCode,
                    contentWidth: "450px",
                    content: [
                        new SimpleForm({
                            editable: true,
                            layout: "ResponsiveGridLayout",
                            labelSpanL: 4,
                            labelSpanM: 4,
                            content: [
                                new Label({ text: "Rule Name" }),
                                oRuleNameInput,
                                new Label({ text: "Status" }),
                                oStatusSelect,
                                new Label({ text: "Action" }),
                                oActionSelect,
                                new Label({ text: "Priority" }),
                                oPriorityInput,
                                new Label({ text: "Score Modifier" }),
                                oScoreInput,
                                new Label({ text: "Condition" }),
                                oConditionInput
                            ]
                        })
                    ],
                    beginButton: new Button({
                        text: "Save",
                        type: "Emphasized",
                        press: function () {
                            // Update via OData
                            oContext.setProperty("ruleName", oRuleNameInput.getValue());
                            oContext.setProperty("status", oStatusSelect.getSelectedKey());
                            oContext.setProperty("action", oActionSelect.getSelectedKey());
                            oContext.setProperty("priority", parseInt(oPriorityInput.getValue()));
                            oContext.setProperty("scoreModifier", parseInt(oScoreInput.getValue()));
                            oContext.setProperty("conditionExpression", oConditionInput.getValue());

                            MessageToast.show("Rule '" + oRule.ruleCode + "' updated.");
                            oEditDialog.close();
                        }
                    }),
                    endButton: new Button({
                        text: "Cancel",
                        press: function () {
                            oEditDialog.close();
                        }
                    }),
                    afterClose: function () {
                        oEditDialog.destroy();
                    }
                });
                oEditDialog.open();
            });
        },

        // ========================================
        // NEW: Toggle Rule Status (Switch)
        // ========================================
        onToggleRuleStatus: function (oEvent) {
            var bState = oEvent.getParameter("state");
            var oContext = oEvent.getSource().getBindingContext();
            var sNewStatus = bState ? "ACTIVE" : "INACTIVE";

            oContext.setProperty("status", sNewStatus);
            MessageToast.show("Rule " + (bState ? "activated" : "deactivated"));
        },

        // ========================================
        // Status Change via Select Dropdown
        // ========================================
        onStatusChange: function (oEvent) {
            var sNewStatus = oEvent.getParameter("selectedItem").getKey();
            var oContext = oEvent.getSource().getBindingContext();
            var that = this;
            oContext.setProperty("status", sNewStatus);
            setTimeout(function () {
                that._updateStatsFromTable();
            }, 100);
            MessageToast.show("Status changed to " + sNewStatus);
        },

        // ========================================
        // Duplicate Single Rule
        // ========================================
        onDuplicateRule: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext();
            var oRule = oContext.getObject();
            var that = this;

            // Use the table's binding for create
            var oTable = this.byId("rulesTable");
            var oListBinding = oTable.getBinding("items");

            var oNewContext = oListBinding.create({
                scenario_ID: oRule.scenario_ID,
                ruleCode: oRule.ruleCode + "_CP" + Date.now().toString().slice(-4),
                ruleName: oRule.ruleName + " (Copy)",
                description: oRule.description || "",
                conditionExpression: oRule.conditionExpression || "",
                action: oRule.action || "APPROVE",
                scoreModifier: oRule.scoreModifier || 0,
                priority: oRule.priority || 10,
                status: "DRAFT"
            });

            oNewContext.created().then(function () {
                MessageToast.show("Rule duplicated as Draft");
                that._loadStats();
            }).catch(function (err) {
                MessageBox.error("Error duplicating: " + err.message);
            });
        },

        // ========================================
        // Duplicate Selected Rules
        // ========================================
        onDuplicateSelectedRules: function () {
            var oTable = this.byId("rulesTable");
            var aSelectedItems = oTable.getSelectedItems();

            if (aSelectedItems.length === 0) {
                MessageToast.show("No rules selected.");
                return;
            }

            var that = this;
            var oListBinding = oTable.getBinding("items");
            var aPromises = [];
            var iCount = 0;

            aSelectedItems.forEach(function (oItem) {
                var oRule = oItem.getBindingContext().getObject();
                var oNewContext = oListBinding.create({
                    scenario_ID: oRule.scenario_ID,
                    ruleCode: oRule.ruleCode + "_CP" + Date.now().toString().slice(-4) + "_" + iCount,
                    ruleName: oRule.ruleName + " (Copy)",
                    description: oRule.description || "",
                    condition: oRule.condition || "",
                    action: oRule.action || "APPROVE",
                    scoreModifier: oRule.scoreModifier || 0,
                    priority: oRule.priority || 10,
                    status: "DRAFT"
                });
                aPromises.push(oNewContext.created());
                iCount++;
            });

            Promise.all(aPromises).then(function () {
                MessageToast.show(aSelectedItems.length + " rule(s) duplicated as Draft");
                that._loadStats();
            }).catch(function (err) {
                MessageBox.error("Error duplicating: " + err.message);
            });

            oTable.removeSelections();
        }
    });
});
