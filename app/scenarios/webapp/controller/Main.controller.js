sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/Sorter",
    "sap/m/MessageBox"
], function (Controller, MessageToast, JSONModel, Filter, FilterOperator, Sorter, MessageBox) {
    "use strict";

    return Controller.extend("decisioncore.scenarios.controller.Main", {

        onInit: function () {
            this._bDescendingSort = false;

            // Initialize stats model
            var oStatsModel = new JSONModel({
                totalScenarios: 0,
                activeScenarios: 0,
                draftScenarios: 0,
                inactiveScenarios: 0,
                systemStatus: "Loading..."
            });
            this.getView().setModel(oStatsModel, "stats");

            // Load stats after data is loaded
            this._loadStats();

            // Set up automatic stats refresh when table updates
            var that = this;
            this.getView().attachAfterRendering(function () {
                var oTable = that.byId("scenariosTable");
                if (oTable) {
                    var oBinding = oTable.getBinding("items");
                    if (oBinding) {
                        oBinding.attachDataReceived(function () {
                            that._loadStats();
                        });
                    }
                }
            });

            // Enterprise Decision Templates
            var aTemplates = [
                { code: "asset_lifecycle", name: "Asset Lifecycle Decision", description: "Recommend Repair vs. Replace for enterprise assets", category: "Asset Mgmt", icon: "sap-icon://factory" },
                { code: "capex_budget", name: "Capex Budget Release", description: "Approves capital expenditure requests based on available budget", category: "Finance", icon: "sap-icon://money-bills" },
                { code: "credit_application", name: "Credit Application Approval", description: "Evaluates customer credit requests based on risk score and history", category: "Finance", icon: "sap-icon://credit-card" },
                { code: "invoice_approval", name: "Invoice Auto-Approval", description: "Three-way matching logic for automated vendor invoice payment", category: "Finance (AP)", icon: "sap-icon://receipt" },
                { code: "generic_json", name: "Generic JSON Decision", description: "Flexible template for any JSON-based decision logic", category: "General", icon: "sap-icon://document-text" },
                { code: "hr_promotion", name: "HR Promotion Eligibility", description: "Determine employee eligibility for promotion cycles", category: "HR", icon: "sap-icon://employee-approvals" },
                { code: "it_access", name: "IT Access Request", description: "Logic to approve or reject system access requests", category: "IT", icon: "sap-icon://locked" },
                { code: "kyc_compliance", name: "KYC Compliance Check", description: "Know Your Customer compliance logic for onboarding", category: "Legal", icon: "sap-icon://customer-and-supplier" },
                { code: "contract_renewal", name: "Contract Auto-Renewal", description: "Determines if a service contract should be auto-renewed", category: "Legal", icon: "sap-icon://signature" },
                { code: "maintenance_priority", name: "Maintenance Order Priority", description: "Auto-assigns priority to Plant Maintenance orders", category: "Plant Maint.", icon: "sap-icon://wrench" },
                { code: "quality_inspection", name: "Quality Inspection Decision", description: "Determines if a production lot requires inspection", category: "Quality (QM)", icon: "sap-icon://quality-issue" },
                { code: "sales_discount", name: "Sales Discount Approval", description: "Automated approval logic for sales order discounts", category: "Sales", icon: "sap-icon://sales-order" },
                { code: "return_request", name: "Return Request Action", description: "Decides handling of customer returns", category: "Sales (SD)", icon: "sap-icon://undo" },
                { code: "fraud_detection", name: "Transaction Fraud Detection", description: "Real-time analysis of transaction patterns for fraud", category: "Security", icon: "sap-icon://alert" },
                { code: "vendor_risk", name: "Vendor Procurement Risk", description: "Assess supplier reliability and risk before PO approval", category: "Sourcing", icon: "sap-icon://supplier" },
                { code: "supply_chain_risk", name: "Supply Chain Risk Assessment", description: "Evaluates logistical risks for shipments", category: "Supply Chain", icon: "sap-icon://shipping-status" },
                { code: "travel_expense", name: "Travel Expense Approval", description: "Audits travel expense reports against corporate policy", category: "Travel", icon: "sap-icon://flight" },
                { code: "warehouse_transfer", name: "Warehouse Stock Transfer", description: "Logic to optimize stock movement triggers in EWM", category: "Warehouse", icon: "sap-icon://inventory" }
            ];

            var oTemplatesModel = new JSONModel({ templates: aTemplates });
            this.getView().setModel(oTemplatesModel, "scenarioTemplates");
        },

        _loadStats: function () {
            var that = this;
            setTimeout(function () {
                that._updateStatsFromTable();
            }, 500);
        },

        _updateStatsFromTable: function () {
            var oTable = this.byId("scenariosTable");
            if (!oTable) return;

            var aItems = oTable.getItems();
            var oStatsModel = this.getView().getModel("stats");

            var iTotal = aItems.length;
            var iActive = 0;
            var iDraft = 0;
            var iInactive = 0;

            aItems.forEach(function (oItem) {
                var oCtx = oItem.getBindingContext();
                if (!oCtx) return;
                var oData = oCtx.getObject();
                if (oData.status === "ACTIVE") iActive++;
                else if (oData.status === "DRAFT") iDraft++;
                else if (oData.status === "INACTIVE") iInactive++;
            });

            oStatsModel.setData({
                totalScenarios: iTotal,
                activeScenarios: iActive,
                draftScenarios: iDraft,
                inactiveScenarios: iInactive,
                systemStatus: iActive > 0 ? "Online" : "Offline"
            });
        },

        onCreateScenario: function () {
            if (!this._pTemplateDialog) {
                this._pTemplateDialog = this.loadFragment({
                    name: "decisioncore.scenarios.view.TemplateSelectDialog"
                });
            }
            this._pTemplateDialog.then(function (oDialog) {
                oDialog.open();
            });
        },

        onTemplateSearch: function (oEvent) {
            var sValue = oEvent.getParameter("value");
            var oFilter = new Filter("name", FilterOperator.Contains, sValue);
            var oBinding = oEvent.getSource().getBinding("items");
            oBinding.filter([oFilter]);
        },

        onTemplateConfirm: function (oEvent) {
            var oSelectedItem = oEvent.getParameter("selectedItem");
            if (!oSelectedItem) {
                return;
            }

            var oCtx = oSelectedItem.getBindingContext("scenarioTemplates");
            var oTemplate = oCtx.getObject();

            var oTable = this.byId("scenariosTable");
            var oBinding = oTable.getBinding("items");

            var oNewContext = oBinding.create({
                name: oTemplate.code + "_" + Date.now(),
                displayName: oTemplate.name,
                description: oTemplate.description,
                status: "DRAFT",
                template_ID: oTemplate.code,
                rulesWeight: 60,
                aiWeight: 40
            });

            oNewContext.created().then(function () {
                MessageToast.show("Scenario '" + oTemplate.name + "' created successfully.");
                oTable.getBinding("items").refresh();
            }).catch(function (oError) {
                MessageBox.error("Error creating scenario: " + oError.message);
            });
        },

        onTemplateCancel: function () {
            // User cancelled
        },

        onSearch: function (oEvent) {
            var sQuery = oEvent.getParameter("query") || oEvent.getParameter("newValue");
            var oTable = this.byId("scenariosTable");
            var oBinding = oTable.getBinding("items");

            if (sQuery) {
                var oFilter = new Filter({
                    path: "name",
                    operator: FilterOperator.Contains,
                    value1: sQuery,
                    caseSensitive: false
                });
                oBinding.filter([oFilter]);
            } else {
                oBinding.filter([]);
            }
        },

        onSort: function () {
            var oTable = this.byId("scenariosTable");
            var oBinding = oTable.getBinding("items");
            this._bDescendingSort = !this._bDescendingSort;
            var oSorter = new Sorter("name", this._bDescendingSort);
            oBinding.sort(oSorter);
            MessageToast.show("Sorted by Name " + (this._bDescendingSort ? "Descending" : "Ascending"));
        },

        onFilter: function () {
            var oTable = this.byId("scenariosTable");
            var oBinding = oTable.getBinding("items");

            if (this._bFiltered) {
                oBinding.filter([]);
                this._bFiltered = false;
                MessageToast.show("Filter off: Showing all Scenarios");
            } else {
                var oFilter = new Filter("status", FilterOperator.EQ, "ACTIVE");
                oBinding.filter([oFilter]);
                this._bFiltered = true;
                MessageToast.show("Filter active: Showing ACTIVE Scenarios only");
            }
        },

        onGroup: function () {
            var oTable = this.byId("scenariosTable");
            var oBinding = oTable.getBinding("items");
            var oSorter = new Sorter("status", false, true);
            oBinding.sort(oSorter);
            MessageToast.show("Grouped by Status");
        },

        onEditScenario: function (oEvent) {
            var oCtx = oEvent.getSource().getBindingContext();
            this._oConfigContext = oCtx;

            var oData = oCtx.getObject();
            var oEditModel = new JSONModel({
                name: oData.name,
                displayName: oData.displayName || oData.name,
                description: oData.description,
                rulesWeight: oData.rulesWeight,
                aiWeight: oData.aiWeight,
                approvalThreshold: oData.approvalThreshold,
                reviewThreshold: oData.reviewThreshold
            });
            this.getView().setModel(oEditModel, "editScenario");

            if (!this._pEditDialog) {
                this._pEditDialog = this.loadFragment({
                    name: "decisioncore.scenarios.view.EditScenarioDialog"
                });
            }
            this._pEditDialog.then(function (oDialog) {
                oDialog.open();
            });
        },

        onEditScenarioSave: function () {
            var oData = this.getView().getModel("editScenario").getData();
            this._oConfigContext.setProperty("displayName", oData.displayName);
            this._oConfigContext.setProperty("description", oData.description);
            this._oConfigContext.setProperty("rulesWeight", oData.rulesWeight);
            this._oConfigContext.setProperty("aiWeight", oData.aiWeight);
            this._oConfigContext.setProperty("approvalThreshold", parseInt(oData.approvalThreshold));
            this._oConfigContext.setProperty("reviewThreshold", parseInt(oData.reviewThreshold));

            this.byId("editScenarioDialog").close();
            MessageToast.show("Configuration saved.");
        },

        onEditScenarioCancel: function () {
            this.byId("editScenarioDialog").close();
        },

        onDeleteScenario: function (oEvent) {
            var oCtx = oEvent.getSource().getBindingContext();
            var sName = oCtx.getProperty("name");

            MessageBox.confirm("Permanently delete scenario '" + sName + "'?", {
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        oCtx.delete().then(function () {
                            MessageToast.show("Scenario deleted");
                        }).catch(function (e) {
                            MessageBox.error("Delete failed: " + e.message);
                        });
                    }
                }
            });
        },

        onDeleteSelectedScenarios: function () {
            var oTable = this.byId("scenariosTable");
            var aSelectedItems = oTable.getSelectedItems();

            if (aSelectedItems.length === 0) {
                MessageToast.show("No scenarios selected.");
                return;
            }

            MessageBox.confirm("Delete " + aSelectedItems.length + " scenarios?", {
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        var aPromises = [];
                        aSelectedItems.forEach(function (oItem) {
                            aPromises.push(oItem.getBindingContext().delete());
                        });
                        Promise.all(aPromises).then(function () {
                            MessageToast.show("Scenarios deleted");
                            oTable.removeSelections();
                        }).catch(function (e) {
                            MessageBox.error("Error: " + e.message);
                        });
                    }
                }
            });
        },

        onGenericAction: function () {
            MessageBox.information("This action is reserved for future workflow extensions.");
        },

        onPressOpenPopover: function (oEvent) {
            MessageToast.show("System Status is online. Connected to SAP BTP.");
        },

        // ========================================
        // NEW: Scenario Click Handler - Open Detail Dialog
        // ========================================
        onScenarioPress: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext();
            var oScenario = oContext.getObject();

            sap.ui.require([
                "sap/m/Dialog", "sap/m/VBox", "sap/m/Text", "sap/m/Title",
                "sap/m/Button", "sap/m/ObjectStatus", "sap/m/ObjectNumber", "sap/m/Label",
                "sap/ui/layout/form/SimpleForm"
            ], function (Dialog, VBox, Text, Title, Button, ObjectStatus, ObjectNumber, Label, SimpleForm) {
                var oDialog = new Dialog({
                    title: "Scenario Details: " + oScenario.displayName,
                    contentWidth: "550px",
                    content: [
                        new SimpleForm({
                            editable: false,
                            layout: "ResponsiveGridLayout",
                            labelSpanL: 4,
                            labelSpanM: 4,
                            content: [
                                new Label({ text: "Name" }),
                                new Text({ text: oScenario.name }),

                                new Label({ text: "Display Name" }),
                                new Text({ text: oScenario.displayName }),

                                new Label({ text: "Status" }),
                                new ObjectStatus({
                                    text: oScenario.status,
                                    state: oScenario.status === "ACTIVE" ? "Success" : oScenario.status === "INACTIVE" ? "Error" : "Warning",
                                    inverted: true
                                }),

                                new Label({ text: "Source System" }),
                                new Text({ text: oScenario.sourceSystem || "-" }),

                                new Label({ text: "SAP Object Type" }),
                                new Text({ text: oScenario.sapObjectType || "-" }),

                                new Label({ text: "Rules Weight" }),
                                new ObjectNumber({ number: oScenario.rulesWeight, unit: "%" }),

                                new Label({ text: "AI Weight" }),
                                new ObjectNumber({ number: oScenario.aiWeight, unit: "%" }),

                                new Label({ text: "Approval Threshold" }),
                                new ObjectNumber({ number: oScenario.approvalThreshold }),

                                new Label({ text: "Review Threshold" }),
                                new ObjectNumber({ number: oScenario.reviewThreshold }),

                                new Label({ text: "Description" }),
                                new Text({ text: oScenario.description || "-" })
                            ]
                        })
                    ],
                    beginButton: new Button({
                        text: "Edit",
                        type: "Emphasized",
                        press: function () {
                            oDialog.close();
                            this._openScenarioEditDialog(oContext);
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

        _openScenarioEditDialog: function (oContext) {
            this._oConfigContext = oContext;
            var oData = oContext.getObject();
            var oEditModel = new JSONModel({
                name: oData.name,
                displayName: oData.displayName || oData.name,
                description: oData.description,
                status: oData.status,
                rulesWeight: oData.rulesWeight,
                aiWeight: oData.aiWeight,
                approvalThreshold: oData.approvalThreshold,
                reviewThreshold: oData.reviewThreshold
            });
            this.getView().setModel(oEditModel, "editScenario");

            if (!this._pEditDialog) {
                this._pEditDialog = this.loadFragment({
                    name: "decisioncore.scenarios.view.EditScenarioDialog"
                });
            }
            this._pEditDialog.then(function (oDialog) {
                oDialog.open();
            });
        },

        // ========================================
        // NEW: Toggle Scenario Status (Switch)
        // ========================================
        onToggleScenarioStatus: function (oEvent) {
            var bState = oEvent.getParameter("state");
            var oContext = oEvent.getSource().getBindingContext();
            var sNewStatus = bState ? "ACTIVE" : "INACTIVE";

            oContext.setProperty("status", sNewStatus);
            MessageToast.show("Scenario " + (bState ? "activated" : "deactivated"));
        },

        // ========================================
        // Status Change via Select Dropdown
        // ========================================
        onScenarioStatusChange: function (oEvent) {
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
        // Duplicate Single Scenario
        // ========================================
        onDuplicateScenario: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext();
            var oScenario = oContext.getObject();
            var that = this;
            var sNewName = oScenario.name + "_CP" + Date.now().toString().slice(-4);

            // Execute Bound Action "duplicate"
            var oModel = oContext.getModel();
            var oOperation = oModel.bindContext("DecisionService.duplicate(...)", oContext);

            oOperation.setParameter("newName", sNewName);

            oOperation.execute().then(function () {
                MessageToast.show("Scenario duplicated successfully");
                that.byId("scenariosTable").getBinding("items").refresh();
                that._loadStats();
            }).catch(function (err) {
                MessageBox.error("Error duplicating: " + err.message);
            });
        },

        // ========================================
        // Duplicate Selected Scenarios
        // ========================================
        onDuplicateSelectedScenarios: function () {
            var oTable = this.byId("scenariosTable");
            var aSelectedItems = oTable.getSelectedItems();

            if (aSelectedItems.length === 0) {
                MessageToast.show("No scenarios selected.");
                return;
            }

            var that = this;
            var oListBinding = oTable.getBinding("items");
            var aPromises = [];
            var iCount = 0;

            aSelectedItems.forEach(function (oItem) {
                var oScenario = oItem.getBindingContext().getObject();
                var oNewContext = oListBinding.create({
                    name: oScenario.name + "_CP" + Date.now().toString().slice(-4) + "_" + iCount,
                    displayName: oScenario.displayName + " (Copy)",
                    description: oScenario.description || "",
                    status: "DRAFT",
                    version: 1,
                    rulesWeight: oScenario.rulesWeight || 60,
                    aiWeight: oScenario.aiWeight || 40,
                    approvalThreshold: oScenario.approvalThreshold || 60,
                    reviewThreshold: oScenario.reviewThreshold || 40,
                    sourceSystem: oScenario.sourceSystem || "EXTERNAL",
                    sapObjectType: oScenario.sapObjectType || "CUSTOM",
                    allowSimulation: oScenario.allowSimulation !== false,
                    requireApproval: oScenario.requireApproval || false,
                    maxRetries: oScenario.maxRetries || 3,
                    timeoutMs: oScenario.timeoutMs || 30000
                });
                aPromises.push(oNewContext.created());
                iCount++;
            });

            Promise.all(aPromises).then(function () {
                MessageToast.show(aSelectedItems.length + " scenario(s) duplicated as Draft");
                that._loadStats();
            }).catch(function (err) {
                MessageBox.error("Error duplicating: " + err.message);
            });

            oTable.removeSelections();
        },

        // ========================================
        // Refresh
        // ========================================
        onRefresh: function () {
            this.getView().getModel().refresh();
            this._loadStats();
            MessageToast.show("Refreshed");
        }
    });
});
