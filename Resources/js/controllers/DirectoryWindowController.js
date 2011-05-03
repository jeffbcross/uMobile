/*
 * Licensed to Jasig under one or more contributor license
 * agreements. See the NOTICE file distributed with this work
 * for additional information regarding copyright ownership.
 * Jasig licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file
 * except in compliance with the License. You may obtain a
 * copy of the License at:
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on
 * an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/**
 * settings_window.js contains setup information for the
 * user settings tab.
 */

Ti.API.info("Directory Window Opened");

(function () {
    var win = Titanium.UI.currentWindow, app = win.app, self = {}, directoryProxy = app.models.directoryProxy,
        // Data and variables
        peopleResult = [], defaultTableData, viewBottom, //Used for absolute positioning of new elements at the bottom of the view.
        contactDetailViewOptions, searchBarOptions,
        //UI Elements
        peopleGroup, titleBar, searchBar, noSearchResultsSection, noSearchResultsRow, contentScrollView, peopleListTable, emergencyContactSection, phoneDirectorySection, phoneDirectoryRow, contactDetailView, activityIndicator,
        //Methods
        searchSubmit, openContactDetail, blurSearch, displaySearchResults,
        //Event Handlers
        onSearchCancel, onPhoneDirectoryClick, onSearchSubmit, onSearchChange, onContactRowClick, onWindowBlur, onProxySearching, onProxySearchComplete, onProxySearchError;
    
    self.init = function () {
        Ti.API.debug("DirectoryWindowController.init()");
        checkNetwork();
        
        Ti.App.addEventListener('showWindow', onWindowBlur);
        
        viewBottom = 0;
        
        //Create a title bar from the generic title bar partial view
        titleBar = new win.app.views.GenericTitleBar({
            app: app,
            title: app.localDictionary.directory,
            homeButton: true,
            settingsButton: false,
            windowKey: win.key
        });
        win.add(titleBar);
        viewBottom += app.styles.titleBar.height;

        searchBarOptions = app.styles.searchBar;
        searchBarOptions.top = viewBottom;
        searchBarOptions.hintText = app.localDictionary.directorySearchHintText;
        //Create and add a search bar at the top of the table to search for contacts
        searchBar = Titanium.UI.createSearchBar(searchBarOptions);
        win.add(searchBar);
        viewBottom += searchBarOptions.height;
        
        searchBar.addEventListener('cancel', onSearchCancel);
        searchBar.addEventListener('return', onSearchSubmit);
        searchBar.addEventListener('change', onSearchChange);

        //Create an array to hold the initial data passed into the Directory
        //Initial Data includes phone directory and emergency contacts
        defaultTableData = [];
        
        Ti.API.info("Emergency Contacts? " + directoryProxy.getEmergencyContacts());
        //Create a section to display emergency contact numbers
        if(directoryProxy.getEmergencyContacts().length > 0) {
            emergencyContactSection = Titanium.UI.createTableViewSection();
            emergencyContactSection.headerTitle =  app.localDictionary.emergencyContacts;
            for (var i=0, iLength = directoryProxy.getEmergencyContacts().length; i<iLength; i++) {
                var _contact = directoryProxy.getEmergencyContacts()[i],
                _emergencyContactRow = Titanium.UI.createTableViewRow({
                    title: _contact.displayName[0],
                    hasChild: true,
                    data: _contact
                });
                emergencyContactSection.add(_emergencyContactRow);
                _emergencyContactRow.addEventListener('click',onContactRowClick);
            }
            defaultTableData.push(emergencyContactSection);            
        }
        else {
            Ti.API.info("There aren't any emergency contacts");
        }
        
        //Create the section and one row to display the phone number for the phone directory
        phoneDirectorySection = Titanium.UI.createTableViewSection();
        phoneDirectorySection.headerTitle = app.localDictionary.phoneDirectory;
        phoneDirectoryRow = Titanium.UI.createTableViewRow({
            title: app.localDictionary.phoneDirectoryNumber
        });
        phoneDirectoryRow.addEventListener('click',onPhoneDirectoryClick);
        phoneDirectorySection.add(phoneDirectoryRow);
        defaultTableData.push(phoneDirectorySection);
            
        //Create the main table
        peopleListTable = Titanium.UI.createTableView({
            data: defaultTableData,
            top: viewBottom
        });
        if (Titanium.Platform.osname === 'iphone') {
            peopleListTable.style = Titanium.UI.iPhone.TableViewStyle.GROUPED;
        }
        win.add(peopleListTable);
        peopleListTable.addEventListener('touchstart', blurSearch);
        peopleListTable.addEventListener('move', blurSearch);
        
        //Create the contact detail view but don't show it yet.
        contactDetailViewOptions = app.styles.contactDetailView;
        contactDetailView = new app.controllers.DirectoryDetailController(app,contactDetailViewOptions);
        win.add(contactDetailView);
        Ti.API.debug('created contactDetailView' + contactDetailView);

        activityIndicator = app.views.GlobalActivityIndicator.createActivityIndicator();
        activityIndicator.resetDimensions();
        win.add(activityIndicator);
        activityIndicator.hide();
        
        win.initialized = true;
    };
    checkNetwork = function () {
        if (!Ti.Network.online) {
            alert(app.localDictionary.directoryRequiresNetwork);
        }
    };
    
    displaySearchResults = function () {
        var _peopleTableData = [], _people;
                
        //Get array of people from search results from proxy
        _people = directoryProxy.getPeople();

        if(_people.length > 0) {
            Ti.API.info(_people);
            for (var i=0, iLength=_people.length; i<iLength; i++) {
                var _contactRow = Titanium.UI.createTableViewRow({
                    title: _people[i].displayName[0],
                    hasChild: true,
                    data: _people[i]
                });
                _peopleTableData.push(_contactRow);
                _contactRow.addEventListener('click',onContactRowClick);
            }
            peopleListTable.setData(_peopleTableData);
        }
        else {
            Ti.API.debug("Not more than 0 results");
            alert(app.localDictionary.noSearchResults);
            peopleListTable.setData(defaultTableData);
        }
    };
    
    openContactDetail = function (person) {
        Ti.API.debug('openContactDetail called in DirectoryWindowController');
        Ti.API.debug(contactDetailView);
        Ti.API.debug(person);
        activityIndicator.hide();
        contactDetailView.update(person);
        contactDetailView.show();
    };
    
    blurSearch = function () {
        searchBar.blur();
    };
    
    // Controller Events
    onWindowBlur = function (e) {
        blurSearch();
    };
    // Search Events
    onPhoneDirectoryClick = function (e) {
        Ti.API.debug("Clicked the phone directory button");
        Ti.Platform.openURL('tel:' + app.localDictionary.phoneDirectoryNumber);
    };
    
    onSearchSubmit = function(e) {
        Ti.API.debug('onSearchSubmit');
        searchBar.blur();
        directoryProxy.search(searchBar.value);
    };
    
    onSearchChange = function (e) {
        if(searchBar.value === '') {
            directoryProxy.clear();
            peopleListTable.setData(defaultTableData);
        }
    };

    onSearchCancel = function (e) {
        Ti.API.debug('onSearchCancel');
        directoryProxy.clear();
        blurSearch();
        peopleListTable.setData(defaultTableData);
        activityIndicator.hide();
    };
    
    //Contact Events
    onContactRowClick = function (e) {
        Ti.API.debug("Contact clicked:" + JSON.stringify(e.source.data));
        openContactDetail(e.source.data);
    };
    
    //Proxy events

    onProxySearching = function (e) {
        activityIndicator.loadingMessage(app.localDictionary.searching + '...');
        activityIndicator.show();
        Ti.API.info("Searching...");
    };
    
    onProxySearchComplete = function (e) {
        activityIndicator.hide();
        Ti.API.info("Directory Search Complete");
        if (!e.error) {
            displaySearchResults();
        }
        else {
            alert(e.error);
        }
    };
    
    onProxySearchError = function (e) {
        activityIndicator.loadingMessage(app.localDictionary.errorPerformingSearch);
        t = setTimeout(function() {
            activityIndicator.hide();
            }, 3000);
        Ti.API.info("Directory Proxy Search Error");
    };
    
    //Listene for events, mostly fired from models.DirectoryProxy
    Titanium.App.addEventListener('DirectoryProxySearching', onProxySearching);
    Titanium.App.addEventListener('DirectoryProxySearchComplete', onProxySearchComplete);
    Titanium.App.addEventListener('DirectoryProxySearchError', onProxySearchError);
    Titanium.App.addEventListener('showWindow', blurSearch);
    
    if(!win.initialized) {
        self.init();
    }

    return self;
})();