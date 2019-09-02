const U = require('./util');
const c = require('./constants');
const BaseChildOp = require('./baseChildOp');

/**@type {{[body:string]:number}} */
const BODY_SORT = {'tough': 1, 'move': 2, 'carry': 3, 'work': 4 , 'claim': 5, 'attack': 6, 'ranged_attack': 7, 'heal': 8};

module.exports = class SpawningOp extends BaseChildOp {
    /**@param {BaseOp} baseOp */
    constructor(baseOp) {
        super(baseOp);
        /**@type {StructureSpawn[]} */
        this._spawns = [];
        /**@type {{[index:string] : {operation:ShardChildOp, count:number, template:CreepTemplate}}} */
        this._spawnRequests = {};
        this._builderRequest = '';
        this._shardColonizer = '';
        this._shardColBuilder = '';

        /**@type {number[]} */
        this._spawnPrio = [];
    }

    get type() {return c.OPERATION_SPAWNING}

    initTick() {
        this._spawns = /**@type {StructureSpawn[]} */(this._baseOp.getMyStructures(STRUCTURE_SPAWN));
    }

    /**@param {ShardChildOp} operation */
    /**@param {CreepTemplate} template */
    /**@param {number} count */
    ltRequestSpawn(operation, template, count) {
        this._spawnRequests[operation.id] = {operation:operation, count:count, template: template};
    }

    /**@param {string} roomName */
    requestBuilder(roomName) {
        this._builderRequest = roomName;
    }

    /**@param {string} shard */
    /**@param {number} requestType} */
    requestShardColonizers(shard, requestType){
        switch (requestType) {
            case c.SHARDREQUEST_BUILDER:
                this._shardColBuilder = shard;
                break;
            case c.SHARDREQUEST_COLONIZER:
                this._shardColonizer = shard;
                break;
        }
    }

    _strategy() {
        if(this._spawnPrio.length == 0) {
            this._spawnPrio[c.OPERATION_FILLING] = 100;
            this._spawnPrio[c.OPERATION_BUILDING] = 20;
            this._spawnPrio[c.OPERATION_UPGRADING] = 10;
            this._spawnPrio[c.OPERATION_COLONIZING] = 10;
        }
    }

    _command() {
        let canSpawn = false;
        for (let spawn of this._spawns) if (spawn.spawning == null) canSpawn = true;
        if (canSpawn) {
            let base = this._baseOp.getBase();
            if ((this._builderRequest || this._shardColBuilder || this._shardColonizer)
                && base.controller.ticksToDowngrade >= CONTROLLER_DOWNGRADE[base.controller.level]/2
                && this._baseOp.fillingOp.getCreepCount() >= this._spawnRequests[this._baseOp.fillingOp.id].count
                )  this._prioritySpawn();
            else {
                let spawnList = this._getSpawnList();
                if (spawnList.length > 0 ) {
                    for (let spawn of this._spawns) {
                        if (spawn.spawning == null) {
                            let spawnItem = spawnList.pop();
                            if (spawnItem) {
                                let body = this._expandCreep(spawnItem.template);
                                let result = spawn.spawnCreep(body, spawn.room.name + '_' + spawnItem.opType + '_' + _.random(0, 999999999) )
                                if (result != OK) spawnList.push(spawnItem);
                                // debug invalid spawn errors 
                                if (result == -10) {
                                    U.l(body);
                                    U.l(spawn.room.name + '_' + spawnItem.opType + '_' + _.random(0, 999999999))
                                    throw Error('invalid body or or name')
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    _prioritySpawn() {
        let body = [];
        if (this._shardColonizer) {
            body = [MOVE,CLAIM];    
            let roomName = this._shardColonizer
            for (let spawn of this._spawns) {
                let result = spawn.spawnCreep(body, roomName + '_' + c.OPERATION_SHARDCOLONIZING + '_' + _.random(0, 999999999))
                if (result == OK) this._shardColonizer = '';
            }
        } else  if (this._shardColBuilder) {
            body = this._expandCreep({body:[MOVE,CARRY,WORK]});
            let roomName = this._shardColBuilder
            for (let spawn of this._spawns) {
                let result = spawn.spawnCreep(body, roomName + '_' + c.OPERATION_SHARDCOLONIZING + '_' + _.random(0, 999999999))
                if (result == OK) this._shardColBuilder = '';
            }
        } else  if (this._builderRequest) {
            body = this._expandCreep({body:[MOVE,CARRY,WORK]});
            let roomName = this._builderRequest
            for (let spawn of this._spawns) {
                let result = spawn.spawnCreep(body, roomName + '_' + c.OPERATION_BUILDING + '_' + _.random(0, 999999999))
                if (result == OK) this._builderRequest = '';
            }
        }
    }

    _getSpawnList() {
        let base = this._baseOp.getBase();
        /**@type {{prio:number, opType:number, template:CreepTemplate}[]} */
        let spawnList = []
        let spawnRequests = this._spawnRequests;

        for (let spawnRequestId in this._spawnRequests) {
            let spawnRequest = spawnRequests[spawnRequestId];
            let teamOp = spawnRequest.operation;
            let nCreeps = 0;
            if (teamOp) nCreeps = teamOp.getCreepCount();
            if (spawnRequest.count > nCreeps) {
                let opType = teamOp.type;
                spawnList.push ({prio: (spawnRequest.count - nCreeps) / spawnRequest.count * this._spawnPrio[opType], opType: opType, template:spawnRequest.template})
            }
        }

        spawnList.sort((a, b) => {  if (a.prio < b.prio) return -1;
                                    if (a.prio > b.prio) return 1;
                                    return 0;
                                 });
        return spawnList;
    }


    /**@param {CreepTemplate} template */
    _expandCreep (template) {
        /**@type {BodyPartConstant[]} */
        let body = template.body;
        let minLength = template.minLength;
        let maxLength = template.maxLength;
        if (!minLength) minLength = 3
        if (!maxLength || maxLength > MAX_CREEP_SIZE) maxLength = MAX_CREEP_SIZE;

        /**@type {BodyPartConstant[]} */
        var result = [];
        var i=0;
        var maxEnergy = this._baseOp.getMaxSpawnEnergy();
        while (U.getCreepCost(result) <= maxEnergy && result.length < Math.min(maxLength + 1, MAX_CREEP_SIZE + 1)) {
            result.push(body[i++]);
            i = i % body.length;
        }
        result.pop(); // de laatste er altijd uitgooien omdat die energie overschrijdt
        result.sort((/**@type {string} */partA, /**@type {string} */ partB) => {
            if (BODY_SORT[partA] < BODY_SORT[partB]) return -1;
            if (BODY_SORT[partA] > BODY_SORT[partB]) return 1;
            return 0;
        });
    
        if (result.length>= minLength) return result;
        else return [];
    }
}
