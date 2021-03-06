var CASLogin = function (facade) {
    var app = facade, init, _self = this, Session, Config, 
    client, credentials, options, url,
    onLoginError, onLoginComplete, onInitialResponse, onInitialError;
    
    init = function () {
        Config = app.config;
    };
    
    this.login = function (creds, opts) {
        if (!Session) {
            Session = app.models.sessionProxy;
        }
        credentials = creds;
        options = opts;

        url = Config.CAS_URL + '/login?service=' + Titanium.Network.encodeURIComponent(Config.BASE_PORTAL_URL + Config.PORTAL_CONTEXT + '/Login?isNativeDevice=true');

        // Send an initial response to the CAS login page
        client = Titanium.Network.createHTTPClient({
            onload: onInitialResponse,
            onerror: onInitialError
        });
        client.open('GET', url, false);

        client.send();
    };
    
    this.getLoginURL = function (url) {
        var separator = url.indexOf('?') >= 0 ? '&' : '?';
        return Config.CAS_URL + '/login?service=' + Titanium.Network.encodeURIComponent(url + separator + 'isNativeDevice=true');
    };
    
    onLoginComplete = function (e) {
        Ti.API.debug("onLoginComplete() in CASLogin");
        // Examine the response to determine if authentication was successful.  If
        // we get back a CAS page, assume that the credentials were invalid.
        var failureRegex = new RegExp(/body id="cas"/);
        if (failureRegex.exec(client.responseText)) {
            Session.stopTimer(LoginProxy.sessionTimeContexts.NETWORK);
            Ti.App.fireEvent('EstablishNetworkSessionFailure');
        } else {
            Session.resetTimer(LoginProxy.sessionTimeContexts.NETWORK);
            if (!options || !options.isUnobtrusive) {
                Ti.App.fireEvent('EstablishNetworkSessionSuccess');
            }
        }
    };
    
    onLoginError = function (e) {
        Ti.API.error("onLoginError() in CASLogin");
        Session.stopTimer(LoginProxy.sessionTimeContexts.NETWORK);
        Ti.App.fireEvent('EstablishNetworkSessionFailure');
    };
    
    onInitialError = function (e) {
        Ti.API.error("onInitialError() in CASLogin");
        Session.stopTimer(LoginProxy.sessionTimeContexts.NETWORK);
        Ti.App.fireEvent('EstablishNetworkSessionFailure');
    };
    
    onInitialResponse = function (e) {
        Ti.API.debug("onInitialResponse() in CASLogin");
        var flowRegex, flowId, initialResponse, data;
        // Parse the returned page, looking for the Spring Webflow ID.  We'll need
        // to post this token along with our credentials.
        initialResponse = client.responseText;
        Ti.API.debug("initialResponse: " + initialResponse);
        flowRegex = new RegExp(/input type="hidden" name="lt" value="([a-z0-9]*)?"/);
        Ti.API.debug("flowRegex: " + flowRegex);
        flowId = flowRegex.exec(initialResponse)[1];
        Ti.API.debug("flowId: " + flowId);

        // Post the user credentials and other required webflow parameters to the 
        // CAS login page.  This step should accomplish authentication and redirect
        // to the portal if the user is successfully authenticated.
        client = Titanium.Network.createHTTPClient({
            onload: onLoginComplete,
            onerror: onLoginError
        });
        client.open('POST', url, true);
        
        data = { 
            username: credentials.username, 
            password: credentials.password, 
            lt: flowId, 
            _eventId: 'submit', 
            submit: 'LOGIN' 
        };
        client.send(data);
        Ti.API.debug("client.send() with data: " + JSON.stringify(data));
    };
    
    init();
};