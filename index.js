/* -------------------------------------
 *  HTML Entry Point Plugin for Webpack
 * -------------------------------------
 * Builds HTML entry points (think index.html), one for each asset (e.g. main and test).
 */

var fs = require("fs");
var path = require("path");
var _ = require("underscore");

function parallel (fs, cb) {
  var d = fs.length;
  _.each(fs, function (f) { f(function () { if (!--d) cb(); }); });
}

function green(str) {
  return "\u001b[1m\u001b[32m" + str + "\u001b[39m\u001b[22m";
}

function log (msg) {
  process.stdout.write(green("HTML") + " " + msg + "\n");
}

function HtmlEntryPointPlugin (options) {
  this.options = options || {};
}

HtmlEntryPointPlugin.prototype.apply = function (compiler) {

  var options = this.options;

  compiler.plugin("emit", function (compilation, callback) {

    log("Start");

    var assets = _.map(compilation.assets, function (v, asset) {
      // TODO: consider using compilation.modules instead of regex on asset.
      var templateOptions = _.find(options.templates, function (o) { return o.test.test(asset); });
      if (!templateOptions) {
        throw new Error("No template options for " + asset);
      }
      var template = templateOptions.template;
      return { asset, template };
    });

    if (!assets.length) {
      log("Done - no assets");
      callback();
    } else {
      // Generate a templated HTML file for each asset, (e.g. main & tests).
      parallel(_.map(assets, function (x) {
        var asset = x.asset;
        var template = x.template;
        var result = path.basename(template);

        // Adding this line causes a "rebuild" when the template file changes.
        // *But* there is no output from the `webpack` command because the hash doesn't change.
        compilation.fileDependencies.push(path.join(compiler.context, template));

        return function (done) {
          fs.readFile(template, "utf8", function (err, data) {

            if (err) {
              if (err.code === "ENOENT" && err.path) {
                throw new Error("Template missing at: " + err.path);
              } else {
                throw err;
              }
            }

            // TODO: template the raw HTML
            var html = data.replace("{{asset}}", asset);

            compilation.assets[path.join(options.output, result)] = {
              source: function () {
                return html;
              },
              size: function () {
                return html.length;
              }
            };
            log("Built: " + result);
            done();
          });
        };
      }), function () {
        log("Done");
        callback();
      });
    }
  });
};

module.exports = HtmlEntryPointPlugin;
