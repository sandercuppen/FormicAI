let U = require('./util');
const c = require('./constants');
let Operation = require('./operation');
let CreepOp = require('./creepOp');
let SpawningOp = require('./spawningOp');
/**@typedef {import('./baseOp')} BaseOp  */

module.exports = class CreepTeamOp extends Operation {
    /**@param {Creep[]} creeps */
    /**@param {BaseOp} baseOp */
    /**@param {SpawningOp} spawningOp*/
    constructor(creeps, baseOp, spawningOp) {
        super();
        this._baseOp = baseOp;
        this._spawningOp = spawningOp;
        /**@type {{[creepName:string]:CreepOp}} */
        this._creepOps = {}
        this.initTick(creeps);
    }

    /**@param {Creep[]} creeps */
    initTick(creeps) {
        for(let creep of creeps) {
            if (!this._creepOps[creep.name]) this._creepOps[creep.name] = new CreepOp(creep);
            else this._creepOps[creep.name].initTick(creep);
        }
    }

    getCreepCount(){
        return _.size(this._creepOps);
    }

    _command() {
        for (let creepName in this._creepOps) {
            if (U.getCreep(creepName)) this._creepOps[creepName].run();
            else delete this._creepOps[creepName];
        }
    }
}
