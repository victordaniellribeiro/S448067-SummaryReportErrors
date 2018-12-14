Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',


    _projectId: undefined,
    _releaseId: undefined,
    _releaseName: undefined,
    _iterationId: undefined,
    _iterationName: undefined,
    _mapErrors: undefined, //project -> feature/defect/story -> errortype -> [artifacts];
    _exportData:undefined,
    _exportButton:undefined,

	items:[
        {
            xtype:'container',
            itemId:'header',
            cls:'header'
        },
        {
            xtype:'container',
            itemId:'bodyContainer',
			width:'100%',
			autoScroll:true
        },
        {
            xtype:'container',
            itemId:'detailsContainer',
			width:'100%',
			autoScroll:true
        }
    ],


    launch: function() {
        //Write app code here

        //API Docs: https://help.rallydev.com/apps/2.1/doc/


        var context =  this.getContext();
        var project = context.getProject()['ObjectID'];
        this._projectId = project;

        console.log('Project:', this._projectId);

        var releaseComboBox = Ext.create('Rally.ui.combobox.ReleaseComboBox', {
			fieldLabel: 'Choose Release',
			width: 400,
			itemId: 'releasaeComboBox',
			allowClear: true,
			showArrows: false,
			scope: this,
			listeners: {
				ready: function(combobox) {
					var release = combobox.getRecord();

					//this._initDate = Rally.util.DateTime.toIsoString(release.get('ReleaseStartDate'),true);
					//this._endDate = Rally.util.DateTime.toIsoString(release.get('ReleaseDate'),true);
					this._releaseId = release.get('ObjectID');
					this._releaseName = combobox.getRecord().get('Name'); 
					console.log(release);
				},
				select: function(combobox, records) {
					var release = records[0];

					//this._initDate = Rally.util.DateTime.toIsoString(release.get('ReleaseStartDate'),true);
					//this._endDate = Rally.util.DateTime.toIsoString(release.get('ReleaseDate'),true);
					this._releaseId = release.get('ObjectID');
					this._releaseName = combobox.getRecord().get('Name');  
					this._releaseDate = release.get('ReleaseDate');
				},
				scope: this
			}
		});

		var iterationComboBox = Ext.create('Rally.ui.combobox.IterationComboBox', {
			fieldLabel: 'Choose Iteration',
			width: 400,
            itemId: 'iterationComboBox',
            allowClear: true,
            showArrows: false,
            scope: this,
            listeners: {
                ready: function(combobox) {
                	var iteration = combobox.getRecord();
                	this._iterationId = iteration.get('ObjectID');
                	this._iterationName = iteration.get('Name');

                },
                select: function(combobox, records, opts) {
                    var iteration = records[0];
                	this._iterationId = iteration.get('ObjectID');
                	this._iterationName = iteration.get('Name');
                },
                scope: this
            }

        });

        var searchButton = Ext.create('Rally.ui.Button', {
        	text: 'Search',
        	margin: '10 10 10 100',
        	scope: this,
        	handler: function() {
        		//handles search
        		//console.log(initDate, endDate);
        		this._doSearch(this._projectId, this._initDate, this._endDate);
        		//this._loadEndData(projectId, this._releaseId, null);
        	}
        });

        this._exportButton = Ext.create('Rally.ui.Button', {
        	text: 'Export',
        	margin: '10 10 10 10',
        	scope: this,
        	handler: function() {
        		var csv = this._convertToCSV(this._exportData);
        		console.log('converting to csv:', csv);


        		//Download the file as CSV
		        var downloadLink = document.createElement("a");
		        var blob = new Blob(["\ufeff", csv]);
		        var url = URL.createObjectURL(blob);
		        downloadLink.href = url;
		        downloadLink.download = "report-errors.csv";  //Name the file here
		        document.body.appendChild(downloadLink);
		        downloadLink.click();
		        document.body.removeChild(downloadLink);
        	}
        });


        this.myMask = new Ext.LoadMask({
            msg: 'Please wait...',
            target: this
        });



        this.down('#header').add([
		{
			xtype: 'panel',
			autoWidth: true,
			height: 50,
			layout: 'hbox',

			items: [{
	            xtype      : 'radiogroup',
	            fieldLabel : 'Choose parameter',
	            items: [
	                {
	                	xtype	  : 'radiofield',				            
	                    id        : 'radio1',
	                    name      : 'parameter',
	                    boxLabel  : 'Release',
	                    padding: '0 10 0 0',				            
	                    inputValue: 'r'
	                }, {
	                    boxLabel  : 'Iteration',
	                    name      : 'parameter',
	                    padding: '0 10 0 0',			            
	                    inputValue: 'i',
	                    id        : 'radio2'
	                }, {
	                    boxLabel  : 'All',
	                    name      : 'parameter',
	                    padding: '0 10 0 0',			            
	                    inputValue: 'a',
	                    id        : 'radio3'
	                }
	            ],
	            listeners: {
			        change: function(field, newValue, oldValue) {
			            var value = newValue.parameter;
			            this._searchParameter = value;

			            console.log('value radio:', value);

			            if (value == 'r') {
			            	releaseComboBox.show();
			            	iterationComboBox.hide();
			            } else if (value == 'i') {
			            	releaseComboBox.hide();
			            	iterationComboBox.show();
			            } else if (value == 'a') {
			            	releaseComboBox.hide();
			            	iterationComboBox.hide();
			            }
			        },
			        scope: this
			    }
	        }]
		},
		{
			xtype: 'panel',
			items: [
				releaseComboBox,
				iterationComboBox,
				searchButton,
				this._exportButton
			]
		}]);

		releaseComboBox.hide();
    	iterationComboBox.hide();
    	this._exportButton.hide();

    },

    _doSearch: function() {
    	this.down('#bodyContainer').removeAll(true);
    	this.down('#detailsContainer').removeAll(true);

    	this.myMask.show();
    	var artifactsPromise = this._loadStoriesAndFeatures();

    	Deft.Promise.all(artifactsPromise).then({
    		success: function(artifacts) {
    			console.log('artifacts loaded:', artifacts);

    			var dataMap = this._loadData(artifacts);

    			this._generateGrid(dataMap);
    			this._exportButton.show();
    		},
    		failure: function(error) {
                console.log('error:', error);
            },
            scope: this
    	});
    },


    _loadStoriesAndFeatures: function() {
    	console.log('loading features and stories');
        var deferred = Ext.create('Deft.Deferred');

        var filter = undefined;

        if (this._searchParameter == 'r') {
        	filter = {
                property: 'Release.Name',
                operator: '=',
                value: this._releaseName
            };
        } else if (this._searchParameter == 'i') {
        	filter = {
                property: 'Iteration.Name',
                operator: '=',
                value: this._iterationName
            };
        } else if (this._searchParameter == 'a') {
        	console.log('looking for all artifacts from aug 13 2017 until today');
        	filter = {
        		property: 'CreationDate',
        		operator: '>',
        		value: '2017-08-13T00:00:00.000Z'
        	};

        }

        var featureStore = Ext.create('Rally.data.wsapi.artifact.Store', {
            models: ['HierarchicalRequirement', 'PortfolioItem/Feature', 'Defect'],
            fetch: ['Name', 
            		'FormattedID', 
            		'ScheduleState', 
            		'State', 
            		'Project', 
            		'c_StrategyCategory', 
            		'PreliminaryEstimate', 
            		'PreliminaryEstimateValue', 
            		'Parent', 
            		'PlannedEndDate', 
            		'ActualEndDate',
            		'PercentDoneByStoryCount',
            		'Release',
            		'ReleaseDate',
            		'CreationDate',
            		'Feature',
            		'PlanEstimate',
            		'TestCaseStatus',
            		'Iteration',
            		'EndDate',
            		'Requirement',
            		'Environment',
            		'c_RootCause',
            		'Milestones',
            		'Resolution',
            		],
            limit: Infinity,
            context: {
                project: '/project/' + this._projectId, //null to search all workspace
                projectScopeUp: false,
                projectScopeDown: true,
            },
            filters: [filter],
            sorters: [{
                property: 'CreationDate',
                direction: 'ASC'
            }]
        });


        featureStore.load().then({
			success: function(records) {
				//console.log('records', records);

                deferred.resolve(records);
    			this.myMask.hide();				
			},
			scope: this
		});

        return deferred.promise;
    },


    _generateGrid: function(dataMap) {
    	var dataFeatures = [];
    	var dataStories = [];
    	var dataDefects = [];
    	this._exportData = [];

    	dataMap.eachKey(function(projectName, project) {
    		//exportData
    		this._exportData.push({
    			projectName: projectName, 
				featuremissingStrategy: project.featureStatistics.missingStrategy,
				featurenotSizedCorrectly: project.featureStatistics.notSizedCorrectly,
				featurenoParent: project.featureStatistics.noParent,
				featuremissingPlannedEndDate: project.featureStatistics.missingPlannedEndDate,
				featuremissingActualEndDate: project.featureStatistics.missingActualEndDate,
				featurepercentAndStateMismatch: project.featureStatistics.percentAndStateMismatch,
				featureoldReleaseNotDone: project.featureStatistics.oldReleaseNotDone,
				featurestateDoneButNoRelease: project.featureStatistics.stateDoneButNoRelease,
				featureagingReport: project.featureStatistics.agingReport,
 
				storynotSizedCorrectly: project.storyStatistics.notSizedCorrectly,
				storynoParent: project.storyStatistics.noParent,
				storynoTestCases: project.storyStatistics.noTestCases,
				storyiterationButNoRelease: project.storyStatistics.iterationButNoRelease,
				storyreleaseButNoIteration: project.storyStatistics.releaseButNoIteration,
				storyoldIterationNotAccepted: project.storyStatistics.oldIterationNotAccepted,

				defectnoParent: project.defectStatistics.noParent,
				defectnotSizedCorrectly: project.defectStatistics.notSizedCorrectly,
				defectnoEnvironment: project.defectStatistics.noEnvironment,
				defectnoResolution: project.defectStatistics.noResolution,
				defectrootCause: project.defectStatistics.rootCause,
				defectnoMilestone: project.defectStatistics.noMilestone,
				defectoldIterationNotAccepted: project.defectStatistics.oldIterationNotAccepted,
				defectmismatchStateAndSchedule: project.defectStatistics.mismatchStateAndSchedule,
				defectmissingIteration: project.defectStatistics.missingIteration,
				defectiterationButNoRelease: project.defectStatistics.iterationButNoRelease
    		});


    		dataFeatures.push({
    			projectName: projectName, 
				missingStrategy: project.featureStatistics.missingStrategy,
				notSizedCorrectly: project.featureStatistics.notSizedCorrectly,
				noParent: project.featureStatistics.noParent,
				missingPlannedEndDate: project.featureStatistics.missingPlannedEndDate,
				missingActualEndDate: project.featureStatistics.missingActualEndDate,
				percentAndStateMismatch: project.featureStatistics.percentAndStateMismatch,
				oldReleaseNotDone: project.featureStatistics.oldReleaseNotDone,
				stateDoneButNoRelease: project.featureStatistics.stateDoneButNoRelease,
				agingReport: project.featureStatistics.agingReport
			});

			dataStories.push({
    			projectName: projectName, 
				notSizedCorrectly: project.storyStatistics.notSizedCorrectly,
				noParent: project.storyStatistics.noParent,
				noTestCases: project.storyStatistics.noTestCases,
				iterationButNoRelease: project.storyStatistics.iterationButNoRelease,
				releaseButNoIteration: project.storyStatistics.releaseButNoIteration,
				oldIterationNotAccepted: project.storyStatistics.oldIterationNotAccepted
			});

			dataDefects.push({
    			projectName: projectName, 
				noParent: project.defectStatistics.noParent,
				notSizedCorrectly: project.defectStatistics.notSizedCorrectly,
				noEnvironment: project.defectStatistics.noEnvironment,
				noResolution: project.defectStatistics.noResolution,
				rootCause: project.defectStatistics.rootCause,
				noMilestone: project.defectStatistics.noMilestone,
				oldIterationNotAccepted: project.defectStatistics.oldIterationNotAccepted,
				mismatchStateAndSchedule: project.defectStatistics.mismatchStateAndSchedule,
				missingIteration: project.defectStatistics.missingIteration,
				iterationButNoRelease: project.defectStatistics.iterationButNoRelease,
			});
		}, this);


		var featureStore = Ext.create('Ext.data.JsonStore', {
			fields:['projectName', 'missingStrategy', 'notSizedCorrectly', 'noParent', 'missingPlannedEndDate', 'missingActualEndDate', 'percentAndStateMismatch', 'oldReleaseNotDone', 'stateDoneButNoRelease', 'agingReport'],
            data: dataFeatures
        });

        var storyStore = Ext.create('Ext.data.JsonStore', {
			fields:['projectName', 'notSizedCorrectly', 'noParent', 'noTestCases', 'iterationButNoRelease', 'releaseButNoIteration', 'oldIterationNotAccepted'],
            data: dataStories
        });

        var defectStore = Ext.create('Ext.data.JsonStore', {
			fields:['projectName', 'noParent', 'notSizedCorrectly', 'noResolution', 'noEnvironment', 'rootCause', 'noMilestone', 'oldIterationNotAccepted', 'mismatchStateAndSchedule', 'missingIteration', 'iterationButNoRelease'],
            data: dataDefects
        });


        var featuresGrid = Ext.create('Ext.grid.Panel', {
    		width: 600,
    		itemId : 'featuresGrid',
    		cls: 'grid-header-project',
    		store: featureStore,
    		viewConfig : {
    			enableTextSelection: true
    		},
    		listeners: {
				cellclick: function(table, td, cellIndex, record) {
					// console.log('cell td', td);
					// console.log('cell cellIndex', cellIndex);
					// console.log('cell record', record);
					// console.log('cell tr', tr);
					// console.log('cell rowIndex', rowIndex);
					// console.log('cell e', e);


					// console.log('searching', record.get('projectName'), td.className.split(' '));

					var projectName = record.get('projectName');

					_.each(_.uniq(td.className.split(' ')), function(cls) {
			        	if (cls.startsWith('custom')) {
			        		var type = cls.split(/[-]/)[1];
			        		var errorType = cls.split(/[-]/)[2];

			        		console.log(type, errorType);
			        		console.log(this._mapErrors[projectName]);
			        		console.log(this._mapErrors[projectName][type]);
			        		console.log(this._mapErrors[projectName][type][errorType]);

			        		this._showDetailsGrid(this._mapErrors[projectName][type][errorType]);
			        	}
			        }, this);
				},
				scope: this
			},

    		columns: [
                {
                    //text: 'Project Name',
                    dataIndex: 'projectName',
                    flex: 3
                },
                {
                    text: 'Missing Strategy', 
                    dataIndex: 'missingStrategy',
                    flex: 2,
                    tdCls: 'custom-features-missingStrategy'
                    // renderer: function(value, metaData, record, rowIndex, colIndex, store, view) {
                    // 	console.log(value, metaData, record);
                    // 	console.log(value, metaData, record);

                    // 	return value;
                    // }
                },
                {
                    text: 'Not Sized Correctly',
                    dataIndex: 'notSizedCorrectly',
                    flex: 2,
                    tdCls: 'custom-features-notSizedCorrectly'
                },
                {
                    text: 'No Parent',
                    dataIndex: 'noParent',
                    flex: 2,
                    tdCls: 'custom-features-noParent'
                },
                {
                    text: 'Missing Planned End Date',
                    dataIndex: 'missingPlannedEndDate',
                    flex: 2,
                    tdCls: 'custom-features-missingPlannedEndDate'
                },
                {
                    text: 'Missing Actual End Date',
                    dataIndex: 'missingActualEndDate',
                    flex: 2,
                    tdCls: 'custom-features-missingActualEndDate'
                },
                {
                    text: '% & State Mismatched',
                    dataIndex: 'percentAndStateMismatch',
                    flex: 2,
                    tdCls: 'custom-features-percentAndStateMismatch'
                },
                {
                    text: 'Old release not done',
                    dataIndex: 'oldReleaseNotDone',
                    flex: 2,
                    tdCls: 'custom-features-oldReleaseNotDone'
                },
                {
                    text: 'Comp. miss Release',
                    dataIndex: 'stateDoneButNoRelease',
                    flex: 2,
                    tdCls: 'custom-features-stateDoneButNoRelease'
                },
                {
                    text: 'Aging Report',
                    dataIndex: 'agingReport',
                    flex: 2,
                    tdCls: 'custom-features-agingReport'
                }
            ]
        });


        var storiesGrid = Ext.create('Ext.grid.Panel', {
    		width: 450,
    		itemId : 'storiesGrid',
    		cls: 'grid-header-project',
    		store: storyStore,
    		viewConfig : {
    			enableTextSelection: true
    		},
    		listeners: {
				cellclick: function(table, td, cellIndex, record, tr, rowIndex, e) {

					var projectName = record.get('projectName');

					_.each(_.uniq(td.className.split(' ')), function(cls) {
			        	if (cls.startsWith('custom')) {
			        		var type = cls.split(/[-]/)[1];
			        		var errorType = cls.split(/[-]/)[2];

			        		console.log(type, errorType);
			        		console.log(this._mapErrors[projectName]);
			        		console.log(this._mapErrors[projectName][type]);
			        		console.log(this._mapErrors[projectName][type][errorType]);

			        		this._showDetailsGrid(this._mapErrors[projectName][type][errorType]);
			        	}
			        }, this);
				},
				scope: this
			},

    		columns: [
                {
                    dataIndex: 'projectName',
                    flex: 3
                },
                {
                    text: 'No Parent', 
                    dataIndex: 'noParent',
                    tdCls: 'custom-stories-noParent',
                    flex: 2
                },
                {
                    text: 'Not Sized Correctly',
                    dataIndex: 'notSizedCorrectly',
                    tdCls: 'custom-stories-notSizedCorrectly',
                    flex: 2
                },
                {
                    text: 'Story No Test Case',
                    dataIndex: 'noTestCases',
                    tdCls: 'custom-stories-noTestCases',
                    flex: 2
                },
                {
                    text: 'Iteration No Release',
                    dataIndex: 'iterationButNoRelease',
                    tdCls: 'custom-stories-iterationButNoRelease',
                    flex: 2
                },
                {
                    text: 'Release No iteration',
                    dataIndex: 'releaseButNoIteration',
                    tdCls: 'custom-stories-releaseButNoIteration',
                    flex: 2
                },
                {
                    text: 'Old iteration Not Accpeted',
                    dataIndex: 'oldIterationNotAccepted',
                    tdCls: 'custom-stories-oldIterationNotAccepted',
                    flex: 2
                }
            ]
        });


        var defectsGrid = Ext.create('Ext.grid.Panel', {
    		width: 600,
    		itemId : 'defectsGrid',
    		cls: 'grid-header-project',
    		store: defectStore,
    		viewConfig : {
    			enableTextSelection: true
    		},
    		listeners: {
				cellclick: function(table, td, cellIndex, record) {

					var projectName = record.get('projectName');

					_.each(_.uniq(td.className.split(' ')), function(cls) {
			        	if (cls.startsWith('custom')) {
			        		var type = cls.split(/[-]/)[1];
			        		var errorType = cls.split(/[-]/)[2];

			        		console.log(type, errorType);
			        		console.log(this._mapErrors[projectName]);
			        		console.log(this._mapErrors[projectName][type]);
			        		console.log(this._mapErrors[projectName][type][errorType]);

			        		this._showDetailsGrid(this._mapErrors[projectName][type][errorType]);
			        	}
			        }, this);
				},
				scope: this
			},

    		columns: [
                {
                    dataIndex: 'projectName',
                    flex: 3
                },
                {
                    text: 'No Parent', 
                    dataIndex: 'noParent',
                    tdCls: 'custom-defects-noParent',
                    flex: 2
                },
                {
                    text: 'Not Sized Correctly',
                    dataIndex: 'notSizedCorrectly',
                    tdCls: 'custom-defects-notSizedCorrectly',
                    flex: 2
                },
                {
                    text: 'No Environment',
                    dataIndex: 'noEnvironment',
                    tdCls: 'custom-defects-noEnvironment',
                    flex: 2
                },
                {
                    text: 'No Resolution',
                    dataIndex: 'noResolution',
                    tdCls: 'custom-defects-noResolution',
                    flex: 2
                },
                {
                    text: 'No Root Cause',
                    dataIndex: 'rootCause',
                    tdCls: 'custom-defects-rootCause',
                    flex: 2
                },
                {
                    text: 'No Milestone',
                    dataIndex: 'noMilestone',
                    tdCls: 'custom-defects-noMilestone',
                    flex: 2
                },
                {
                    text: 'Old Iteration not Accepted',
                    dataIndex: 'oldIterationNotAccepted',
                    tdCls: 'custom-defects-oldIterationNotAccepted',
                    flex: 2
                },
                {
                    text: 'Mismatch State Schedule State',
                    dataIndex: 'mismatchStateAndSchedule',
                    tdCls: 'custom-defects-mismatchStateAndSchedule',
                    flex: 2
                },
                {
                    text: 'Missing Iteration',
                    dataIndex: 'missingIteration',
                    tdCls: 'custom-defects-missingIteration',
                    flex: 2
                },
                {
                    text: 'iterationButNoRelease',
                    dataIndex: 'iterationButNoRelease',
                    tdCls: 'custom-defects-iterationButNoRelease',
                    flex: 2
                }
            ]
        });


		var featurePanel = Ext.create('Ext.panel.Panel', {
			width: 680,
			title: 'Features Statistics',			
			autoScroll: true,
			padding: 5,
            layout: {
				type: 'vbox',
				align: 'stretch'
			},
            items: [
                featuresGrid
            ]
        });

        var storyPanel = Ext.create('Ext.panel.Panel', {
			width: 450,
			title: 'Story Statistics',			
			autoScroll: true,
			padding: 5,
            layout: {
				type: 'vbox',
				align: 'stretch'
			},
            items: [
                storiesGrid
            ]
        });

        var defectPanel = Ext.create('Ext.panel.Panel', {
			width: 680,
			title: 'Defect Statistics',			
			autoScroll: true,
			padding: 5,
            layout: {
				type: 'vbox',
				align: 'stretch'
			},
            items: [
                defectsGrid
            ]
        });

        var mainPanel = Ext.create('Ext.panel.Panel', {
			//width: 805,
			//title: 'Release Story Statistics',			
			autoScroll: true,
            layout: {
				type: 'hbox',
				align: 'stretch',
				padding: 5
			},
            padding: 5,            
            items: [
                featurePanel,
                storyPanel,
                defectPanel
            ]
        });

		this.down('#bodyContainer').add(mainPanel);
    },


    _showDetailsGrid: function(artifacts) {
    	this.down('#detailsContainer').removeAll(true);

    	if (artifacts && artifacts.length > 0) {

    		console.log('totalArtifacts to show:', artifacts);
	    	var localArtifacts = [];

	    	_.each(artifacts, function(record) {
	            var id = record.get('ObjectID');
	            var state = record.get('State');
	            var release = record.get('Release');
	            var iteration = record.get('Iteration');

	            var idUrl;
	            var parent;
	            if (record.get('_type') == 'portfolioitem/feature') {
	            	idUrl = '/portfolioitem/feature/';
	            	parent = record.get('Parent') ? record.get('Parent').FormattedID + ' - ' + record.get('Parent').Name : '';
	            	state = state ? state.Name : '';
	            } else if (record.get('_type') == 'hierarchicalrequirement') {
	            	idUrl = '/userstory/';
	            	parent = record.get('Feature') ? record.get('Feature').FormattedID + ' - ' + record.get('Feature').Name : '';
	            } else if (record.get('_type') == 'defect') {
	            	idUrl = '/defect/';
	            	parent = record.get('Requirement') ? record.get('Requirement').FormattedID + ' - ' + record.get('Requirement').Name : '';
	            }

	            localArtifacts.push({
	                _ref: idUrl + id,
	                Name: record.get('Name'),
	                CreationDate: record.get('CreationDate'),
	                FormattedID: record.get('FormattedID'),
	                State: state,
	                ScheduleState: record.get('ScheduleState'),
	                Iteration: iteration ? iteration.Name : '',
	                Release: release ? release.Name : '',
	                Parent: parent,
	                PreliminaryEstimate: record.get('PreliminaryEstimate')
	            });
	        }, this);



	    	var myStore = Ext.create('Rally.data.custom.Store', {
	            data: localArtifacts,
	            pageSize: 1000
	        });


	    	var grid = Ext.create('Rally.ui.grid.Grid', {
				showRowActionsColumn: false,
				showPagingToolbar: false,
				enableEditing: false,
	    		itemId : 'detailsGrid',
	    		id : 'detailsGrid',
	    		store: myStore,
	    		columnCfgs: [
	                {
	                	xtype: 'templatecolumn',
	                    text: 'ID', 
	                    dataIndex: 'FormattedID',
	                    tdCls: 'x-change-cell',
	                    tpl: Ext.create('Rally.ui.renderer.template.FormattedIDTemplate')
	                },
	                {
	                    text: 'Name', 
	                    dataIndex: 'Name',
	                    flex: 2
	                },
	                {
	                    text: 'Parent',
	                    dataIndex: 'Parent',
	                    flex: 1
	                },
	                {
	                    text: 'Iteration',
	                    dataIndex: 'Iteration',
	                },
	                {
	                    text: 'Release',
	                    dataIndex: 'Release',
	                },
	                {
	                    text: 'State', 
	                    dataIndex: 'State',
	                },
	                {
	                    text: 'Schedule State', 
	                    dataIndex: 'ScheduleState',
	                },
	                {
	                    text: 'Creation Date',
	                    dataIndex: 'CreationDate',
	                    xtype: 'datecolumn',
	                    format   : 'm/d/Y',
	                }
	            ]
	        });

	        var detailsPanel = Ext.create('Ext.panel.Panel', {
				// width: 680,
				// title: 'Features Statistics',			
				autoScroll: true,
				padding: 5,
	            layout: {
					type: 'vbox',
					align: 'stretch'
				},
	            items: [
	                grid
	            ]
	        });

	    	this.down('#detailsContainer').add(detailsPanel);
	    }
    },


    _loadData: function(artifacts) {
    	//each artifact,
    	var projects = new Ext.util.MixedCollection();
    	this._mapErrors = {};

    	_.each(artifacts, function(artifact) {
            var projectName = artifact.get('Project').Name;
            var project;

            if (!projects.containsKey(projectName)) {
            	project = {
            		name: projectName,
            		artifacts: []
            	};

            	project.artifacts.push(artifact);
            	projects.add(projectName, project);
            } else {
            	project = projects.get(projectName);
            	project.artifacts.push(artifact);
            }
            
        }, this);

    	console.log('all projects:', projects);


    	projects.eachKey(function(projectName, project) {
    		var projectErrorContainer = {
            	projectName: projectName,

            	features : {
            		missingStrategy: [],
		    		notSizedCorrectly: [],
		    		noParent: [],
		    		missingPlannedEndDate: [],
		    		missingActualEndDate: [],
		    		percentAndStateMismatch: [],
		    		oldReleaseNotDone: [],
		    		stateDoneButNoRelease: [],
		    		agingReport: []
            	}, 
            	stories : {
            		noParent: [],
		    		notSizedCorrectly: [],
		    		noTestCases: [],
		    		iterationButNoRelease: [],
		    		releaseButNoIteration: [],
		    		oldIterationNotAccepted: []
            	}, 
            	defects : {
            		oldIterationNotAccepted: [],
		    		noParent: [],
		    		notSizedCorrectly: [],
		    		noEnvironment: [],
		    		noResolution: [],
		    		rootCause: [],
		    		noMilestone: [],
		    		mismatchStateAndSchedule: [],
		    		missingIteration: [],
		    		iterationButNoRelease: []
            	}, 
            };

            this._mapErrors[projectName] = projectErrorContainer;
    	}, this);


    	projects.eachKey(function(projectName, project) {

	        project.featureStatistics = this._loadFeatureStatistics(project, project.artifacts);
	        project.storyStatistics = this._loadStoryStatistics(project, project.artifacts);
	        project.defectStatistics = this._loadDefectStatistics(project, project.artifacts);
		}, this);

    	//each team object have the iteration/release

    	//each iteration/release have errors

    	console.log('projects with statistics:', projects);
    	console.log('project error map:', this._mapErrors);

    	return projects;
    },


    _loadFeatureStatistics: function(project, artifacts) {
    	var projectName = project.name;
    	console.log('extracting statistics for features of project:', projectName);

    	var statistics = {
    		missingStrategy: 0,
    		notSizedCorrectly: 0,
    		noParent: 0,
    		missingPlannedEndDate: 0,
    		missingActualEndDate: 0,
    		percentAndStateMismatch: 0,
    		oldReleaseNotDone: 0,
    		stateDoneButNoRelease: 0,
    		agingReport: 0
    	};


    	_.each(artifacts, function(artifact) {
    		var type = artifact.get('_type');
            if (type == 'portfolioitem/feature') {
            	//check statistics

            	var percentDoneByStoryCount = artifact.get('PercentDoneByStoryCount');

            	var state = null;
            	if (artifact.get('State')) {
            		state = artifact.get('State').Name;
            	}

            	var releaseDate = null;
            	if (artifact.get('Release')) {
            		releaseDate = artifact.get('Release').ReleaseDate;
            	}

            	if (!artifact.get('c_StrategyCategory')) {
            		statistics.missingStrategy += 1;
            		this._mapErrors[projectName].features.missingStrategy.push(artifact);
            	}

            	if (!artifact.get('PreliminaryEstimate')) {
            		statistics.notSizedCorrectly += 1;
            		this._mapErrors[projectName].features.notSizedCorrectly.push(artifact);
            	}

            	if (!artifact.get('Parent')) {
            		statistics.noParent +=1;
            		this._mapErrors[projectName].features.noParent.push(artifact);
            	}

            	if (!artifact.get('PlannedEndDate')) {
            		statistics.missingPlannedEndDate +=1;
            		this._mapErrors[projectName].features.missingPlannedEndDate.push(artifact);
            	}

            	if (!artifact.get('ActualEndDate')) {
            		statistics.missingActualEndDate +=1;
            		this._mapErrors[projectName].features.missingActualEndDate.push(artifact);
            	}

            	if ( ((percentDoneByStoryCount > 0) && (percentDoneByStoryCount < 1) && (state !== "In-Progress")) ||
            			( (percentDoneByStoryCount = 1) && (state !== "Done") && (state !== "Staging") ) ||
            			( (state !== "Elaborating") && (state !== "Exploring") && (state !== null) && (percentDoneByStoryCount = 0) )
            		) {
            		statistics.percentAndStateMismatch += 1;
            		this._mapErrors[projectName].features.percentAndStateMismatch.push(artifact);
            	}


				//oldReleaseNotDone
				var today = new Date();
            	if ( (releaseDate < today) && (state !== "Done") && (state !== "Staging") ) {
					statistics.oldReleaseNotDone += 1;
					this._mapErrors[projectName].features.oldReleaseNotDone.push(artifact);
            	}

            	if (!artifact.get('Release') && ((state === "Done") || (state === "Staging")) ) {
            		statistics.stateDoneButNoRelease +=1;
            		this._mapErrors[projectName].features.stateDoneButNoRelease.push(artifact);
            	}


            	if ((artifact.creationDate < "2018-01-01T00:00:00.000Z") && (state != "Done")) {
            		statistics.agingReport +=1;
            		this._mapErrors[projectName].features.agingReport.push(artifact);
            	}
            }            
        }, this);

    	return statistics;
    },

	
	_loadStoryStatistics: function(project, artifacts) {
		var projectName = project.name;
		console.log('extracting statistics for stories of project:', projectName);
		var statistics = {
    		noParent: 0,
    		notSizedCorrectly: 0,
    		noTestCases: 0,
    		iterationButNoRelease: 0,
    		releaseButNoIteration: 0,
    		oldIterationNotAccepted: 0
    	};
    	

    	_.each(artifacts, function(artifact) {
            var type = artifact.get('_type');
            if (type == 'hierarchicalrequirement') {

            	var parent = artifact.get('Feature');
            	var planEstimate = artifact.get('PlanEstimate');
            	var creationDate = artifact.get('CreationDate');
            	var planValues = [0, 1, 2, 3, 5, 8];
            	var testCaseStatus = artifact.get('TestCaseStatus');
            	var scheduleState = artifact.get('ScheduleState');

            	var iterationEndDate = null;
            	if (artifact.get('Iteration')) {
            		iterationEndDate = artifact.get('Iteration').EndDate;
            	}

            	if (!parent && creationDate > new Date('2017-08-13T00:00:00.000Z')) {
					statistics.noParent += 1;
					this._mapErrors[projectName].stories.noParent.push(artifact);
            	}

            	if ( (planValues.indexOf(planEstimate) === -1) && (creationDate > new Date('2017-08-13T00:00:00.000Z')) ) {
            		statistics.notSizedCorrectly += 1;
            		this._mapErrors[projectName].stories.notSizedCorrectly.push(artifact);
            	}

            	if ( (testCaseStatus === "NONE") && 
            			(creationDate > new Date("2018-01-01T00:00:00.000Z")) && 
            			((scheduleState  === "Accepted") || (scheduleState === "Ready to Ship") || (scheduleState === "Completed") || (scheduleState === "In-Progress")) ) {
            		statistics.noTestCases += 1;
            		this._mapErrors[projectName].stories.noTestCases.push(artifact);
            	}

            	if (!artifact.get('Release') && artifact.get('Iteration') && creationDate > new Date('2017-08-13T00:00:00.000Z')) {
            		statistics.iterationButNoRelease += 1;
            		this._mapErrors[projectName].stories.iterationButNoRelease.push(artifact);
            	}

            	if (artifact.get('Release') && !artifact.get('Iteration') && creationDate > new Date('2017-08-13T00:00:00.000Z')) {
            		statistics.releaseButNoIteration += 1;
            		this._mapErrors[projectName].stories.releaseButNoIteration.push(artifact);
            	}

            	var today = new Date();
            	if (artifact.get('Iteration')) {
	            	if ((scheduleState !== "Accepted" && scheduleState !== "Ready to Ship") && (iterationEndDate < today) && (creationDate > new Date('2017-08-13T00:00:00.000Z'))) {
	            		statistics.oldIterationNotAccepted += 1;
	            		this._mapErrors[projectName].stories.oldIterationNotAccepted.push(artifact);
	            	}            		
            	}
            }
        }, this);

    	return statistics;
    },


    _loadDefectStatistics: function(project, artifacts) {
    	var projectName = project.name;
    	console.log('extracting statistics for defects of project:', projectName);
    	var statistics = {
    		oldIterationNotAccepted: 0,
    		noParent: 0,
    		notSizedCorrectly: 0,
    		noEnvironment: 0,
    		noResolution: 0,
    		rootCause: 0,
    		noMilestone: 0,
    		mismatchStateAndSchedule: 0,
    		missingIteration: 0,
    		iterationButNoRelease: 0
    	};

    	_.each(artifacts, function(artifact) {
            var type = artifact.get('_type');
            if (type == 'defect') {

            	var creationDate = artifact.get('CreationDate');
            	var planEstimate = artifact.get('PlanEstimate');
            	var scheduleState = artifact.get('ScheduleState');
            	var resolution = artifact.get('Resolution');
            	var iteration = artifact.get('Iteration');
            	var release = artifact.get('Release');
            	var state = artifact.get('State');

            	var planValues = [0, 1, 2, 3, 5, 8];
            	var today = new Date();

            	if (iteration) {
	            	if ((scheduleState !== 'Accepted') && (iteration.EndDate < today) && (creationDate > new Date('2017-08-13T00:00:00.000Z'))) {
	            		statistics.oldIterationNotAccepted += 1;
	            		this._mapErrors[projectName].defects.oldIterationNotAccepted.push(artifact);
	            	}
	            }

            	if ( !artifact.get('Requirement') && creationDate > new Date("2017-08-13T00:00:00.000Z") ) {
            		statistics.noParent += 1;
            		this._mapErrors[projectName].defects.noParent.push(artifact);
            	}

            	if ( (planValues.indexOf(planEstimate) == -1) && (creationDate > new Date('2017-08-13T00:00:00.000Z')) ) {
            		statistics.notSizedCorrectly += 1;
            		this._mapErrors[projectName].defects.notSizedCorrectly.push(artifact);
            	}

            	if ( !artifact.get('Environment') && creationDate > new Date("2017-08-13T00:00:00.000Z") ) {
            		statistics.noEnvironment += 1;
            		this._mapErrors[projectName].defects.noEnvironment.push(artifact);
            		console.log("Environment", artifact);
            	}

            	if ( (scheduleState === "Accepted" || scheduleState === "Ready to Ship") && !artifact.get('Resolution') && (creationDate > new Date("2017-08-13T00:00:00.000Z")) ) {
            		statistics.noResolution += 1;
            		this._mapErrors[projectName].defects.noResolution.push(artifact);
            		console.log("Resolution", artifact);
            	}

            	if ( (scheduleState === "Accepted" || scheduleState === "Ready to Ship") && !artifact.get('c_RootCause') && (creationDate > new Date("2017-08-13T00:00:00.000Z")) ) {
            		statistics.rootCause += 1;
            		this._mapErrors[projectName].defects.rootCause.push(artifact);
            		console.log("rootCause", artifact);
            	}

            	if ( !artifact.get('Milestones') &&
            			(scheduleState === "Accepted" || scheduleState === "Ready to Ship") &&
            			(state == "Closed") &&
            			(resolution == "Code Change" || resolution == "Configuration Change" || resolution == "Database Change" || resolution == "Deployment Issue") &&
            			(creationDate > new Date("2017-08-13T00:00:00.000Z") )

            		) {
            		console.log('Milestones', artifact);
            		this._mapErrors[projectName].defects.noMilestone.push(artifact);
            		statistics.noMilestone += 1;
            	}

            	if ( ((scheduleState == "Accepted" || scheduleState == 'Ready to Ship')  && (state != "Closed" && state != "Cancel")) 
            			|| ((scheduleState != "Accepted" && scheduleState != 'Ready to Ship') && state == "Closed") 
            			&& (creationDate > new Date("2017-08-13T00:00:00.000Z"))
            		) {
            		console.log('state mismatched', artifact);
            		this._mapErrors[projectName].defects.mismatchStateAndSchedule.push(artifact);
            		statistics.mismatchStateAndSchedule += 1;
            	}

        		if (scheduleState != 'Unelaborated' && !iteration && (creationDate > new Date("2017-08-13T00:00:00.000Z"))) {
        			this._mapErrors[projectName].defects.missingIteration.push(artifact);
            		statistics.missingIteration += 1;
        		}

        		if (!release && iteration && (creationDate > new Date("2017-08-13T00:00:00.000Z"))) {
        			this._mapErrors[projectName].defects.iterationButNoRelease.push(artifact);
        			statistics.iterationButNoRelease += 1;
        		}
            }
        }, this);

    	return statistics;
    },


    _convertToCSV: function(objArray) {
		var fields = Object.keys(objArray[0]);

		var replacer = function(key, value) { return value === null ? '' : value; };
		var csv = objArray.map(function(row){
		  return fields.map(function(fieldName) {
		    return JSON.stringify(row[fieldName], replacer);
		  }).join(',');
		});

		csv.unshift(fields.join(',')); // add header column

		//console.log(csv.join('\r\n'));

		return csv.join('\r\n');
    }

});
