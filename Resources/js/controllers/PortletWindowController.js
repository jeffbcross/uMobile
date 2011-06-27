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

var PortletWindowController = function (facade) {
    var win, _self = this, app = facade, 
        Device, WindowManager, PortalWindow, Styles, UI, LocalDictionary, Login, UPM, Session,
        activityIndicator, titleBar, navBar, navBackButton, webView,
        initialized, winListeners = [], activePortlet, _homeURL, _lastVideoOpened = '',
        pathToRoot = '../../',
        init, drawWindow, getQualifiedURL, getLocalUrl,
        includePortlet, onPortletLoad, onPortletBeforeLoad, onWindowOpen, onAppResume, onBackBtnPress;

    init = function () {
        Ti.API.debug("init() in PortletWindowController");
        _self.key = 'portlet';
        
        Ti.App.addEventListener('updatestylereference', function (e) {
            Styles = app.styles;
        });
    };
    
    this.close = function (options) {
        Ti.API.info("close() in PortletWindowController");
        if (win) {
            win.close();
        }
    };
    
    this.open = function (portlet) {
        Ti.API.debug("open() in PortletWindowController");
        
        if (!initialized) {
            //Declare pointers to facade members
            Device = app.models.deviceProxy;
            WindowManager = app.models.windowManager;
            PortalWindow = app.controllers.portalWindowController;
            Styles = app.styles;
            UI = app.UI;
            LocalDictionary = app.localDictionary;
            Login = app.models.loginProxy;
            UPM = app.config;
            Session = app.models.sessionProxy;
            
            initialized = true;
        }
        
        if (portlet) {
            activePortlet = portlet;
        }
        else {
            Ti.API.error("No portlet was passed to includePortlet() in PortletWindowController");
            WindowManager.openWindow(PortalWindow.key);
            return;
        }
        
        win = Titanium.UI.createWindow({
            url: 'js/views/WindowContext.js',
            key: 'portlet',
            backgroundColor: Styles.backgroundColor,
            exitOnClose: false,
            navBarHidden: true
            // orientationModes: [Ti.UI.PORTRAIT]
        });
        win.open();

        titleBar = UI.createTitleBar({
            title: portlet.title,
            settingsButton: false,
            homeButton: true
        });
        
        // initialize navigation bar for URLs outside the portal
        navBar = UI.createSecondaryNavBar({
            backButton: true,
            backButtonHandler: onBackBtnPress,
            btnFloatLeft: true
        });
        navBar.top = 40;
        navBar.visible = false;

        activityIndicator = UI.createActivityIndicator();
        activityIndicator.hide();

        win.add(titleBar);
        win.add(navBar);
        if (Device.isIOS() || !webView) {
            Ti.API.debug("The device is iOS or there isn't a webView yet");
            webView = Titanium.UI.createWebView(Styles.portletView);
            webView.addEventListener('load', onPortletLoad);
            webView.addEventListener('beforeload', onPortletBeforeLoad);
            webView.hide();
        }
        else {
            Ti.API.debug("It's Android and there's already a webview");
            try {
                win.remove(webView);
            }
            catch (e) {
                Ti.API.error("Couldn't remove webview: " + JSON.stringify(e));
            }
        }
        win.add(webView);
        win.add(activityIndicator);
        
        includePortlet(activePortlet);

        Titanium.App.addEventListener('dimensionchanges', function (e) {
            if (webView.canGoBack()) {
                navBar.visible = true;
                webView.top = titleBar.height + navBar.height;
                webView.height = win.height - titleBar.height - navBar.height;
            }
            else {
                Ti.API.info("Webview can't go back");
                webView.top = titleBar.height;
                webView.height = win.height - titleBar.height;
            }
        });
    };
    
    includePortlet = function (portlet) {
        Ti.API.debug("includePortlet() in PortletWindowController");
        webView.visible = false;
        activityIndicator.setLoadingMessage(LocalDictionary.loading);
        activityIndicator.show();
        
        _homeURL = getQualifiedURL(portlet.url);
        webView.url = _homeURL;
        
        titleBar.updateTitle(portlet.title);
    };
    
    getLocalUrl = function (url) {
        var localUrl, isValidSession;
        Ti.API.debug("getLocalUrl() in SharedWebView");
        /*
        This method determines if a session is valid for the webview, and will
        either modify the URL and load, or will load the URL as-is if session is active.
        This method only returns a URL, doesn't actually set the url property of the webview.
        */

        if (!Device.checkNetwork()) {
            return false;
        }

        //We only need to check the session if it's a link to the portal.
        isValidSession = Login.isValidWebViewSession();
        if (!isValidSession) {
            Ti.API.debug("!isValidSession in getLocalUrl()");
            Login.getLoginURL(url);
            localUrl = Login.getLoginURL(url);
        }
        else {
            Ti.API.debug("isValidSession in getLocalUrl()");
            if (url.indexOf('/') === 0) {
                Ti.API.info("Index of / in URL is 0");
                var newUrl = UPM.BASE_PORTAL_URL + url;
                Ti.API.info(newUrl);
                localUrl = newUrl;
            }
            else {
                Ti.API.info("Index of / in URL is NOT 0");
                localUrl = url;
            }
        }
        return localUrl;
    };
    
    getQualifiedURL = function (url) {
        Ti.API.debug("getQualifiedURL() in PortletWindowController");
        var _url;
        if (url.indexOf('/') == 0) {
            Ti.API.debug("Portlet URL is local");
            if (Session.validateSessions()[LoginProxy.sessionTimeContexts.WEBVIEW]) {
                Ti.API.debug("Session is active in getQualifiedURL()");
                _url = getLocalUrl(url);
            }
            else {
                Ti.API.debug("Session is NOT active in getQualifiedURL(): " + JSON.stringify(Session.validateSessions()));
                _url = Login.getLoginURL(url);
            }
            webView.externalModule = false;
            webView.top = titleBar.height;
        } else {
            Ti.API.debug("Portlet URL is external in getQualifiedURL()");
            _url = url;
            webView.externalModule = true;
        }
        
        return _url;
    };
    
    onPortletBeforeLoad = function (e) {
        Ti.API.debug("onPortletBeforeLoad() in PortletWindowController" + webView.url);

        if (Device.isAndroid()) {
            webView.hide();
        }
        //We want to make sure we don't need to re-establish a session.
        if (webView.url !== getQualifiedURL(webView.url)) {
            webView.stopLoading();
            webView.url = getQualifiedURL(webView.url);
        }
        else if (e.url.indexOf('http://m.youtube.com') === 0 && Device.isAndroid()) {
        	var _URLToOpen = e.url, _params = e.url.split('?')[1].split('&');
        	webView.stopLoading();

        	for (var i=0, iLength = _params.length; i<iLength; i++) {
        		Ti.API.info("iterating through url params");
        		if (_params[i].indexOf('desktop_uri') > -1) {
        			Ti.API.info("Found the desktop URI:" + _params[i]);
        			_URLToOpen = _params[i].split('=', 2)[1];
        			_URLToOpen = decodeURIComponent(_URLToOpen);
        			break;
        		}
        	}
        	Ti.API.info("Opening: " + _URLToOpen);
        	if (_URLToOpen !== _lastVideoOpened) {
        	    webView.stopLoading();
                Ti.Platform.openURL(_URLToOpen);
                //Set the last video to this, so that it doesn't try to broadcast the intent twice.
                _lastVideoOpened = _URLToOpen;
        	}
        }
        activityIndicator.setLoadingMessage(LocalDictionary.loading);
        activityIndicator.show();
    };
    
    onBackBtnPress = function (e) {
        webView.goBack();
    };
    
    onPortletLoad = function (e) {
        var portalIndex = e.url.indexOf(UPM.BASE_PORTAL_URL);
        Ti.API.debug("onPortletLoad() in PortletWindowController, index: " + portalIndex);
        webView.show();
        
        activityIndicator.hide();
        
        
        if (portalIndex >= 0) {
            Ti.API.debug("Visiting a portal link");
            Ti.App.fireEvent('SessionActivity', {context: LoginProxy.sessionTimeContexts.WEBVIEW});
            //We want to be able to open any video now, so we'll clear the YouTube workaround variable
            _lastVideoOpened = '';
            webView.externalModule = false;
            navBar.visible = false;
            webView.top = titleBar.height;
            webView.height = win.height - titleBar.height;
            // webView.setTop(Styles.titleBar.height);
            // Login.updateSessionTimeout(Login.sessionTimeContexts.WEBVIEW);
        }
        else {
            Ti.API.debug("Visiting an external link. Webview.url = " + webView.url + " & e.url = " + e.url);
            webView.externalModule = true;
            if (webView.canGoBack() && e.url !== _homeURL) {
                navBar.visible = true;
                webView.top = titleBar.height + navBar.height;
                webView.height = win.height - titleBar.height - navBar.height;
            }
            else {
                Ti.API.info("Webview can't go back");
                webView.top = titleBar.height;
                webView.height = win.height - titleBar.height;
            }
            Ti.API.debug("WebView height is: " + webView.height);
            // webView.setTop(Styles.titleBar.height + navBar.height);
        }
        webView.show();
        activityIndicator.hide();
    };
    
    if (!initialized) {
        init();
    }
};