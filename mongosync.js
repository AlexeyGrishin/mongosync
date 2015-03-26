
var fs = require('fs-extra')
  , path = require('path')
  , EventEmitter = require('events').EventEmitter
  , chokidar = require('chokidar')
  , mongo = require('mongodb');




module.exports = function(directory, url, collectionNames) {
    var e = new EventEmitter();
    function error(msg) {
        e.emit('error', msg);
    }
    function noerr(cb) {
        return function(err, value) {
            if (err) return error(err);
            cb(value);
        }
    }

    function watchCollection(collection, name) {
        var colDir = path.join(directory, name);
        fs.mkdirsSync(colDir);

        function saveToFile(item) {
            fs.writeJsonSync(path.join(colDir, item._id + ".json"), item);
        }

        function pullFromDb(next) {
            collection.find().toArray(noerr(function (items) {
                items.forEach(saveToFile);
                e.emit('pull', name);
                next();
            }));
        }

        function pushToDb(filePath, shallDelete) {
            if (path.extname(filePath) !== '.json') return;
            var id = path.basename(filePath, '.json');
            function notify() {
                e.emit('push', name, id);
            }
            if (shallDelete) {
                collection.deleteOne({_id: id}, noerr(notify));
            }
            else {
                try {
                    var contents = fs.readFileSync(filePath, {encoding: "utf-8"});
                    if (contents.length < 2) return;
                    var json = JSON.parse(contents);
                    json._id  = id;
                }
                catch (ignore) {
                    return e.emit('warning', name, id);
                }
                collection.updateOne({_id: id}, json, {upsert: true}, noerr(notify));
            }
        }

        pullFromDb(function() {
            chokidar.watch(colDir, {ignoreInitial: true}).on('all', function (ev, path) {
                if (ev === 'add') return;
                pushToDb(path, ev === 'unlink');
            });
        });
    }

    function prepareDirectory(next) {
        try {
            if (fs.existsSync(directory)) {
                fs.removeSync(directory);
            }
            fs.mkdirSync(directory);
            next();
        }
        catch (e) {
            error(e);
        }
    }



    mongo.connect(url, noerr(function(db) {
        prepareDirectory(function() {
            collectionNames.forEach(function(colname) {
                db.collection(colname, noerr(function(col) {
                    watchCollection(col, colname);
                }));
            });
        });
    }));
    return e;
};

