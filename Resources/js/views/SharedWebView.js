var SharedWebView = function (facade) {
    var app = facade, webView, init, customLoad;
    
    init = function () {
        activityIndicator = app.views.GlobalActivityIndicator;
        webView = Ti.UI.createWebView(app.styles.portletView);
        webView.addEventListener('load', onWebViewLoad);
        webView.addEventListener('beforeload', onBeforeWebViewLoad);
        webView.load = load;
    };
    
    function onWebViewLoad (e) {
        Ti.API.debug("Firing onBeforeWebViewLoad in SharedWebView: " + JSON.stringify(e));
        webView.show();
        if (e.url.indexOf(app.UPM.CAS_URL) > -1) {
            Ti.API.debug("The current page is a CAS page.");
            // Ti.API.debug("doCas > onLoginReady() in SharedWebView");
            var credentials, jsString;
            credentials = app.models.loginProxy.getCredentials();
            
            if (credentials.username && credentials.password) {
                jsString = "$('#username').val('" + credentials.username +"');$('#password').val('" + credentials.password +"');$('.btn-submit').click();";
                Ti.API.debug("Preparing to evalJS in webView: " + jsString);
                webView.evalJS(jsString);
            }
            else {
                Ti.API.debug("Credentials don't contain username and password: " + JSON.stringify(credentials));
            }
        }
        else {
            Ti.App.fireEvent('SharedWebViewLoad', {url: e.url});
        }
    }
    
    function onBeforeWebViewLoad (e) {
        Ti.API.debug("Loading portlet");
        activityIndicator.message = app.localDictionary.loading;
        activityIndicator.resetDimensions();
        activityIndicator.show();
        webView.hide();
        Ti.App.fireEvent("SharedWebViewBeforeLoad");
    }
    
    load = function (url) {
        /*
        This method determines if a session is valid for the webview, and will
        either modify the URL and load, or will load the URL as-is if session is active.
        */
        // webView.stopLoading();
        webView.show();
        Ti.API.debug("load() in SharedWebView. Is valid webview session?" + app.models.loginProxy.isValidWebViewSession());
        if (!app.models.loginProxy.isValidWebViewSession()) {
            var doCas, doLocal;
            doLocal = function () {
                Ti.API.debug("load > doLocal() in SharedWebView");
                Ti.API.debug("Resulting URL: " + app.models.loginProxy.getLocalLoginURL(url));
                webView.url = app.models.loginProxy.getLocalLoginURL(url);
            };
            
            doCas = function () {
                Ti.API.debug("load > doCas() in SharedWebView");
                Ti.API.debug("CAS URL is: " + app.models.loginProxy.getCASLoginURL(url));
                webView.url = app.models.loginProxy.getCASLoginURL(url);
            };
            
            switch (app.UPM.LOGIN_METHOD) {
                case app.models.loginProxy.loginMethods.CAS:
                    doCas();
                    break;
                case app.models.loginProxy.loginMethods.LOCAL_LOGIN:
                    doLocal();
                    break;
                default:
                    Ti.API.debug("Unrecognized login method in SharedWebView.load()");
            }
        }
        else {
            webView.url = url;
        }
        
    };
    
    
    
    init();
    
    return webView;
};