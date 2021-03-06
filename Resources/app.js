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
Object.prototype.clone = function() {
    var newObj = (this instanceof Array) ? [] : {}, i;
    for (i in this) {
        if (this.hasOwnProperty(i)) {
            if (this[i] && typeof this[i] == "object") {
                newObj[i] = this[i].clone();
            } 
            else {
                newObj[i] = this[i];
            }            
        }
    }
    return newObj;
};

var app, loadingWindow, WindowManager, startup, onOrientationChange;



startup = function (e) {
    Titanium.include('js/ApplicationFacade.js');

    Titanium.include('js/config.js');
    Titanium.include('js/localization.js');
    Titanium.include('js/style.js');
    Titanium.include('js/UI.js');
    Titanium.include('js/gibberishAES.js');

    Titanium.include('js/models/DeviceProxy.js');
    Titanium.include('js/models/ResourceProxy.js');
    Titanium.include('js/models/LoginProxy.js');
    Titanium.include('js/models/login/LocalLogin.js');
    Titanium.include('js/models/login/CASLogin.js');
    
    Titanium.include('js/models/PortalProxy.js');
    Titanium.include('js/models/SessionProxy.js');
    Titanium.include('js/models/UserProxy.js');
    Titanium.include('js/models/WindowManager.js');

    Titanium.include('js/controllers/DirectoryWindowController.js');
    Titanium.include('js/controllers/MapWindowController.js');

    Titanium.include('js/controllers/PortalWindowController.js');
    Titanium.include('js/controllers/PortletWindowController.js');
    Titanium.include('js/controllers/SettingsWindowController.js');
    
    app = new ApplicationFacade();

    //Adds  members to the facade singleton, so they can be accessed.
    //Only necessary members are added here, secondary members are added from controllers when opened, for performance.
    //from any model, view, controller throughout the application
    //The facade is always called "app" in each controller, and depending on the type of member,
    //It can be accessed as app.memberName, app.views.viewName, app.models.modelName, or app.controllers.controllerName

    app.registerMember('config', new ConfigModule(app)); //Global config object
    app.registerMember('localDictionary', localDictionary[Titanium.App.Properties.getString('locale')]); // Dictionary contains all UI strings for the application for easy localization.
    app.registerModel('deviceProxy', new DeviceProxy(app));
    app.registerModel('resourceProxy', new ResourceProxy(app)); //Manages retrieval of local files between different OS's
    app.registerMember('styles', new Styles(app)); //Stylesheet-like dictionary used throughout application.
    app.registerModel('windowManager', new WindowManager(app)); //Manages opening/closing of windows, state of current window, as well as going back in the activity stack.
    app.registerMember('UI', new UI(app));
    app.registerMember('GibberishAES', GibberishAES); //Used to encrypt user credentials to store in sqlite db, and decrypt for automatic login.
    
    
    app.registerModel('portalProxy', new PortalProxy(app)); //Manages the home screen view which displays a grid of icons representing portlets.
    app.registerModel('sessionProxy', new SessionProxy(app)); //Manages 1 or more timers (depending on OS) to know when a session has expired on the server.
    app.registerModel('localLogin', new LocalLogin(app));
    app.registerModel('CASLogin', new CASLogin(app));
    app.registerModel('userProxy', new UserProxy(app));
    app.registerModel('loginProxy', new LoginProxy(app)); //Works primarily with the settingsWindowController to manage the login process (Local or CAS) and broadcast success/fail events.
    
    //Window controllers
    app.registerController('portalWindowController', new PortalWindowController(app));
    app.registerController('directoryWindowController', new DirectoryWindowController(app)); // Controls the native Directory portlet window
    app.registerController('mapWindowController', new MapWindowController(app)); // Controls the native Map portlet window
    app.registerController('portletWindowController', new PortletWindowController(app)); // Controls the webview for all portlets that aren't native (essentially an iframe for the portal)
    app.registerController('settingsWindowController', new SettingsWindowController(app)); // Controls the settings window (currently manages username/password)

    // Add window controllers to the window manager,
    // which manages the stack of window activities, and manages opening and closing
    // of windows so that controllers don't have to be concerned with details,
    // they just tell the window manager what to open, and it handles the rest.
    WindowManager = app.models.windowManager;

    WindowManager.addWindow(app.controllers.portalWindowController); //Home controller
    WindowManager.addWindow(app.controllers.portletWindowController);
    WindowManager.addWindow(app.controllers.directoryWindowController);
    WindowManager.addWindow(app.controllers.mapWindowController);
    WindowManager.addWindow(app.controllers.settingsWindowController);
    
    WindowManager.openWindow(app.controllers.portalWindowController.key);

    // This will determine if a network session exists, and what 
    // window was open last time the app closed, and will manage the process
    // of establishing a session and opening the window.
    app.models.deviceProxy.checkNetwork();
    app.models.loginProxy.establishNetworkSession();
    
    if (app.models.deviceProxy.isIOS()) {
        Titanium.Gesture.addEventListener('orientationchange', onOrientationChange);
    }
    else {
        //Android doesn't register global orientation events, only in the context of a specific activity.
        //So we'll listen for it in each activity and broadcast a global event instead.
        Ti.App.addEventListener('androidorientationchange', onOrientationChange);
    }
    
};

onOrientationChange = function (e) {
    Ti.API.info('orientationchange' + JSON.stringify(e) + " & current is " + app.models.deviceProxy.getCurrentOrientation());
    if (!app.models.deviceProxy.getCurrentOrientation() || app.models.deviceProxy.getCurrentOrientation() !== e.orientation) {
        app.models.deviceProxy.setCurrentOrientation(e.orientation);
        app.styles = new Styles(app);
        Ti.App.fireEvent('updatestylereference');
        Ti.App.fireEvent('dimensionchanges', {orientation: e.orientation});
    }
    else {
        Ti.API.debug("Same orientation as before");
    }
};

startup();