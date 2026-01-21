sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/Text",
    "sap/m/Label",
    "sap/m/VBox",
    "sap/m/Title",
    "sap/m/TextArea",
    "sap/ui/core/library"
], function (Controller, Filter, FilterOperator, JSONModel, MessageToast, Dialog, Button, Text, Label, VBox, Title, TextArea, coreLibrary) {
    "use strict";

    return Controller.extend("decisioncore.history.controller.List", {
        onInit: function () {
            // Initialize stats model
            var oStatsModel = new JSONModel({
                totalRecords: 0,
                approved: 0,
                rejected: 0,
                review: 0,
                avgTime: 0
            });
            this.getView().setModel(oStatsModel, "stats");

            // Load stats after view is rendered
            this.getView().attachAfterRendering(this._loadStats.bind(this));
        },

        _loadStats: function () {
            var oTable = this.byId("historyTable");
            if (oTable) {
                var oBinding = oTable.getBinding("items");
                if (oBinding) {
                    oBinding.attachDataReceived(function () {
                        this._calculateStats();
                    }.bind(this));
                }
            }
        },

        _calculateStats: function () {
            var oTable = this.byId("historyTable");
            var oBinding = oTable.getBinding("items");
            var iCount = oBinding.getLength();

            var oStatsModel = this.getView().getModel("stats");
            oStatsModel.setProperty("/totalRecords", iCount);
            oStatsModel.setProperty("/approved", "-");
            oStatsModel.setProperty("/rejected", "-");
            oStatsModel.setProperty("/review", "-");
            oStatsModel.setProperty("/avgTime", "-");
        },

        onRefresh: function () {
            var oTable = this.byId("historyTable");
            if (oTable && oTable.getBinding("items")) {
                oTable.getBinding("items").refresh();
            }
            MessageToast.show("Refreshed");
        },

        onSearch: function (oEvent) {
            var sQuery = oEvent.getParameter("query") || oEvent.getParameter("newValue") || "";
            var aFilters = [];
            if (sQuery) {
                aFilters.push(new Filter("scenarioName", FilterOperator.Contains, sQuery));
            }
            var oTable = this.byId("historyTable");
            if (oTable && oTable.getBinding("items")) {
                oTable.getBinding("items").filter(aFilters);
            }
        },

        onSort: function () {
            MessageToast.show("Sort functionality");
        },

        onFilter: function () {
            MessageToast.show("Filter functionality");
        },

        // ========================================
        // EXPORT FUNCTIONALITY
        // ========================================
        _getExportColumns: function () {
            var oResourceBundle = this.getView().getModel("i18n").getResourceBundle();
            return [
                { label: oResourceBundle.getText("colTimestamp"), property: "decidedAt", type: "DateTime" },
                { label: oResourceBundle.getText("colScenario"), property: "scenarioName" },
                { label: "Correlation ID", property: "correlationId" },
                { label: oResourceBundle.getText("colMode"), property: "executionMode" },
                { label: oResourceBundle.getText("colDecision"), property: "finalDecision" },
                { label: oResourceBundle.getText("colScore"), property: "finalScore", type: "Number" },
                { label: oResourceBundle.getText("colDuration"), property: "processingTimeMs", type: "Number" },
                { label: oResourceBundle.getText("colStatus"), property: "status" },
                { label: "Explanation", property: "explanation" }
            ];
        },

        _getTableData: function () {
            var oTable = this.byId("historyTable");
            var oBinding = oTable.getBinding("items");
            var aContexts = oBinding.getContexts(0, oBinding.getLength());
            var aData = [];

            aContexts.forEach(function (oContext) {
                if (oContext) {
                    aData.push(oContext.getObject());
                }
            });

            return aData;
        },

        onExportExcel: function () {
            var that = this;
            sap.ui.require(["sap/ui/export/Spreadsheet"], function (Spreadsheet) {
                var oResourceBundle = that.getView().getModel("i18n").getResourceBundle();
                var aData = that._getTableData();

                if (aData.length === 0) {
                    MessageToast.show(oResourceBundle.getText("noData"));
                    return;
                }

                var oSettings = {
                    workbook: {
                        columns: that._getExportColumns(),
                        context: {
                            sheetName: "Decision History"
                        }
                    },
                    dataSource: aData,
                    fileName: "DecisionHistory_" + new Date().toISOString().slice(0, 10) + ".xlsx",
                    worker: false
                };

                var oSheet = new Spreadsheet(oSettings);
                oSheet.build().then(function () {
                    MessageToast.show("Excel export completed");
                }).catch(function (oError) {
                    MessageToast.show("Export failed: " + oError.message);
                }).finally(function () {
                    oSheet.destroy();
                });
            }, function (oError) {
                // Fallback if sap.ui.export is not available
                that._exportCSVFallback();
            });
        },

        onExportCSV: function () {
            this._exportCSVFallback();
        },

        _exportCSVFallback: function () {
            var oResourceBundle = this.getView().getModel("i18n").getResourceBundle();
            var aData = this._getTableData();

            if (aData.length === 0) {
                MessageToast.show(oResourceBundle.getText("noData"));
                return;
            }

            var aColumns = this._getExportColumns();
            var aHeaders = aColumns.map(function (col) { return col.label; });
            var aRows = aData.map(function (item) {
                return aColumns.map(function (col) {
                    var value = item[col.property];
                    if (value === null || value === undefined) return "";
                    // Escape quotes and wrap in quotes if contains comma
                    var sValue = String(value);
                    if (sValue.indexOf(",") > -1 || sValue.indexOf('"') > -1 || sValue.indexOf("\n") > -1) {
                        sValue = '"' + sValue.replace(/"/g, '""') + '"';
                    }
                    return sValue;
                }).join(",");
            });

            var sCSV = aHeaders.join(",") + "\n" + aRows.join("\n");
            var oBlob = new Blob(["\uFEFF" + sCSV], { type: "text/csv;charset=utf-8" });
            var sFileName = "DecisionHistory_" + new Date().toISOString().slice(0, 10) + ".csv";

            // Download
            var oLink = document.createElement("a");
            oLink.href = URL.createObjectURL(oBlob);
            oLink.download = sFileName;
            document.body.appendChild(oLink);
            oLink.click();
            document.body.removeChild(oLink);

            MessageToast.show("CSV export completed");
        },

        // ========================================
        // DETAIL DIALOG
        // ========================================
        onPressItem: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext();

            if (!this._oDialog) {
                this._oDialog = new Dialog({
                    title: "{i18n>auditDetails}",
                    contentWidth: "650px",
                    draggable: true,
                    resizable: true,
                    content: [
                        new VBox({
                            class: "sapUiSmallMargin",
                            items: [
                                new Title({ text: "{i18n>scenarioInfo}", level: "H3", titleStyle: "H4" }),
                                new Label({ text: "{i18n>scenarioName}", design: "Bold", class: "sapUiTinyMarginTop" }),
                                new Text({ text: "{scenarioName}" }),
                                new Label({ text: "{i18n>correlationId}", design: "Bold", class: "sapUiTinyMarginTop" }),
                                new Text({ text: "{correlationId}" }),

                                new Title({ text: "{i18n>decisionOutcome}", level: "H3", titleStyle: "H4", class: "sapUiMediumMarginTop" }),
                                new Label({ text: "{i18n>finalDecision}", design: "Bold", class: "sapUiTinyMarginTop" }),
                                new Text({ text: "{finalDecision} (Score: {finalScore})" }),
                                new Label({ text: "{i18n>explanation}", design: "Bold", class: "sapUiTinyMarginTop" }),
                                new Text({ text: "{explanation}" }),

                                new Title({ text: "{i18n>technicalPayload}", level: "H3", titleStyle: "H4", class: "sapUiMediumMarginTop" }),
                                new Label({ text: "{i18n>rulesFired}", design: "Bold", class: "sapUiTinyMarginTop" }),
                                new TextArea({ value: "{rulesFired}", rows: 4, width: "100%", editable: false, growing: true }),
                                new Label({ text: "{i18n>inputPayload}", design: "Bold", class: "sapUiTinyMarginTop" }),
                                new TextArea({ value: "{inputPayload}", rows: 6, width: "100%", editable: false, growing: true })
                            ]
                        })
                    ],
                    endButton: new Button({
                        text: "{i18n>close}",
                        press: function () {
                            this._oDialog.close();
                        }.bind(this)
                    })
                });
                this.getView().addDependent(this._oDialog);
            }

            this._oDialog.setBindingContext(oContext);
            this._oDialog.open();
        }
    });
});
