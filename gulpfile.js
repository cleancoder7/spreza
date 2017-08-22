var fs = require('fs');
var os = require('os');
var gulp = require('gulp');
var shell = require('gulp-shell');
var unzip = require('gulp-unzip');
var clean = require('gulp-clean');
var concat = require('gulp-concat');
var rename = require('gulp-rename');
var uglify = require('gulp-uglify');
var tsc = require('gulp-typescript');
var cleanCSS = require('gulp-clean-css');
var runSequence = require('run-sequence');
var gulpTypings = require("gulp-typings");
var inject = require('gulp-inject-string');
var sourcemaps = require('gulp-sourcemaps');
var sysBuilder = require('systemjs-builder');
var download = require('gulp-download-files');
var embedTemplates = require('gulp-angular-embed-templates');

// For deployment
var gulpif = require('gulp-if');
var gutil = require('gulp-util');
var rsync = require('gulp-rsync');
var gulpSsh = require('gulp-ssh');
var argv = require('minimist')(process.argv);

// Define constants and variables
const FFMPEG_FOLDER = 'ffmpeg-20160919-11777eb-win64-static';
const FFMPEG_ZIP = FFMPEG_FOLDER + '.zip';
const FFMPEG_DL_URL = 'https://ffmpeg.zeranoe.com/builds/win64/static/'
    + FFMPEG_ZIP;
const DIR_DOWNLOADS = './download';

/*
 * Gulp Clean task for all transpiled files, temporary downloads and builds.
 * Run: "gulp clean"
 */
gulp.task('clean.public', function(){
    return gulp.src('./public', {read: false})
        .pipe(clean());
});
gulp.task('clean.downloads', function(){
    return gulp.src('./download', {read: false})
        .pipe(clean());
});
gulp.task('clean', function(callback){
    runSequence([
        'clean.public',
        'clean.downloads',
    ], callback);
});

/*
 * Gulp FFMPEG binaries instalation (Cross-platform supported).
 * Run: "gulp ffmpeg"
 */
gulp.task('ffmpeg.download', function(){
    return download(FFMPEG_DL_URL)
        .pipe(gulp.dest(DIR_DOWNLOADS));
});
gulp.task('ffmpeg.unzip', function(){
    return gulp
        .src(DIR_DOWNLOADS + '/' + FFMPEG_ZIP)
        .pipe(unzip())
        .pipe(gulp.dest(DIR_DOWNLOADS));
});
gulp.task('ffmpeg.install', function(){
    return gulp
        .src(DIR_DOWNLOADS + '/' + FFMPEG_FOLDER + '/bin/*.exe')
        .pipe(gulp.dest('./node_modules/.bin'));
});
gulp.task('ffmpeg', function(callback){
    // OS specific check to download FFMPEG via http or package manager
    if (os.platform() === 'linux'){
        return shell.task([
            'sudo apt-get install ffmpeg'
        ]);
    } else {
        // Check if the binaries exist, if so then skip the download
        fs.stat('./node_modules/.bin/ffmpeg.exe', function(errOne){
            fs.stat('./node_modules/.bin/ffprobe.exe', function(errTwo){
                if (errOne || errTwo){
                    runSequence(
                        'ffmpeg.download',
                        'ffmpeg.unzip',
                        'ffmpeg.install',
                        'clean.downloads',
                        callback
                    );
                } else {
                    console.log('>>> [GULP-ERROR] FFMPEG Already Installed!');
                    process.exit(1);
                }
            });
        });
    }
});

/*
 * Build the Angular2 client app in the public folder. The type of build
 * Development or Production) will depend on the environment variables given
 * to gulp.
 * 
 * For Production, Run:         "gulp build --PROD"
 * For Development, Run:        "gulp build"
 * For Quick Development, Run   "gulp rebuild"
 */
gulp.task('build', function(callback){
    return gutil.env.PROD || gutil.env.STAGING
        ? runSequence('build.client.prod', callback)
        : runSequence('build.client.dev', callback);
});

gulp.task('rebuild', function(callback){
    return runSequence('rebuild.client.dev', callback)
});

/*
 * Build the Angular2 client app in the public folder for Development. Includes
 * sourcemaps, unminified and unbundled code and all third party libs and 
 * pollyfills for efficient debugging.
 */
gulp.task('build.client.dev', function(callback){
    gutil.log('Build Type: Development');
    runSequence(
        'clean',
        'build.client.transpile',
        'build.client.images',
        'build.client.css',
        'build.client.index',
        'build.client.images',
        'build.client.systemjs.config',
        'build.client.systemjs.dev.inject',
        'build.client.copy.devlibs',
        'build.client.copy.libs',
        'build.client.index.dev.inject',
        callback
    );
});

