Ext.define('Ext.form.field.Month', {
        extend: 'Ext.form.field.Date',
        alias: 'widget.monthfield',
        requires: ['Ext.picker.Month'],
        alternateClassName: ['Ext.form.MonthField', 'Ext.form.Month'],
        selectMonth: null,
        createPicker: function() {
            var me = this,
                format = Ext.String.format;
            return Ext.create('Ext.picker.Month', {
                pickerField: me,
                ownerCt: me.ownerCt,
                renderTo: document.body,
                floating: true,
                hidden: true,
                focusOnShow: true,
                minDate: me.minValue,
                maxDate: me.maxValue,
                disabledDatesRE: me.disabledDatesRE,
                disabledDatesText: me.disabledDatesText,
                disabledDays: me.disabledDays,
                disabledDaysText: me.disabledDaysText,
                format: me.format,
                showToday: me.showToday,
                startDay: me.startDay,
                minText: format(me.minText, me.formatDate(me.minValue)),
                maxText: format(me.maxText, me.formatDate(me.maxValue)),
                listeners: {
                    select: {
                        scope: me,
                        fn: me.onSelect
                    },
                    monthdblclick: {
                        scope: me,
                        fn: me.onOKClick
                    },
                    yeardblclick: {
                        scope: me,
                        fn: me.onOKClick
                    },
                    OkClick: {
                        scope: me,
                        fn: me.onOKClick
                    },
                    CancelClick: {
                        scope: me,
                        fn: me.onCancelClick
                    }
                },
                keyNavConfig: {
                    esc: function() {
                        me.collapse();
                    }
                }
            });
        },
        onCancelClick: function() {
            var me = this;
            me.selectMonth = null;
            me.collapse();
        },
        onOKClick: function() {
            var me = this;
            if (me.selectMonth) {
                me.setValue(me.selectMonth);
                me.fireEvent('select', me, me.selectMonth);
            }
            me.collapse();
        },
        onSelect: function(m, d) {
            var me = this;
            me.selectMonth = new Date((d[0] + 1) + '/1/' + d[1]);
        }
});

Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',


    _projectId: undefined,
    _releaseId: undefined,
    _releaseName: undefined,
    _releaseStartDate: undefined,
    _releaseEndDate: undefined,
    _initDate: undefined,
    _iterationId: undefined,
    _iterationName: undefined,
    _iterationStartDate: undefined,
    _iterationEndDate: undefined,
    _mapErrors: undefined, //project -> feature/defect/story -> errortype -> [artifacts];
    _exportData:undefined,
    _exportDataDetails:undefined,
    _exportButton:undefined,
    _exportButtonDetails:undefined,
    _includeInitiative:undefined,


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
        },
        {
            xtype:'container',
            itemId:'detailsContainerExport',
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

					this._releaseStartDate = Rally.util.DateTime.toIsoString(release.get('ReleaseStartDate'),true);
					this._releaseEndDate = Rally.util.DateTime.toIsoString(release.get('ReleaseDate'),true);
					this._releaseId = release.get('ObjectID');
					this._releaseName = combobox.getRecord().get('Name'); 
					console.log(release);
				},
				select: function(combobox, records) {
					var release = records[0];

					this._releaseStartDate = Rally.util.DateTime.toIsoString(release.get('ReleaseStartDate'),true);
                    this._releaseEndDate = Rally.util.DateTime.toIsoString(release.get('ReleaseDate'),true);
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

                    this._iterationStartDate = Rally.util.DateTime.toIsoString(iteration.get('StartDate'),true);
                    this._iterationEndDate = Rally.util.DateTime.toIsoString(iteration.get('EndDate'),true);
                	this._iterationId = iteration.get('ObjectID');
                	this._iterationName = iteration.get('Name');

                },
                select: function(combobox, records, opts) {
                    var iteration = records[0];

                    this._iterationStartDate = Rally.util.DateTime.toIsoString(iteration.get('StartDate'),true);
                    this._iterationEndDate = Rally.util.DateTime.toIsoString(iteration.get('EndDate'),true);
                	this._iterationId = iteration.get('ObjectID');
                	this._iterationName = iteration.get('Name');
                },
                scope: this
            }

        });


        var initDatePicker = Ext.create('Ext.form.field.Month', {
            fieldLabel: 'Choose month:',
            format: 'F, Y',
            listeners : {
                select: function(picker, date) {
                    //console.log('date', date);
                    //console.log(picker.selectMonth);
                    // first date of month
                    console.log(this._initDate);
                    this._initDate = date.toISOString();
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
        		this._doSearch(this._projectId, this._initDate);
        		//this._loadEndData(projectId, this._releaseId, null);
        	}
        });


        var includeInitiativeCheckBox = Ext.create('Rally.ui.CheckboxField', {
            id        : 'include',
            name      : 'include',
            fieldLabel      : 'Include Initiatives',
            padding: '0 10 0 0',                        
            inputValue: 'i',
            listeners: {
                change: function(field, newValue, oldValue) {
                    var include = newValue;
                    this._includeInitiative = include;
                },
                scope: this
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


        this._exportButtonDetails = Ext.create('Rally.ui.Button', {
            text: 'Export',
            margin: '10 10 10 10',
            scope: this,
            handler: function() {
                var csv = this._convertToCSV(this._exportDataDetails);
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

        this.down('#detailsContainerExport').add(this._exportButtonDetails);


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
	                    boxLabel  : 'By Month',
                        width: 80,
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

			            // console.log('value radio:', value);

			            if (value === 'r') {
			            	releaseComboBox.show();
			            	iterationComboBox.hide();
                            initDatePicker.hide();
			            } else if (value === 'i') {
			            	releaseComboBox.hide();
			            	iterationComboBox.show();
                            initDatePicker.hide();
			            } else if (value === 'a') {
			            	releaseComboBox.hide();
			            	iterationComboBox.hide();
                            initDatePicker.show();
			            }
			        },
                    afterrender: function(){
                       Ext.QuickTips.init();
                       Ext.QuickTips.register({
                         target: 'radio3',
                         text: 'Search for All option limited by 30 days',
                         width: 250,
                         dismissDelay: 2000
                       }) ;
                    },
                    destroy:function(){
                       Ext.QuickTips.destroy();
                    },
			        scope: this
			    },
	        }]
		},
		{
			xtype: 'panel',
			items: [
				releaseComboBox,
				iterationComboBox,
                initDatePicker,
                includeInitiativeCheckBox,
				searchButton,
				this._exportButton
			]
		}]);

		releaseComboBox.hide();
    	iterationComboBox.hide();
        initDatePicker.hide();
    	this._exportButton.hide();
        this._exportButtonDetails.hide();

    },

    _doSearch: function(projectId, initDate) {
    	this.down('#bodyContainer').removeAll(true);
    	this.down('#detailsContainer').removeAll(true);

    	this.myMask.show();
    	var artifactsPromise = this._loadStoriesAndFeatures();

    	Deft.Promise.all(artifactsPromise).then({
    		success: function(artifacts) {
    			// console.log('artifacts loaded:', artifacts);

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


    _loadStories: function() {
        console.log('loading stories:');
        var deferred = Ext.create('Deft.Deferred');

        var storiesStore = Ext.create('Rally.data.WsapiDataStore', {
            model: 'HierarchicalRequirement',
            context: {
                project: '/project/' + this._projectId, //null to search all workspace
                projectScopeUp: false,
                projectScopeDown: true,
            },
            fetch: ['Name', 
                    'FormattedID', 
                    'ScheduleState', 
                    'State', 
                    'Project', 
                    'AcceptedDate',
                    'c_ServiceLevelIdentifier',
                    'TestCases',
                    'Parent', 
                    'PlannedEndDate', 
                    'ActualEndDate',
                    'Release',
                    'ReleaseDate',
                    'CreationDate',
                    'Feature',
                    'PlanEstimate',
                    'TestCaseStatus',
                    'Iteration',
                    'EndDate',
                    'Requirement'],
            limit: Infinity,
            sorters: [{
                property: 'CreationDate',
                direction: 'ASC'
            }]
        });

        var filter = this._getFilter();
        if (filter) {
            storiesStore.addFilter(filter);
        }

        storiesStore.load().then({
            success: function(records) {
                this.stories = records;
                //console.log('Stories:', records);
                deferred.resolve(records);

            },
            scope: this
        });

        return deferred.promise;
    },


    _loadDefects: function() {
        console.log('loading defects:');
        var deferred = Ext.create('Deft.Deferred');

        var defectsStore = Ext.create('Rally.data.WsapiDataStore', {
            model: 'Defect',
            context: {
                project: '/project/' + this._projectId, //null to search all workspace
                projectScopeUp: false,
                projectScopeDown: true,
            },
            fetch: ['Name', 
                    'FormattedID', 
                    'ScheduleState', 
                    'State', 
                    'Project', 
                    'c_StrategyCategory', 
                    'AcceptedDate',
                    'c_ServiceLevelIdentifier',
                    'PreliminaryEstimate', 
                    'PreliminaryEstimateValue', 
                    'TestCases',
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
            sorters: [{
                property: 'CreationDate',
                direction: 'ASC'
            }]
        });

        var filter = this._getFilter();
        if (filter) {
            defectsStore.addFilter(filter);
        }

        defectsStore.load().then({
            success: function(records) {
                this.defects = records;
                //console.log('defects:', records);
                deferred.resolve(records);

            },
            scope: this
        });

        return deferred.promise;
    },


    _loadFeatures: function() {
        console.log('loading features:');
        var deferred = Ext.create('Deft.Deferred');

        var featuresStore = Ext.create('Rally.data.WsapiDataStore', {
            model: 'PortfolioItem/Feature',
            context: {
                project: '/project/' + this._projectId, //null to search all workspace
                projectScopeUp: false,
                projectScopeDown: true,
            },
            fetch: ['Name', 
                    'FormattedID', 
                    'ScheduleState', 
                    'State', 
                    'Project', 
                    'c_StrategyCategory', 
                    'AcceptedDate',
                    'c_ServiceLevelIdentifier',
                    'PreliminaryEstimate', 
                    'PreliminaryEstimateValue', 
                    'TestCases',
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
                    'Milestones'],
            limit: Infinity,
            sorters: [{
                property: 'CreationDate',
                direction: 'ASC'
            }]
        });

        var filter;
        if (this._searchParameter === 'i') {
            filter = this._getIterationFilterForFeatures();
        } else {
            filter = this._getFilter();
        }

        if (filter) {
            featuresStore.addFilter(filter);
        }

        console.log('filter', filter);
        //console.log('feature store', featuresStore);

        featuresStore.load().then({
            success: function(records) {
                this.features = records;
                //console.log('features:', records);
                deferred.resolve(records);

            },
            scope: this
        });

        return deferred.promise;
    },


    _loadInitiatives: function() {
        console.log('loading initiatives:');
        var deferred = Ext.create('Deft.Deferred');

        var initiativesStore = Ext.create('Rally.data.WsapiDataStore', {
            model: 'PortfolioItem/Initiative',
            context: {
                project: '/project/' + this._projectId, //null to search all workspace
                projectScopeUp: false,
                projectScopeDown: true,
            },
            fetch: ['Name', 
                    'FormattedID', 
                    'ScheduleState', 
                    'State', 
                    'Project', 
                    'c_StrategyCategory', 
                    'AcceptedDate',
                    'c_ServiceLevelIdentifier',
                    'PreliminaryEstimate', 
                    'PreliminaryEstimateValue', 
                    'TestCases',
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
                    'Milestones'],
            limit: Infinity,
            sorters: [{
                property: 'CreationDate',
                direction: 'ASC'
            }]
        });

        var filter = this._getFilterInitiative();
        if (filter) {
            initiativesStore.addFilter(filter);
        }

        initiativesStore.load().then({
            success: function(records) {
                this.initiatives = records;
                // console.log('Initiatives:', records);
                deferred.resolve(records);

            },
            error: function(error) {
                console.log('error', error);
            },
            scope: this
        });

        return deferred.promise;
    },


    _loadStoriesAndFeatures: function() {
    	console.log('loading features and stories');
        var deferred = Ext.create('Deft.Deferred');

        this._loadStories().then({
            success: function() {
                return this._loadDefects();
            }, scope: this
        }).then({
            success: function() {
                return this._loadFeatures();
            }, scope: this
        }).then({
            success: function() {
                var iLock;
                var allRecords = [];

                allRecords = allRecords.concat(this.stories);
                allRecords = allRecords.concat(this.defects);
                allRecords = allRecords.concat(this.features);


                // console.log('all Records:', allRecords);

                if (this._includeInitiative) {
                    iLock = this._loadInitiatives();
                } else {
                    iLock = Ext.create('Deft.Deferred');
                    iLock.resolve();
                }

                Deft.Promise.all([iLock]).then({
                    success: function(records) {
                        console.log('all Records:', allRecords);

                        if (this._includeInitiative) {
                            allRecords = allRecords.concat(this.initiatives);                            
                        }

                        // console.log('all records', allRecords);.

                        if (allRecords && allRecords.length > 0) {
                            var artPromises = [];

                            _.each(allRecords, function(artifact) {
                                if ('hierarchicalrequirement' === artifact.get('_type')) {

                                    var tcInfo = artifact.get('TestCases');
                                    var tcCount = tcInfo.Count;

                                    //console.log('before loading tc:', tcInfo);

                                    if (tcInfo && tcCount > 0) {
                                        var tcLock = Ext.create('Deft.Deferred');
                                        artPromises.push(tcLock);


                                        var tcPromise = this._loadTestCases(artifact);

                                        Deft.Promise.all(tcPromise).then({
                                            success: function(tcs) {
                                                //console.log('tcs loaded for:',tcInfo);

                                                artifact.get('TestCases')['data'] = tcs;
                                                //console.log('tcs attached: ', tcs);

                                                tcLock.resolve();
                                            },
                                            failure: function(error) {
                                                console.log('error:', error);
                                            },
                                            scope: this
                                        });
                                    }
                                }
                              
                            }, this);

                            //console.log('promises of stories loading TCs', artPromises);


                            //only if there is any TC to load
                            if (artPromises && artPromises.length > 0) {
                                Deft.Promise.all(artPromises).then({
                                    success: function() {
                                        console.log('all stories loaded with TC');

                                        deferred.resolve(allRecords);
                                        this.myMask.hide();
                                    },
                                    failure: function(error) {
                                        console.log('error:', error);
                                    },
                                    scope: this
                                });
                            } else {
                                deferred.resolve(allRecords);
                                this.myMask.hide();
                            }
                        } else {
                            this.myMask.hide();
                        }
                    },
                    failure: function(error) {
                        console.log('error:', error);
                    },
                    scope: this
                });
            }, scope: this
        });

        return deferred.promise;
    },


    _getFilter: function() {
        var filter;

        if (this._searchParameter === 'r') {
            filter = {
                property: 'Release.Name',
                operator: '=',
                value: this._releaseName
            };
        } else if (this._searchParameter === 'i') {
            filter = {
                property: 'Iteration.Name',
                operator: '=',
                value: this._iterationName
            };
        } else if (this._searchParameter === 'a') {
            //console.log('looking for all artifacts from aug 13 2017 until today');
            // filter = {
            //     property: 'CreationDate',
            //     operator: '>',
            //     value: '2017-08-13T00:00:00.000Z'
            // };        
            if (this._initDate) {
                console.log('looking for all artifacts from:', this._initDate);
                var initFilter = Ext.create('Rally.data.QueryFilter', {
                    property: 'CreationDate',
                    operator: '>',
                    value: this._initDate
                });

                var endDate = new Date(new Date(this._initDate).getFullYear(), new Date(this._initDate).getMonth() + 1, 0);

                console.log('end date:', endDate.toISOString());

                var endFilter = Ext.create('Rally.data.QueryFilter', {
                    property: 'CreationDate',
                    operator: '<=',
                    value: endDate.toISOString()
                });

                filter = initFilter.and(endFilter);
            }
        }
        
        return filter;
    },


    _getIterationFilterForFeatures: function() {
        var filter;
        initDate = this._iterationStartDate;
        endDate = this._iterationEndDate;

        var initFilter = Ext.create('Rally.data.QueryFilter', {
            property: 'CreationDate',
            operator: '>',
            value: initDate
        });

        var endFilter = Ext.create('Rally.data.QueryFilter', {
            property: 'CreationDate',
            operator: '<=',
            value: endDate
        });

        filter = initFilter.and(endFilter);

        return filter;
    },


    _getFilterInitiative: function() {
        var filter;
        if (this._includeInitiative && (this._searchParameter === 'r' || this._searchParameter === 'i')) {

            var initDate, endDate;
            if (this._searchParameter === 'r') {
                initDate = this._releaseStartDate;
                endDate = this._releaseEndDate;
            }

            if (this._searchParameter === 'i') {
                initDate = this._iterationStartDate;
                endDate = this._iterationEndDate;
            }

            var initFilter = Ext.create('Rally.data.QueryFilter', {
                property: 'CreationDate',
                operator: '>',
                value: initDate
            });

            var endFilter = Ext.create('Rally.data.QueryFilter', {
                property: 'CreationDate',
                operator: '<=',
                value: endDate
            });

            filter = initFilter.and(endFilter);
        } else {
            return this._getFilter();
        }

        return filter;
    },


    _generateGrid: function(dataMap) {
        var dataFeatures = [];
    	var dataInitiatives = [];
    	var dataStories = [];
    	var dataDefects = [];
    	this._exportData = [];

    	dataMap.eachKey(function(projectName, project) {
    		//exportData

            if (this._includeInitiative) {
        		this._exportData.push({
        			projectName: projectName,

                    initiativemissingStrategy: project.initiativeStatistics.missingStrategy,
                    initiativenotSizedCorrectly: project.initiativeStatistics.notSizedCorrectly,
                    initiativemissingPlannedEndDate: project.initiativeStatistics.missingPlannedEndDate,
                    initiativemissingActualEndDate: project.initiativeStatistics.missingActualEndDate,
                    initiativepercentAndStateMismatch: project.initiativeStatistics.percentAndStateMismatch,

    				featuremissingStrategy: project.featureStatistics.missingStrategy,
    				featurenotSizedCorrectly: project.featureStatistics.notSizedCorrectly,
    				featurenoParent: project.featureStatistics.noParent,
    				featuremissingPlannedEndDate: project.featureStatistics.missingPlannedEndDate,
    				featuremissingActualEndDate: project.featureStatistics.missingActualEndDate,
    				featurepercentAndStateMismatch: project.featureStatistics.percentAndStateMismatch,
    				featureoldReleaseNotDone: project.featureStatistics.oldReleaseNotDone,
    				featurestateDoneButNoRelease: project.featureStatistics.stateDoneButNoRelease,
                    featuremissingLevelIdentifier: project.featureStatistics.missingLevelIdentifier,

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
            } else {
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
                    featuremissingLevelIdentifier: project.featureStatistics.missingLevelIdentifier,

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
            }


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
                missingLevelIdentifier: project.featureStatistics.missingLevelIdentifier
			});


            if (this._includeInitiative) {
                dataInitiatives.push({
                    projectName: projectName, 
                    missingStrategy: project.initiativeStatistics.missingStrategy,
                    notSizedCorrectly: project.initiativeStatistics.notSizedCorrectly,
                    missingPlannedEndDate: project.initiativeStatistics.missingPlannedEndDate,
                    missingActualEndDate: project.initiativeStatistics.missingActualEndDate,
                    percentAndStateMismatch: project.initiativeStatistics.percentAndStateMismatch
                });
            }


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
			fields:['projectName', 'missingStrategy', 'notSizedCorrectly', 'noParent', 'missingPlannedEndDate', 'missingActualEndDate', 'percentAndStateMismatch', 'oldReleaseNotDone', 'stateDoneButNoRelease', 'missingLevelIdentifier'],
            data: dataFeatures
        });


        var initiativeStore = Ext.create('Ext.data.JsonStore', {
            fields:['projectName', 'missingStrategy', 'notSizedCorrectly', 'noParent', 'missingPlannedEndDate', 'missingActualEndDate', 'percentAndStateMismatch'],
            data: dataInitiatives
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
    		width: 500,
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

			        		// console.log(type, errorType);
			        		// console.log(this._mapErrors[projectName]);
			        		// console.log(this._mapErrors[projectName][type]);
			        		// console.log(this._mapErrors[projectName][type][errorType]);

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
                    flex: 1,
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
                    flex: 1,
                    tdCls: 'custom-features-notSizedCorrectly'
                },
                {
                    text: 'No Parent',
                    dataIndex: 'noParent',
                    flex: 1,
                    tdCls: 'custom-features-noParent'
                },
                {
                    text: 'Missing Planned End Date',
                    dataIndex: 'missingPlannedEndDate',
                    flex: 1,
                    tdCls: 'custom-features-missingPlannedEndDate'
                },
                {
                    text: 'Missing Actual End Date',
                    dataIndex: 'missingActualEndDate',
                    flex: 1,
                    tdCls: 'custom-features-missingActualEndDate'
                },
                {
                    text: '% & State Mismatched',
                    dataIndex: 'percentAndStateMismatch',
                    flex: 1,
                    tdCls: 'custom-features-percentAndStateMismatch'
                },
                {
                    text: 'Old release not done',
                    dataIndex: 'oldReleaseNotDone',
                    flex: 1,
                    tdCls: 'custom-features-oldReleaseNotDone'
                },
                {
                    text: 'Comp. miss Release',
                    dataIndex: 'stateDoneButNoRelease',
                    flex: 1,
                    tdCls: 'custom-features-stateDoneButNoRelease'
                },
                {
                    text: 'Missing Level Identifier',
                    dataIndex: 'missingLevelIdentifier',
                    flex: 1,
                    tdCls: 'custom-features-missingLevelIdentifier'
                }
            ]
        });


        var initiativesGrid;
        if (this._includeInitiative) {
            initiativesGrid = Ext.create('Ext.grid.Panel', {
                width: 450,
                itemId : 'initiativesGrid',
                cls: 'grid-header-project',
                store: initiativeStore,
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

                                // console.log(type, errorType);
                                // console.log(this._mapErrors[projectName]);
                                // console.log(this._mapErrors[projectName][type]);
                                // console.log(this._mapErrors[projectName][type][errorType]);

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
                        flex: 1,
                        tdCls: 'custom-initiatives-missingStrategy'
                    },
                    {
                        text: 'Not Sized Correctly',
                        dataIndex: 'notSizedCorrectly',
                        flex: 1,
                        tdCls: 'custom-initiatives-notSizedCorrectly'
                    },
                    {
                        text: 'Missing Planned End Date',
                        dataIndex: 'missingPlannedEndDate',
                        flex: 1,
                        tdCls: 'custom-initiatives-missingPlannedEndDate'
                    },
                    {
                        text: 'Missing Actual End Date',
                        dataIndex: 'missingActualEndDate',
                        flex: 1,
                        tdCls: 'custom-initiatives-missingActualEndDate'
                    },
                    {
                        text: '% & State Mismatched',
                        dataIndex: 'percentAndStateMismatch',
                        flex: 1,
                        tdCls: 'custom-initiatives-percentAndStateMismatch'
                    }
                ]
            });
        }


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

			        		// console.log(type, errorType);
			        		// console.log(this._mapErrors[projectName]);
			        		// console.log(this._mapErrors[projectName][type]);
			        		// console.log(this._mapErrors[projectName][type][errorType]);

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

			        		// console.log(type, errorType);
			        		// console.log(this._mapErrors[projectName]);
			        		// console.log(this._mapErrors[projectName][type]);
			        		// console.log(this._mapErrors[projectName][type][errorType]);

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
                    text: 'Iteration But No Release',
                    dataIndex: 'iterationButNoRelease',
                    tdCls: 'custom-defects-iterationButNoRelease',
                    flex: 2
                }
            ]
        });


		var featurePanel = Ext.create('Ext.panel.Panel', {
			width: 500,
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

        var initiativePanel;
        if (this._includeInitiative) {
            initiativePanel = Ext.create('Ext.panel.Panel', {
                width: 450,
                title: 'Initiatives Statistics',           
                autoScroll: true,
                padding: 5,
                layout: {
                    type: 'vbox',
                    align: 'stretch'
                },
                items: [
                    initiativesGrid
                ]
            });
        }

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
                initiativePanel,
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

    		// console.log('totalArtifacts to show:', artifacts);
	    	var localArtifacts = [];
            this._exportDataDetails = [];

	    	_.each(artifacts, function(record) {
	            var id = record.get('ObjectID');
	            var state = record.get('State');
	            var release = record.get('Release');
	            var iteration = record.get('Iteration');

	            var idUrl;
	            var parent;
	            if (record.get('_type') === 'portfolioitem/feature') {
	            	idUrl = '/portfolioitem/feature/';
	            	parent = record.get('Parent') ? record.get('Parent').FormattedID + ' - ' + record.get('Parent').Name : '';
	            	state = state ? state.Name : '';
	            } else if (record.get('_type') === 'hierarchicalrequirement') {
	            	idUrl = '/userstory/';
	            	parent = record.get('Feature') ? record.get('Feature').FormattedID + ' - ' + record.get('Feature').Name : '';
	            } else if (record.get('_type') === 'defect') {
	            	idUrl = '/defect/';
	            	parent = record.get('Requirement') ? record.get('Requirement').FormattedID + ' - ' + record.get('Requirement').Name : '';
	            } else if (record.get('_type') === 'portfolioitem/initiative') {
                    idUrl = '/portfolioitem/initiative/';
                    parent = record.get('Parent') ? record.get('Parent').FormattedID + ' - ' + record.get('Parent').Name : '';
                    state = state ? state.Name : '';
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

                this._exportDataDetails.push({
                    id: record.get('FormattedID'),
                    Name: record.get('Name'),
                    CreationDate: record.get('CreationDate'),
                    FormattedID: record.get('FormattedID'),
                    State: state,
                    ScheduleState: record.get('ScheduleState'),
                    Iteration: iteration ? iteration.Name : '',
                    Release: release ? release.Name : '',
                    Parent: parent,
                    PreliminaryEstimate: record.get('PreliminaryEstimateValue')
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
	    	this._exportButtonDetails.show();
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

        projects.add('Total', 
        {
            name: 'Total',
            artifacts: artifacts
        });

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
                    missingLevelIdentifier: []
            	}, 
                initiatives : {
                    missingStrategy: [],
                    notSizedCorrectly: [],
                    missingPlannedEndDate: [],
                    missingActualEndDate: [],
                    percentAndStateMismatch: []
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
            if (this._includeInitiative) {
	           project.initiativeStatistics = this._loadInitiativeStatistics(project, project.artifacts);
            }

	        project.storyStatistics = this._loadStoryStatistics(project, project.artifacts);
	        project.defectStatistics = this._loadDefectStatistics(project, project.artifacts);
		}, this);

    	//each team object have the iteration/release

    	//each iteration/release have errors

    	// console.log('projects with statistics:', projects);
    	// console.log('project error map:', this._mapErrors);

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
            missingLevelIdentifier: 0
    	};


    	_.each(artifacts, function(artifact) {
    		var type = artifact.get('_type');
            if (type === 'portfolioitem/feature') {
            	//check statistics

            	var percentDoneByStoryCount = artifact.get('PercentDoneByStoryCount');

            	var state = null;
            	if (artifact.get('State')) {
            		state = artifact.get('State').Name;
            	}

            	var releaseDate = null;
            	if (artifact.get('Release')) {
            		releaseDate = new Date(artifact.get('Release').ReleaseDate);
            	}

                var preliValues = ['XS', 'S', 'M', 'L', 'XL'];
                var preliminaryEstimate = null;
                if (artifact.get('PreliminaryEstimate')) {
                    preliminaryEstimate = artifact.get('PreliminaryEstimate').Name;
                }

            	if (!artifact.get('c_StrategyCategory')) {
            		statistics.missingStrategy += 1;
            		this._mapErrors[projectName].features.missingStrategy.push(artifact);
            	}

            	if (!preliminaryEstimate || (preliValues.indexOf(preliminaryEstimate) === -1)) {
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

            	if (!artifact.get('ActualEndDate') && ((state === 'Staging') || (state === 'Done'))) {
                    console.log(artifact, artifact.get('ActualEndDate'));
            		statistics.missingActualEndDate +=1;
            		this._mapErrors[projectName].features.missingActualEndDate.push(artifact);
            	}

            	if (    ( ((percentDoneByStoryCount > 0) && (percentDoneByStoryCount < 1)) && (state !== "In-Progress") ) ||
            			( (percentDoneByStoryCount === 1) && ((state !== "Done") && (state !== "Staging")) ) ||
            			( (percentDoneByStoryCount === 0) && ((state !== "Elaborating") && (state !== "Exploring") && (state !== null)) )
            		) {
            		statistics.percentAndStateMismatch += 1;
            		this._mapErrors[projectName].features.percentAndStateMismatch.push(artifact);
            	}


				//oldReleaseNotDone
				var today = new Date();
            	if (releaseDate && (releaseDate < today) && ((state !== "Done") && (state !== "Staging")) ) {
					statistics.oldReleaseNotDone += 1;
					this._mapErrors[projectName].features.oldReleaseNotDone.push(artifact);
            	}

            	if (!artifact.get('Release') && ((state === "Done") || (state === "Staging")) ) {
            		statistics.stateDoneButNoRelease +=1;
            		this._mapErrors[projectName].features.stateDoneButNoRelease.push(artifact);
            	}

                var levelIdentifier = artifact.get('c_ServiceLevelIdentifier');
                if (releaseDate && (releaseDate > new Date('2018-11-15T00:00:00.000Z')) && !levelIdentifier)  {
                    statistics.missingLevelIdentifier +=1;
                    this._mapErrors[projectName].features.missingLevelIdentifier.push(artifact);
                }


            	// if ((artifact.creationDate < "2018-01-01T00:00:00.000Z") && (state != "Done")) {
            	// 	statistics.agingReport +=1;
            	// 	this._mapErrors[projectName].features.agingReport.push(artifact);
            	// }
            }            
        }, this);

    	return statistics;
    },


    _loadInitiativeStatistics: function(project, artifacts) {
        var projectName = project.name;
        console.log('extracting statistics for initiatives of project:', projectName);

        var statistics = {
            missingStrategy: 0,
            notSizedCorrectly: 0,
            missingPlannedEndDate: 0,
            missingActualEndDate: 0,
            percentAndStateMismatch: 0,
        };


        _.each(artifacts, function(artifact) {
            var type = artifact.get('_type');
            if (type === 'portfolioitem/initiative') {
                //check statistics

                var percentDoneByStoryCount = artifact.get('PercentDoneByStoryCount');

                var state = null;
                if (artifact.get('State')) {
                    state = artifact.get('State').Name;
                }

                var releaseDate = null;
                if (artifact.get('Release')) {
                    releaseDate = new Date(artifact.get('Release').ReleaseDate);
                }

                var preliValues = ['XS', 'S', 'M', 'L', 'XL'];
                var preliminaryEstimate = null;
                if (artifact.get('PreliminaryEstimate')) {
                    preliminaryEstimate = artifact.get('PreliminaryEstimate').Name;
                }

                if (!artifact.get('c_StrategyCategory')) {
                    statistics.missingStrategy += 1;
                    this._mapErrors[projectName].initiatives.missingStrategy.push(artifact);
                }

                if (!preliminaryEstimate || (preliValues.indexOf(preliminaryEstimate) === -1)) {
                    statistics.notSizedCorrectly += 1;
                    this._mapErrors[projectName].initiatives.notSizedCorrectly.push(artifact);
                }

                if (!artifact.get('PlannedEndDate')) {
                    statistics.missingPlannedEndDate +=1;
                    this._mapErrors[projectName].initiatives.missingPlannedEndDate.push(artifact);
                }

                if (!artifact.get('ActualEndDate') && ((state === 'Staging') || (state === 'Done'))) {
                    console.log(artifact, artifact.get('ActualEndDate'));
                    statistics.missingActualEndDate +=1;
                    this._mapErrors[projectName].initiatives.missingActualEndDate.push(artifact);
                }

                if (    ( ((percentDoneByStoryCount > 0) && (percentDoneByStoryCount < 1)) && (state !== "In-Progress") ) ||
                        ( (percentDoneByStoryCount === 1) && ((state !== "Done") && (state !== "Staging")) ) ||
                        ( (percentDoneByStoryCount === 0) && ((state !== "Elaborating") && (state !== "Exploring") && (state !== null)) )
                    ) {
                    statistics.percentAndStateMismatch += 1;
                    this._mapErrors[projectName].initiatives.percentAndStateMismatch.push(artifact);
                }
            }            
        }, this);

        return statistics;
    },

	
	_loadStoryStatistics: function(project, artifacts) {

        //TODO  Need to create a Deferred object and return
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
            if (type === 'hierarchicalrequirement') {

            	var parent = artifact.get('Feature');
            	var planEstimate = artifact.get('PlanEstimate');
                var creationDate = artifact.get('CreationDate');
            	var acceptedDate = artifact.get('AcceptedDate');
            	var planValues = [0, 1, 2, 3, 5, 8];
            	//var testCaseStatus = artifact.get('TestCaseStatus');
            	var scheduleState = artifact.get('ScheduleState');

            	var iterationEndDate = null;
            	if (artifact.get('Iteration')) {
            		iterationEndDate = new Date(artifact.get('Iteration').EndDate);
            	}

            	if (!parent && creationDate > new Date('2017-08-13T00:00:00.000Z')) {
					statistics.noParent += 1;
					this._mapErrors[projectName].stories.noParent.push(artifact);
            	}

            	if ( (planValues.indexOf(planEstimate) === -1) && (creationDate > new Date('2017-08-13T00:00:00.000Z')) ) {
            		statistics.notSizedCorrectly += 1;
            		this._mapErrors[projectName].stories.notSizedCorrectly.push(artifact);
            	}


                if (acceptedDate >= new Date("2019-01-01T00:00:00.000Z")) {
                    var tcInfo = artifact.get('TestCases');
                    var tcCount = tcInfo.Count;

                    //console.log('tcInfo:', tcInfo);

                    if (!tcInfo || tcCount === 0) {
                        statistics.noTestCases += 1;
                        this._mapErrors[projectName].stories.noTestCases.push(artifact);

                    } else {
                        if (tcInfo && tcCount > 0 && artifact.get('TestCases').data) {
                            var testCases = artifact.get('TestCases').data;
                            //console.log('testCases from artifact:', testCases, artifact);


                            var correctType = false;

                            var i = 0;
                            while (i < testCases.length && !correctType) {
                                var type = testCases[i].get('Type');

                                if ('Acceptance Criteria' === type) {
                                    correctType = true;
                                }

                                i++;
                            }
                            
                            if (!correctType) {
                                statistics.noTestCases += 1;
                                this._mapErrors[projectName].stories.noTestCases.push(artifact);
                            }
                        }
                    }
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
            if (type === 'defect') {

            	var creationDate = artifact.get('CreationDate');
            	var planEstimate = artifact.get('PlanEstimate');
            	var scheduleState = artifact.get('ScheduleState');
            	var resolution = artifact.get('Resolution');
            	var iteration = artifact.get('Iteration');
            	var release = artifact.get('Release');
            	var state = artifact.get('State');
                var environment = artifact.get('Environment');

            	var planValues = [0, 1, 2, 3, 5, 8];
            	var today = new Date();

            	if (iteration) {
                    var iterationEndDate = new Date(iteration.EndDate);
                    if ((scheduleState !== 'Accepted' && scheduleState !== "Ready to Ship") && (iterationEndDate < today) && (creationDate > new Date('2017-08-13T00:00:00.000Z'))) {
                        statistics.oldIterationNotAccepted += 1;
                        this._mapErrors[projectName].defects.oldIterationNotAccepted.push(artifact);
	            	}
	            }

            	if ( !artifact.get('Requirement') && creationDate > new Date("2017-08-13T00:00:00.000Z") ) {
            		statistics.noParent += 1;
            		this._mapErrors[projectName].defects.noParent.push(artifact);
            	}

            	if ( (planValues.indexOf(planEstimate) === -1) && (creationDate > new Date('2017-08-13T00:00:00.000Z')) ) {
            		statistics.notSizedCorrectly += 1;
            		this._mapErrors[projectName].defects.notSizedCorrectly.push(artifact);
            	}

            	if ((!environment || environment === 'None') && creationDate > new Date("2017-08-13T00:00:00.000Z") ) {
            		statistics.noEnvironment += 1;
            		this._mapErrors[projectName].defects.noEnvironment.push(artifact);
            		// console.log("Environment", artifact);
            	}

            	if ( (scheduleState === "Accepted" || scheduleState === "Ready to Ship") && (!resolution || resolution === 'None') && (creationDate > new Date("2017-08-13T00:00:00.000Z")) ) {
            		statistics.noResolution += 1;
            		this._mapErrors[projectName].defects.noResolution.push(artifact);
            		// console.log("Resolution", artifact);
            	}

            	if ( (scheduleState === "Accepted" || scheduleState === "Ready to Ship") && artifact.get('c_RootCause').Count === 0 ) {

                    //console.log("no root cause", artifact);
                    if (this._searchParameter === 'a') {
                        //console.log("no root parameter a, filter:", this._initDate);

                        var filterDate = this._initDate; 
                        
                        if (creationDate > new Date(filterDate)) {
                            //console.log("no root cause using filter");
                            statistics.rootCause += 1;
                            this._mapErrors[projectName].defects.rootCause.push(artifact);
                        }                        
                    } else {
                        //console.log("no root parameter no filter:");

                        statistics.rootCause += 1;
                        this._mapErrors[projectName].defects.rootCause.push(artifact);
                    }

            		// console.log("rootCause", artifact);
            	}

            	if ( artifact.get('Milestones').Count === 0 &&
            			(scheduleState === "Accepted" || scheduleState === "Ready to Ship") &&
            			(state === "Closed") &&
            			(resolution === "Code Change" || resolution === "Configuration Change" || resolution === "Database Change" || resolution === "Deployment Issue") &&
            			(creationDate > new Date("2017-08-13T00:00:00.000Z") )

            		) {
            		// console.log('Milestones', artifact);
            		this._mapErrors[projectName].defects.noMilestone.push(artifact);
            		statistics.noMilestone += 1;
            	}

            	if ( ((scheduleState === "Accepted" || scheduleState === 'Ready to Ship')  && (state !== "Closed" && state !== "Cancel")) || 
                        ((scheduleState !== "Accepted" && scheduleState !== 'Ready to Ship') && state === "Closed") && 
                        (creationDate > new Date("2017-08-13T00:00:00.000Z"))
            		) {
            		// console.log('state mismatched', artifact);
            		this._mapErrors[projectName].defects.mismatchStateAndSchedule.push(artifact);
            		statistics.mismatchStateAndSchedule += 1;
            	}

        		if (scheduleState !== 'Unelaborated' && !iteration && (creationDate > new Date("2017-08-13T00:00:00.000Z"))) {
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


    _loadTestCases: function(story) {
        var deferred = Ext.create('Deft.Deferred');
        //console.log('loading tc for story:', story);

        story.getCollection('TestCases').load({
            fetch: ['Type'],
            callback: function(records, operation, success) {
                //console.log('TestCase loaded:', records);
                deferred.resolve(records);                
            }
        });                    

        return deferred.promise;

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
