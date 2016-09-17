var _           = require('lodash');
var fs          = require('fs-extra');
var http        = require('http');
var    path        = require('path');
var    util        = require('util');
var    Promise     = require('bluebird');

var options     = {};

var  mimeTypes   = {
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
  '.svgz': 'image/svg+xml',
};

var  mountPoint = 'content/images';
var  baseStore = require('../../../node_modules/ghost/core/server/storage/base');

function HTTPStore(config) {
  baseStore.call(this);
  options = config;
}

util.inherits(HTTPStore, baseStore);

HTTPStore.prototype.save = function (image) {
  var targetDir = this.getTargetDir(mountPoint);

  return new Promise(function (resolve, reject) {
    this.getUniqueFileName(this, image, targetDir).then(function (filename) {
      var stream = fs.createReadStream(image.path);
      var req = http.request(_.extend(options, {
        method: 'PUT',
        path: filename,
      }), function (res) {
        if (res.statusCode === 201 || res.statusCode === 409) {
          resolve(filename);
        } else {
          reject('Error');
        }
      });

      req.on('error', function (e) {
        reject('Error: ' + e);
      });

      stream.pipe(req);

      stream.on('end', function () {
        req.end();
      });
    }).catch(function (err) {
      console.error('Error', err);
    });
  });
};

HTTPStore.prototype.exists = function (filename) {
  return new Promise(function (resolve, reject) {
    var req = http.request(_.extend(options, {
      method: 'GET',
      path: filename,
    }), function (res) {
      if (res.statusCode === 200) {
        resolve(true);
      } else if (res.statusCode === 404) {
        resolve(false);
      } else {
        reject('Proxy Error');
      }
    });

    req.on('error', function () {
      resolve(false);
    });

    req.end();
  });
};

HTTPStore.prototype.serve = function () {
  return function (req, res) {
    var getRequest = http.request(_.extend(options, {
      method: 'GET',
      path: req.path,
    }), function (getResponse) {
      if (getResponse.statusCode === 200) {
        res.setHeader('Content-Type', mimeTypes[path.extname(req.path)]);
        res.setHeader('Cache-Control', 'public, max-age=31536000000');

        getResponse.pipe(res);
      } else {
        res.sendStatus(404);
      }
    });

    getRequest.on('error', function () {
      res.sendStatus(503);
    });

    getRequest.end();
  };
};

HTTPStore.prototype.delete = function (fileName) {
  var targetDir = this.getTargetDir(mountPoint);

  return new Promise(function (resolve, reject) {
    this.getUniqueFileName(this, image, targetDir).then(function (filename) {
      var stream = fs.createReadStream(image.path);
      var req = http.request(_.extend(options, {
        method: 'DELETE',
        path: filename,
      }), function (res) {
        if (res.statusCode === 201 ||
            res.statusCode == 200 ||
            res.statusCode === 409) {
          resolve();
        } else {
          reject('Error');
        }
      });

      req.on('error', function (e) {
        reject('Error: ' + e);
      });

      req.end();
    }).catch(function (err) {
      console.error('Error', err);
    });
  });
};

module.exports = HTTPStore;