/*
 * Build the Angular2 client app in the public folder for Production. All code
 * is bundled and minified, including polyfills, expect for third party libs.
 * Custom CSS styles are minified. This is due in part to reduce output size
 * for deployment.
 */
gulp.task('build.client.prod', function(callback){
    gutil.log('Build Type: Production');
    runSequence(
        'clean',
        'build.client.transpile',
        'build.client.config.prod.inject',
        'build.client.bundle',
        'build.client.transpile.clean',
        'build.client.bundle.minify',
        'build.client.polyfills.bundle.minify',
        'build.client.images',
        'build.client.css.minify',
        'build.client.index',
        'build.client.copy.libs',
        'build.client.index.prod.inject',
        callback
    );
 });

/*
 * Build the Angular2 client app in the public folder for Development. Includes
 * sourcemaps, unminified and unbundled code and all third party libs and 
 * pollyfills for efficient debugging.
 */
gulp.task('rebuild.client.dev', function(callback){
    gutil.log('Rebuild Type: Development');
    runSequence(
        'build.client.transpile',
        'build.client.images',
        'build.client.css',
        'build.client.index',
        'build.client.systemjs.config',
        'build.client.systemjs.dev.inject',
        'build.client.index.dev.inject',
        callback
    );
});

 gulp.task('build.client.transpile', function(){
    /* 
     * Embed html templates into the .ts components. Generate sourcemaps and
     * transpile all .ts code into ES5 .js code. Dump all files into the
     * public folder.
     */
     var tsProject = tsc.createProject('client/tsconfig.json');
     var tsResult = gulp.src('client/**/*.ts', {base: './client'})
        .pipe(embedTemplates())
        .pipe(sourcemaps.init())
        .pipe(tsProject())
        .on('error', function(error){
            console.log('>>> [GULP-ERROR] Transpilation failed! Please fix the '
                + 'above error(s).');
            process.exit(1);
        });
        return tsResult.js
            .pipe(sourcemaps.write())
            .pipe(gulp.dest('./public'));
 });

gulp.task('build.client.config.prod.inject', function(){
    /*
     * Replace the 'DEV' environment variable flag with PROD' for the Angular2
     * application for the Production build.
     */
    return gulp.src('./public/app/config.js')
        .pipe(inject.replace("'DEV'", "'PROD'"))
        .pipe(gulp.dest('./public/app'));
});

gulp.task('build.client.systemjs.dev.inject', function(){
    /*
     * Replace the 'source' path inside the System loader config file for the
     * Angular2 application for the Development build.
     */
    return gulp.src('./public/libs/systemjs-config.js')
        .pipe(inject.replace("./node_modules/", "./libs/"))
        .pipe(gulp.dest('./public/libs'));
});

 gulp.task('build.client.bundle', function(){
    /* 
     * Use systemjs-config-js to bundle the transpiled application code with
     * the required angular bundles and additional libraries all into one file.
     * Dump the bundle.min.js into the public/js folder.
     */
     var builder = new sysBuilder('./public',
        './client/systemjs-config.js');
     return builder.buildStatic('app', './public/js/bundle.min.js');
 });

gulp.task('build.client.bundle.minify', function(){
    /* 
     * Grab the bundle.min.js and minify it to reduce it's file size and
     * increase loading times. Dump the minified file in the same folder with
     * the same name.
     */
    return gulp.src('./public/js/bundle.min.js')
        .pipe(uglify())
        .pipe(gulp.dest('./public/js'));
});

gulp.task('build.client.polyfills.bundle.minify', function(){
    /* 
     * Grab all of the angular polyfills from node_modules, bundle them,
     * minify them and dump the file into the public/js folder with the name
     * polyfills.min.js.
     */
    return gulp.src([
        'core-js/client/shim.min.js',
        'zone.js/dist/zone.min.js',
        'reflect-metadata/Reflect.js',
        'systemjs/dist/system.src.js'
    ], {cwd: 'node_modules/**'})
        .pipe(concat('polyfills.min.js'))
        .pipe(uglify())
        .pipe(gulp.dest('./public/js'))
});

gulp.task('build.client.images', function(){
    /* 
     * Copy all of the image files required by the application to the public
     * folder.
     */
    return gulp.src([
        'img/**'
    ], {cwd: './client/**'})
        .pipe(gulp.dest('./public/'));
});

