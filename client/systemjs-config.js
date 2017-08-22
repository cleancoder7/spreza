// Angular2 SystemJS configuration
(function (global){
    System.config({
        paths: {
            /* NOTE: DO NOT MODIFY THIS PATH!
             * The Gulp task runner will modify this file and inject the correct
             * value for the Development build.
             */
            'source:': './node_modules/'
        },
        // Where the System loader looks for things
        map: {
            // Application path
            app: 'app',
            // Angular bundles path
            '@angular/core': 'source:@angular/core/bundles/core.umd.js',
            '@angular/common': 'source:@angular/common/bundles/common.umd.js',
            '@angular/compiler': 'source:@angular/compiler/bundles/compiler.umd.js',
            '@angular/platform-browser': 'source:@angular/platform-browser/bundles/platform-browser.umd.js',
            '@angular/platform-browser-dynamic': 'source:@angular/platform-browser-dynamic/bundles/platform-browser-dynamic.umd.js',
            '@angular/http': 'source:@angular/http/bundles/http.umd.js',
            '@angular/router': 'source:@angular/router/bundles/router.umd.js',
            '@angular/forms': 'source:@angular/forms/bundles/forms.umd.js',
            // Other
            'rxjs': 'source:rxjs',
            'ng2-popover': 'source:ng2-popover',
            'ng2-bs3-modal': 'source:ng2-bs3-modal',
            'angular2-uuid': 'source:angular2-uuid'
        },
        // Tells the System loader how to load without a filename or extension
        packages: {
            app: {
                main: 'main.js',
                defaultExtension: 'js'
            },
            rxjs: {
                defaultExtension: 'js'
            },
            'ng2-bs3-modal': {
                defaultExtension: 'js'
            },
            'angular2-uuid': {
                main: 'index.js',
                defaultExtension: 'js'
            },
            'ng2-popover': {
                main: 'index.js',
                defaultExtension: 'js'
            }
        }
    });
})(this);