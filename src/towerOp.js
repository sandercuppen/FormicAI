let U = require('./util');
const c = require('./constants');
let Operation = require('./operation');
/**@typedef {import('./baseOp')} BaseOp  */

const MAX_HITS_REPAIR_PER_LEVEL = 10000

module.exports = class TowerOp extends Operation {
    /**@param {StructureTower[]} towers */
    /**@param {BaseOp} baseOp */
    constructor(towers, baseOp) {
        super();
        this._towers = towers;
        /**@type {BaseOp} */
        this._baseOp = baseOp;
    }

    /**@param {StructureTower[]} towers */
    initTick(towers) {
        this._towers = towers;
    }

    _command() {
        let hostile = this._getInvader()
        for (let tower of this._towers) {
            if (hostile) {
                tower.attack(hostile);
                return;
            }
            var creepsHit = tower.room.find(FIND_MY_CREEPS, {filter: (creep) => {return (creep.hits < creep.hitsMax );}} );
            if (creepsHit) {
                let creep = tower.pos.findClosestByRange(creepsHit)
                if (creep) tower.heal(creep);
                return;
            }
            var structuresHit = tower.room.find(FIND_STRUCTURES, {filter: (structure) => {return (structure.hits < structure.hitsMax - TOWER_POWER_REPAIR && structure.hits < MAX_HITS_REPAIR_PER_LEVEL * this._baseOp.getLevel())}});
            if (structuresHit) {
                var target = structuresHit[0];
                for(var i = 1;i<structuresHit.length;i++) if (target.hits > structuresHit[i].hits) target = structuresHit[i];
                tower.repair(target);
                return;
            }        
        }
    }

    /**@returns {Creep | undefined} */
    _getInvader() {
        var invaders = this._baseOp.getBase().find(FIND_HOSTILE_CREEPS);
        var target = invaders[0];
        var targetHealParts = 0;
        for (var invader of invaders) {
            var body = invader.body;
            var healParts = 0;
            for (var bodyPart of body) if(bodyPart.type == HEAL) healParts++;
            if (healParts < targetHealParts) {
                target = invader;
                targetHealParts = healParts;
            }
        }
        return target;
    }
}
