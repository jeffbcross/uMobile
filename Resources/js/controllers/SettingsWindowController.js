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

(function(){
    var win = Titanium.UI.currentWindow,
        app = win.app,
        credentials, 
        usernameLabel, usernameInput, passwordLabel, passwordInput, saveButton, activityIndicator,
        titlebar,
        init, createTitleBar, createCredentialsForm,
        onUpdateCredentials, onSaveButtonPress, onSaveButtonUp, onWindowBlur;

    init = function () {
        // get the current user credentials in order
        // to pre-populate the input fields
        credentials = app.models.loginProxy.getCredentials();

        win.backgroundColor = win.app.styles.backgroundColor;
        
        Ti.App.addEventListener('showWindow', onWindowBlur);
        titleBar = new app.views.GenericTitleBar({
            app: app,
            windowKey: 'settings',
            title: app.localDictionary.settings,
            settingsButton: false,
            homeButton: true
        });
        win.add(titleBar);
        
        createCredentialsForm();

        activityIndicator = app.views.GlobalActivityIndicator;
        activityIndicator.resetDimensions();
        win.add(activityIndicator);
        
        win.initialized = true;
    };

    createCredentialsForm = function () {
        var usernameLabelOpts = app.styles.textFieldLabel,
            usernameInputOpts = app.styles.textField,
            passwordLabelOpts = app.styles.textFieldLabel,
            passwordInputOpts = app.styles.textField,
            saveButtonOpts;

        // create the username label and input field
        usernameLabelOpts.text = win.app.localDictionary.username;
        usernameLabelOpts.top = 50;
        usernameLabelOpts.left = 10;
        usernameLabel = Titanium.UI.createLabel(usernameLabelOpts);
        win.add(usernameLabel);

        usernameInputOpts.top = 50;
        usernameInputOpts.left = 100;
        usernameInputOpts.width = Ti.Platform.displayCaps.platformWidth - 100 - 10;
        usernameInputOpts.value = credentials.username;
        usernameInput = Titanium.UI.createTextField(usernameInputOpts);
        win.add(usernameInput);

        // create the password label and input field
        passwordLabelOpts.top = 100;
        passwordLabelOpts.left = 10;
        passwordLabelOpts.text = win.app.localDictionary.password;
        passwordLabel = Titanium.UI.createLabel(passwordLabelOpts);
        win.add(passwordLabel);

        passwordInputOpts.value = credentials.password;
        passwordInputOpts.passwordMask = true;
        passwordInputOpts.top = 100;
        passwordInputOpts.left = 100;
        usernameInputOpts.width = Ti.Platform.displayCaps.platformWidth - 100 - 10;
        passwordInput = Titanium.UI.createTextField(passwordInputOpts);
        win.add(passwordInput);

        // create the save button and configure it to persist
        // the new credentials when pressed

        saveButtonOpts = app.styles.contentButton;
        saveButtonOpts.top = 150;
        saveButtonOpts.left = 10;
        saveButtonOpts.title = win.app.localDictionary.update;
        saveButton = Titanium.UI.createButton(saveButtonOpts);

        win.add(saveButton);

        saveButton.addEventListener('click', onUpdateCredentials);
        saveButton.addEventListener('touchstart', onSaveButtonPress);
        saveButton.addEventListener(Ti.Platform.osname === 'android' ? 'touchcancel' : 'touchend', onSaveButtonUp);
        passwordInput.addEventListener('return', onUpdateCredentials);
        usernameInput.addEventListener('return', onUpdateCredentials);

    };

    onUpdateCredentials = function (e) {
        activityIndicator.message = app.localDictionary.loggingIn;
        activityIndicator.show();
        app.models.loginProxy.saveCredentials({ 
            username: usernameInput.value, 
            password: passwordInput.value 
        });
        app.models.loginProxy.establishNetworkSession({
            onsuccess: function () {
                Ti.API.debug('Updated user credentials');
                Ti.App.fireEvent('credentialUpdate', {});
                Ti.App.fireEvent(
                    'showWindow', 
                    {
                        oldWindow: 'settings',
                        newWindow: 'home',
                        transition: Titanium.UI.iPhone.AnimationStyle.FLIP_FROM_RIGHT 
                    }
                );
            },
            onauthfailure: function () {
            Titanium.UI.createAlertDialog({ title: app.localDictionary.error,
                message: app.localDictionary.authenticationFailed, buttonNames: ['OK']
                }).show();
            }
        });
        activityIndicator.hide();
    };
    
    onSaveButtonPress = function(e) {
        saveButton.backgroundGradient = app.styles.contentButton.backgroundGradientPress;
    };
    
    onSaveButtonUp = function (e) {
        saveButton.backgroundGradient = app.styles.contentButton.backgroundGradient;
    };
    
    onWindowBlur = function (e) {
        Ti.API.debug("onWindowBlur in SettingsWindowController");
        passwordInput.blur();
        usernameInput.blur();
        if(activityIndicator.visible) {
            activityIndicator.hide();
        }
    };

    if (!win.initialized) {
        Ti.API.debug("Calling init() in SettingsWindowController");
        init();
    }
    
})();