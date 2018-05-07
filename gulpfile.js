const gulp = require('gulp');
const gutil = require('gulp-util');
const replace = require('gulp-replace');
const clean = require('gulp-clean');
const runSequence = require('run-sequence');
const eslint = require('gulp-eslint');
const through = require('through2');
const cheerio = require('cheerio');
const htmlmin = require('gulp-html-minifier');
const jsonfile = require('jsonfile');
const coveralls = require('gulp-coveralls');

const paths = {
    build: 'dist',
    buildComponents: 'dist/web-components/',
    polyfills: 'bower_components/webcomponentsjs/*.js',
    polyfillsDist: 'dist/polyfills/',
    node_modules_dependencies: 'node_modules/**',
    components: 'src/**'
};

const packageJson = jsonfile.readFileSync('package.json');

gulp.task('clean-dist', function () {
    gutil.log('Cleaning dist of the components');
    return gulp.src([paths.build])
        .pipe(clean());
});

gulp.task('copy-package-json', function () {
    gutil.log('Copying package.json');
    let newPackageJson = {
        name: packageJson.name,
        version: packageJson.version,
        private: false,
        dependencies: packageJson.dependencies
    };
    let distPackageJson = './' + paths.build + '/package.json';
    jsonfile.writeFileSync(distPackageJson, newPackageJson, {spaces: 2});

    return;
});

gulp.task('addVersion', function () {
    let fileTypes = [
        {
            name: 'script',
            srcAttribute: 'src'
        },
        {
            name: 'link',
            srcAttribute: 'href'
        }
    ];
    let versionGUID = 'v' + packageJson.version;
    let addVersionToImports = through.obj(function (file, enc, cb) {
        console.log('FILE', file.path);
        let $ = cheerio.load(file.contents.toString());
        for (let i = 0; i < fileTypes.length; i++) {
            let attributes = fileTypes[i];
            let $assets = $(attributes.name);
            for (let j = 0; j < $assets.length; j++) {
                let $asset = $assets.eq(j);
                let src = $asset.attr(attributes.srcAttribute);
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

gulp.task('package-components', function () {
    gutil.log('Generating components');

    return gulp.src(paths.components)
        .pipe(replace(/((\.\.?\/?)*(bower_components|node_modules))/g, '../../lib', {
            skipBinary: true
        }))
        .pipe(gulp.dest(paths.buildComponents));
});

gulp.task('copy-polyfills', function(){
    gutil.log('Copying libs');
    return gulp.src([paths.polyfills, "!**/gulpfile.js", "!**/custom-elements-es5-adapter.js"])
        .pipe(gulp.dest(paths.polyfillsDist));
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



gulp.task('build', function (callback) {
    runSequence('clean-dist', 'package-components', 'copy-polyfills', 'addVersion', 'copy-package-json', "obfuscate", callback);
});

gulp.task('lint', function () {
    return gulp.src(['src/**/*.js', 'src/**/*.html']).pipe(eslint({
        fix: false
    }))
        .pipe(eslint.result(function (result) {
            gutil.log('ESLint result: ' + result.filePath);
            for (let i = 0; i < result.messages.length; i++) {
                gutil.log(result.messages[i]);
            }
        }))
        .pipe(eslint.failAfterError());
});

gulp.task('coveralls', function() {
    return gulp.src('coverage/**/lcov.info')
        .pipe(coveralls());
});

// create a default task
gulp.task("default", ["build-zip"]);