let ShardOp = require('./shardOp');

class Main {
    constructor() {
        this._shardOp = new ShardOp();
    }

    run() {
        this._strategy();
        this._command();
    }

    /** @private */
    _strategy() {};

    /** @private */
    _command() {
        this._shardOp.run();
    };
}


module.exports.loop = function() {
    let main = new Main;
    main.run();
    
}
