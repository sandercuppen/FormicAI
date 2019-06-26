let U = require('./util');
const c = require('./constants');
let CreepTeamOp = require('./teamOp');

module.exports = class CreepBuilderOp extends CreepTeamOp {
    _strategy() {
        let creepCount = 0;
        let constructionCount = this._baseOp.getBase().find(FIND_CONSTRUCTION_SITES).length
        if (constructionCount > 0) creepCount = 8;
        this._spawningOp.ltRequestSpawn(c.OPERATION_BUILDING, {body:[MOVE,CARRY,WORK]}, creepCount)

        if (constructionCount>0) {
            for (let creepName in this._creepOps) {
                let creepOp = this._creepOps[creepName];
                let dest = creepOp.getDest();
                if (!(dest instanceof ConstructionSite)
                || (creepOp.getInstr() != c.COMMAND_TRANSFER) ) 
                {
                    let source = creepOp.getPos().findClosestByPath(FIND_SOURCES_ACTIVE);
                    let dest = creepOp.getPos().findClosestByPath(FIND_MY_CONSTRUCTION_SITES)
                    if (source && dest) creepOp.instructTransfer(source, dest);
                }
            }
        } else for (let creepName in this._creepOps) this._creepOps[creepName].instrStop();

    }
}