var PersonDetailTableView = function (facade,opts) {
    var app = facade,
        self = Titanium.UI.createTableView(app.styles.directoryDetailAttributeTable),
        person,
        //Event Handlers
        onEmailSelect,
        emptyRow,
        isDataEmpty = false;
    
    self.update = function (p) {
        //Clear the previous data from the table.
        self.data = [];
        person = p;
        
        if (!person.email.home && !person.phone.home && !person.jobTitle && !person.organization && !person.address.home) {
            if(!emptyRow) {
                emptyRow = createRow({value: app.localDictionary.noContactData});
            }
            self.appendRow(emptyRow);
            isDataEmpty = true;
        }
        
        Ti.API.debug("checking user's email " + person.email.home);
        if (person.email.home) {
            var _emailRow = createRow({label: app.localDictionary.email, value: person.email.home, link: true});

            self.appendRow(_emailRow);
            _emailRow.addEventListener('click', onEmailSelect);
        }
        
        Ti.API.debug("checking phone " + person.phone.home);
        if (person.phone.home) {
            self.appendRow(createRow({label: app.localDictionary.phone, value: person.phone.home}));
        }
        
        Ti.API.debug("checking job " + person.jobTitle);
        if (person.jobTitle) {
            self.appendRow(createRow({label: app.localDictionary.title, value: person.jobTitle}));
        }
        
        Ti.API.debug("checking org " + person.organization);
        if (person.organization) {
            self.appendRow(createRow({label: app.localDictionary.organization, value: person.organization}));
        }
        
        Ti.API.debug("checking address " + person.address.home);
        if (person.address.home) {
            self.appendRow(createRow({label: app.localDictionary.address, value: person.address.home}));
        }
    };
    function createRow (attributes) {
        var _row, _rowOptions, _label, _value, _valueOpts;
        //The only required param in the attributes object is value. "label" is optional but preferred.
        //The layout will change to expand the value text if there's no label with it.
        _rowOptions = app.styles.directoryDetailRow;
        
        if (!attributes.label) {
            _rowOptions.className = 'personDataNoLabel';
        }
        else {
            _label = Titanium.UI.createLabel(app.styles.directoryDetailRowLabel);
            _label.text = attributes.label;
            _label.data = attributes.value;
            
            _rowOptions.className = 'personData';
        }
        _rowOptions.data = attributes.value;
        _row = Titanium.UI.createTableViewRow(_rowOptions);        
        if (attributes.label) { 
            _row.add(_label);
            _valueOpts = app.styles.directoryDetailRowValue;
        }
        else {
            _valueOpts = app.styles.directoryDetailValueNoLabel;
        }
        
        _valueOpts.text = attributes.value;
        _valueOpts.data = attributes.value;
        if (attributes.link) { 
            Ti.API.debug("Creating a link label for " + attributes.value);
            _valueOpts.color = app.styles.directoryLinkLabel.color;
        }
        _value = Titanium.UI.createLabel(_valueOpts);
        _row.add(_value);
        
        return _row;
    }
    onEmailSelect = function (e) {
        var _address;
        Ti.API.info("onEmailSelect()" + e.source.data);
        if(Ti.Platform.osname == 'iphone') {
            var emailDialog = Ti.UI.createEmailDialog({
                toRecipients: [e.source.data]
            });
            emailDialog.open();
        }
        else {
            Ti.Platform.openURL('mailto:' + e.source.data);
        }
    };
    
    onPhoneSelect = function (e) {
        Ti.Platform.openURL('tel:' + e.source.title);
    };
    
    return self;
};