gulp.task('build.client.css', function(){
    /*
     * Copy the main css file required by the application. Dump the file with
     * the name spreza.css to the public/css folder.
     */
    return gulp.src('./client/css/spreza.css')
        .pipe(gulp.dest('./public/css/'));
});

gulp.task('build.client.css.minify', function(){
    /* 
     * Copy the main css file required by the application and minify them. Dump
     * the minified file with the name spreza.min.css to the public/css folder.
     */
    return gulp.src('./client/css/spreza.css')
        .pipe(cleanCSS())
        .pipe(rename('css/spreza.min.css'))
        .pipe(gulp.dest('./public/'));
});

gulp.task('build.client.transpile.clean', function(){
    /*
     * Delete the Angular2 client application transpiled source code.
     */
    return gulp.src('./public/app', {read: false})
        .pipe(clean());
});

gulp.task('build.client.index', function(){
    /* 
     * Copy the index.html file to the public folder.
     */
    return gulp.src([
        'index.html'
    ], {cwd: './client/app/templates'})
        .pipe(gulp.dest('./public'));
});

gulp.task('build.client.systemjs.config', function(){
    /* 
     * Copy the dev.systemjs.config.js file to the public/libs folder.
     */
    return gulp.src([
        'systemjs-config.js'
    ], {cwd: './client'})
        .pipe(gulp.dest('./public/libs'));
});

gulp.task('build.client.index.dev.inject', function(){
    /*
     * Inject the pollyfills and application loading code using systemjs for
     * the Development build into index.html.
     */
    return gulp.src('./public/index.html')
        .pipe(inject.replace('<!-- INJ_APP_CODE -->',
            '<!-- Development polyfills and systemjs -->\n'
            + '    <script src="libs/core-js/client/shim.min.js"></script>\n'
            + '    <script src="libs/zone.js/dist/zone.min.js"></script>\n'
            + '    <script src="libs/reflect-metadata/Reflect.js"></script>\n'
            + '    <script src="libs/systemjs/dist/system.src.js"></script>\n'
            + '    <script src="libs/systemjs-config.js"></script>\n'
            + '    <!-- Bootstrap our application -->\n'
            + '    <script>\n'
            + "        System.import('app/main').catch(function(err){\n"
            + '            console.error(err);\n'
            + '        });\n'
            + '    </script>'))
        .pipe(inject.replace(
            '<link rel="stylesheet" href="css/spreza.min.css">',
            '<link rel="stylesheet" href="css/spreza.css">'))
        .pipe(gulp.dest('./public'));
});

gulp.task('build.client.index.prod.inject', function(){
    /*
     * Inject the polyfill and minified application bundle scripts for the
     * Production build into index.html.
     */
    return gulp.src('./public/index.html')
        .pipe(inject.replace('<!-- INJ_APP_CODE -->',
            '<!-- Minified application bundle and polyfill scripts -->\n'
            + '    <script src="js/polyfills.min.js"></script>\n'
            + '    <script src="js/bundle.min.js"></script>\n'))
        .pipe(gulp.dest('./public'));
});

gulp.task('build.client.copy.devlibs', function(){
    /*
     * Copy all required Angular2 and additional required libraries for
     * a Development build. Files are copied to the public/libs folder.
     */
    return gulp.src([
        'rxjs/**',
        'ng2-popover/**',
        'ng2-bs3-modal/**',
        'angular2-uuid/**',
        'zone.js/dist/zone.min.js',
        'core-js/client/shim.min.js',
        'reflect-metadata/Reflect.js',
        'systemjs/dist/system.src.js',
        'core-js/client/shim.min.js.map',
        'reflect-metadata/Reflect.js.map',
        '@angular/core/bundles/core.umd.js',
        '@angular/http/bundles/http.umd.js',
        '@angular/forms/bundles/forms.umd.js',
        '@angular/common/bundles/common.umd.js',
        '@angular/router/bundles/router.umd.js',
        '@angular/compiler/bundles/compiler.umd.js',
        '@angular/platform-browser/bundles/platform-browser.umd.js',
    '@angular/platform-browser-dynamic/bundles/platform-browser-dynamic.umd.js'
    ], {cwd: 'node_modules/**'})
        .pipe(gulp.dest('public/libs/'));
});

