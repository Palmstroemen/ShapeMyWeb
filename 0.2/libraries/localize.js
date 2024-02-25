    // Übersetzt die Seite
    function replace_i18n(obj, tag) {
/*        var msg = tag.replace(/__MSG_(\w+)__/g, function(match, v1) {
            return v1 ? chrome.i18n.getMessage(v1) : '';
        });
*/
        let translation = chrome.i18n.getMessage(tag);
        if (translation !=="") {
            obj.innerHTML = chrome.i18n.getMessage(tag);
        }
    }



    function localizeHtmlPage() {
        // Localize using __MSG_***__ data tags
        var data = document.querySelectorAll('[lang]');

        for (var i in data) if (data.hasOwnProperty(i)) {
            var obj = data[i];
            var tag = obj.getAttribute('lang').toString();
            replace_i18n(obj, tag);
        }
/*
        // Localize everything else by replacing all __MSG_***__ tags
        var page = document.getElementsByTagName('html');

        for (var j = 0; j < page.length; j++) {
            var obj = page[j];
            var tag = obj.innerHTML.toString();

            replace_i18n(obj, tag);
        }
*/        
    }


