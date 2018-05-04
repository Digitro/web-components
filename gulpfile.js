var gulp = require('gulp');
var gutil = require('gulp-util');
var merge = require('merge-stream');
var replace = require('gulp-replace');
var zip = require('gulp-zip');
var clean = require('gulp-clean');
var runSequence = require('run-sequence');
var eslint = require('gulp-eslint');

var through = require('through2');
var fs = require('fs');
var cheerio = require('cheerio');

var htmlmin = require('gulp-html-minifier');
var jsonfile = require('jsonfile');

var path = require('path');

var paths = {
    webcomponentsjs: "lib/*.js",
    build: 'dist',
    buildLibs: 'dist/lib/',
    buildComponents: 'dist/sgt-dgt-components/',
    component_dependencies: 'bower_components/**',
    component_dependencies_dir: 'bower_components/',
    node_modules_dependencies: 'node_modules/**',
    components: 'src/**',
    buildExamples: 'dist/examples/',
    examples: 'examples/**',
    warDir: 'webapp/**/*',
    buildWarDir: 'dist/wc.war/'
};

var packageJson = jsonfile.readFileSync('package.json');

gulp.task('clean-dist', function () {
    gutil.log('Cleaning dist of the components');
    return gulp.src([paths.build])
        .pipe(clean());
});

gulp.task('copy-libs', function () {
    gutil.log('Copying libs');
    return  gulp.src(paths.webcomponentsjs)
            .pipe(gulp.dest(paths.buildLibs));

});

gulp.task('copy-package-json', function () {
    gutil.log('Copying package.json');
    var newPackageJson = {
        name: packageJson.name + "-dist",
        version: packageJson.version,
        private: false,
        dependencies: packageJson.dependencies
    };
    var distPackageJson = './' + paths.build + '/package.json';
    jsonfile.writeFileSync(distPackageJson, newPackageJson, {spaces: 2});

    return;
});

gulp.task('addVersion', function () {
    var fileTypes = [
        {
            name: 'script',
            srcAttribute: 'src'
        },
        {
            name: 'link',
            srcAttribute: 'href'
        }
    ];
    var versionGUID = 'v' + packageJson.version;
    var addVersionToImports = through.obj(function (file, enc, cb) {
        console.log('FILE', file.path);
        var $ = cheerio.load(file.contents.toString());
        for (var i = 0; i < fileTypes.length; i++) {
            var attributes = fileTypes[i];
            var $assets = $(attributes.name);
            for (var j = 0; j < $assets.length; j++) {
                var $asset = $assets.eq(j);
                var src = $asset.attr(attributes.srcAttribute);
                if (src && !src.match(/.*(\/\/).*/)) {
                    $asset.attr(attributes.srcAttribute,  src + '?_v=' + versionGUID);
                }
            }
        }
        file.contents = new Buffer($.html());
        this.push(file);
        return cb();
    });
    return gulp.src(paths.buildComponents + '**/*.html')
        .pipe(addVersionToImports)
        .pipe(gulp.dest(paths.buildComponents));
});

gulp.task('package-components', ['copy-libs'], function () {
    gutil.log('Generating components');

    return gulp.src(paths.components)
        .pipe(replace(/((\.\.?\/?)*(bower_components|node_modules))/g, '../../lib', {
            skipBinary: true
        }))
        .pipe(gulp.dest(paths.buildComponents));
});

gulp.task('obfuscate', function () {
    return gulp.src([paths.buildComponents + '**/dgt*.html'])
        .pipe(htmlmin({
            removeEmptyAttributes: true,
            collapseWhitespace: true,
            conservativeCollapse: true,
            minifyJS: true,
            minifyCSS: true,
            removeComments: true,
            removeCommentsFromCDATA: true,
            removeCDATASectionsFromCDATA: true
        }))
        .pipe(gulp.dest(paths.buildComponents));

});

gulp.task('package-examples', function () {
    gutil.log('Generating examples');

    return gulp.src(paths.examples)
        .pipe(replace('../src/', '../sgt-dgt-components/', {
            skipBinary: true
        }))
        .pipe(replace(/((\.\.?\/?)*(bower_components|node_modules))/g, '../lib', {
            skipBinary: true
        }))
        .pipe(gulp.dest(paths.buildExamples));
});

gulp.task('zip', function () {
    gutil.log('zip stuff');
    gulp.src(paths.build + '/**')
        .pipe(zip('sgt-webcomponents.zip'))
        .pipe(gulp.dest(paths.build));
});

gulp.task('war', function () {
    gutil.log('war stuff');
    gulp.src(paths.warDir)
        .pipe(gulp.dest(paths.buildWarDir));

    gulp.src(paths.buildComponents + '**/*')
        .pipe(gulp.dest(paths.buildWarDir + 'sgt-dgt-components/'));

    gulp.src(paths.buildLibs + '**/*')
        .pipe(gulp.dest(paths.buildWarDir + 'lib/'));
});

gulp.task('build-zip', function (callback) {
    runSequence('clean-dist', 'package-components', 'addVersion', 'copy-package-json', "obfuscate", 'zip', callback);
});

gulp.task('build-war', function (callback) {
    runSequence('clean-dist', 'package-components', 'addVersion', 'copy-package-json', "obfuscate", 'war', callback);
});

gulp.task('lint', function () {
    return gulp.src(['src/**/*.js', 'src/**/*.html']).pipe(eslint({
        fix: false
    }))
        .pipe(eslint.result(function (result) {
            gutil.log('ESLint result: ' + result.filePath);
            for (var i = 0; i < result.messages.length; i++) {
                gutil.log(result.messages[i]);
            }
        }))
        .pipe(eslint.failAfterError());
});

function getFolders(dir) {
    return fs.readdirSync(dir)
        .filter(function(file) {
            return fs.statSync(path.join(dir, file)).isDirectory();
        });
}

// create a default task
gulp.task("default", ["build-zip"]);