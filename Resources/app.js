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

// library includes
Titanium.include('config.js');
Titanium.include('js/ApplicationFacade.js');
Titanium.include('style.js');
Titanium.include('localization.js');
Titanium.include('js/gibberish-aes.js');
Titanium.include('js/models/MapProxy.js');
Titanium.include('js/models/DirectoryProxy.js');
Titanium.include('js/models/LoginProxy.js');
Titanium.include('js/models/PortalProxy.js');
Titanium.include('js/models/ResourceProxy.js');
Titanium.include('js/models/SessionProxy.js');
Titanium.include('js/models/WindowManager.js');
Titanium.include('js/views/GenericTitleBar.js');
Titanium.include('js/views/GlobalActivityIndicator.js');
Titanium.include('js/views/MapDetailTop.js');
Titanium.include('js/views/PersonDetailTableView.js');
Titanium.include('js/views/SecondaryNavBar.js');
Titanium.include('js/views/SharedWebView.js');
Titanium.include('js/controllers/DirectoryDetailController.js');
Titanium.include('js/controllers/DirectoryWindowController.js');
Titanium.include('js/controllers/MapDetailViewController.js');
Titanium.include('js/controllers/PortletWindowController.js');
Titanium.include('js/controllers/SettingsWindowController.js');

(function (){
    var windows = {},
        app, windowManager,
        activityIndicator, 
        init, setUpWindows, 
        onShowWindow, onShowPortlet, onLoginProxyError;
    
    init = function () {
        Ti.API.info("Hello. You're on an: " + Ti.Platform.osname);
        Ti.API.info("Your resolution is: " + Ti.Platform.displayCaps.density);
        Ti.API.info("With a DPI of: " + Ti.Platform.displayCaps.dpi);

        setUpFacade();
        windowManager = app.models.windowManager;
        //Let the user know that they need a network connection to use this app.
        if (!Ti.Network.online) {
            // alert(app.localDictionary.networkConnectionRequired);
            Ti.API.debug("Network is offline");
        }
        
        Ti.App.addEventListener('LoginProxyError', onLoginProxyError);
        
        setUpWindows();
        windowManager.openWindow('home');
    };
    
    setUpFacade = function () {
        app = new ApplicationFacade();
        
        app.registerMember('UPM', new Config(app));
        app.registerModel('resourceProxy', new ResourceProxy(app)); //This one doesn't need the app passed in because it only needs to know the OS
        app.registerMember('styles', new Styles(app));
        app.registerMember('GibberishAES', GibberishAES);
        app.registerMember('localDictionary', localDictionary[Titanium.App.Properties.getString('locale')]);
        
        app.registerModel('windowManager', new WindowManager(app));
        app.registerModel('sessionProxy', new SessionProxy(app));
        app.registerModel('loginProxy', new LoginProxy(app));
        app.registerModel('mapProxy', new MapService(app));
        app.registerModel('directoryProxy', new DirectoryProxy(app));
        app.registerModel('portalProxy', new PortalProxy(app));

        app.registerView('MapDetailTop', MapDetailTop);
        app.registerView('GenericTitleBar', GenericTitleBar);
        app.registerView('PersonDetailTableView', PersonDetailTableView);
        app.registerView('GlobalActivityIndicator', new GlobalActivityIndicator(app));
        app.registerView('SecondaryNavBar', SecondaryNavBar);
        app.registerView('SharedWebView', new SharedWebView(app));

        //Second class controllers, but required for first class controllers to load.
        app.registerController('DirectoryDetailController', DirectoryDetailController);
        app.registerController('MapDetailViewController', MapDetailViewController);
        
        //Window controllers
        app.registerController('directoryWindowController', new DirectoryWindowController(app));
        app.registerController('portletWindowController', new PortletWindowController(app));
        app.registerController('settingsWindowController', new SettingsWindowController(app));
        
        activityIndicator = app.views.GlobalActivityIndicator.createActivityIndicator();
        
        Ti.App.fireEvent("FacadeInitialized");
    };
    
    setUpWindows = function () {
        //
        // MAIN PORTAL VIEW
        //
        windowManager.addWindow({
            url: 'js/controllers/PortalWindowController.js',
            app: app,
            key: 'home',
            exitOnClose: false,
            modal: false
        });
        
        //
        // PORTLET VIEW
        //
        windowManager.addWindow(app.controllers.portletWindowController);

        //
        //Directory VIEW
        //
        windowManager.addWindow(app.controllers.directoryWindowController);

        //
        // MAP VIEW
        //
        windowManager.addWindow({
            url: 'js/controllers/MapWindowController.js',
            title: app.localDictionary.map,
            app: app,
            key: 'map',
            exitOnClose: false,
            modal: true
        });
        
        //
        //  SETTINGS VIEW
        //
        windowManager.addWindow(app.controllers.settingsWindowController);
        Ti.API.info("Settings window controller: " + JSON.stringify(app.controllers.settingsWindowController));
    };
    
    init();
    
})();