gulp.task('build.client.copy.libs', function(){
    /* 
     * Copy all the required third party javascript libraries required by the
     * the application. Can include css and other files used by the libraries.
     * Files are copied to the public/libs folder.
     */
    return gulp.src([
        'font-awesome/fonts/**',
        'jquery/dist/jquery.min.js',
        'toastr/build/toastr.js.map',
        'toastr/build/toastr.min.js',
        'toastr/build/toastr.min.css',
        'socket.io-client/socket.io.js',
        'wavesurfer.js/dist/wavesurfer.js',
        'socket.io-client/socket.io.js.map',
        'bootstrap/dist/js/bootstrap.min.js',
        'bootflat/bootflat/js/icheck.min.js',
        'bootstrap/dist/css/bootstrap.min.css',
        'font-awesome/css/font-awesome.min.css',
        'bootflat/bootflat/css/bootflat.min.css',
        'bootstrap/dist/css/bootstrap.min.css.map',
        'bootflat/bootflat/js/jquery.fs.stepper.min.js',
        'bootflat/bootflat/js/jquery.fs.selecter.min.js',
        'bootstrap-select/dist/js/bootstrap-select.min.js',
        'bootstrap-select/dist/js/bootstrap-select.js.map',
        'jquery-smooth-scroll/jquery.smooth-scroll.min.js',
        'bootstrap-select/dist/css/bootstrap-select.min.css',
        'bootstrap/dist/fonts/glyphicons-halflings-regular.ttf',
        'bootstrap/dist/fonts/glyphicons-halflings-regular.woff',
        'bootstrap/dist/fonts/glyphicons-halflings-regular.woff2'
    ], {cwd: 'node_modules/**'})
        .pipe(gulp.dest('public/libs/'));
});

gulp.task('quick', function(callback){
    runSequence(
        'build.client',
        'build.bundle.client',
        'build.clear.client',
        'build.copy.images',
        'build.copy.index',
        callback
    );
});


//////////////////////////////////////
//Deployment on the remote staging server



gulp.task('stage', function() {

  // Dirs and Files to sync
  rsyncPaths = ['public', 'server', 'package.json', 'gulpfile.js' ];

  // Default options for rsync
  rsyncConf = {
    progress: true,
    incremental: true,
    relative: true,
    emptyDirectories: true,
    recursive: true,
    clean: true,
    exclude: [],
    hostname: 'ec2-54-174-189-91.compute-1.amazonaws.com',
    username: 'ubuntu',
    destination: '~'
  };

  // Use gulp-rsync to sync the files
  return gulp.src(rsyncPaths).pipe(rsync(rsyncConf));
});

gulp.task('update', function () {
  var gulpSSH = new gulpSsh({
    ignoreErrors: false,
    sshConfig: {
      //Needs to reflect the staging server config
      host: 'ec2-54-174-189-91.compute-1.amazonaws.com',
      port: 22,
      username: 'ubuntu',
      //This needs to be modified according to host machine
      privateKey: fs.readFileSync('/home/d/.ssh/id_rsa')
    }
  })
    .shell(['cd ~', 'sudo apt-get install ffmpeg', 'npm install pm2 -g', 'npm install', 'npm update'], {filePath: 'shell.log'})
    .pipe(gulp.dest('logs'))
})

gulp.task('start', function () {
  var gulpSSH = new gulpSsh({
    ignoreErrors: false,
    sshConfig: {
      //Needs to reflect the staging server config
      host: 'ec2-54-174-189-91.compute-1.amazonaws.com',
      port: 22,
      username: 'ubuntu',
      //This needs to be modified according to host machine
      privateKey: fs.readFileSync('/home/d/.ssh/id_rsa')
    }
  })
    .shell(['cd ~', 'NODE_ENV=STAGING pm2 start npm -- start'], {filePath: 'shell.log'})
    .pipe(gulp.dest('logs'))
})

gulp.task('stop', function () {
  var gulpSSH = new gulpSsh({
    ignoreErrors: false,
    sshConfig: {
      //Needs to reflect the staging server config
      host: 'ec2-54-174-189-91.compute-1.amazonaws.com',
      port: 22,
      username: 'ubuntu',
      //This needs to be modified according to host machine
      privateKey: fs.readFileSync('/home/d/.ssh/id_rsa')
    }
  })
    .shell(['cd ~', 'pm2 stop all'], {filePath: 'shell.log'})
    .pipe(gulp.dest('logs'))
})

gulp.task('deploy', function(callback){
    runSequence(
        'build.client.prod',
        'stop',
        'stage',
        'update', //Note- this takes a long time. Do it occasionally.
        'start',
        callback
    );
});
function throwError(taskName, msg) {
  throw new gutil.PluginError({
      plugin: taskName,
      message: msg
    });
}
