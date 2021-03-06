const U = require('./util');
const c = require('./constants');
const BaseChildOp = require('./base_childOp');

/**@type {{[body:string]:number}} */
const BODY_SORT = {'tough': 1, 'move': 2, 'carry': 3, 'work': 4 , 'claim': 5, 'attack': 6, 'ranged_attack': 7, 'heal': 8};
const MAX_OPERATION_IDLE_TIME = 25;

module.exports = class SpawningOp extends BaseChildOp {
    /**@param {BaseOp} baseOp */
    constructor(baseOp) {
        super(baseOp);
        /**@type {{[index:string] : {operation:ShardChildOp, count:number, template:CreepTemplate}}} */
        this._spawnRequests = {};
        this._builderRequest = '';
        this._shardColonizer = '';
        this._shardColBuilder = '';

        /**@type {number[]} */
        this._spawnPrio = [];
        this._verbose = false;
    }

    get type() {return c.OPERATION_SPAWNING}

    /**
     * @param {ShardChildOp} operation
     * @param {CreepTemplate} template
     * @param {number} count */
    ltRequestSpawn(operation, template, count) {
        this._spawnRequests[operation.id] = {operation:operation, count:count, template: template};
    }

    /**@param {string} roomName */
    requestBuilder(roomName) {
        this._builderRequest = roomName;
    }

    /**
     * @param {string} shard
     * @param {number} requestType} */
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

    _firstRun() {
        this._strategy();
    }
    
    _strategy() {
        if(this._spawnPrio.length == 0) {
            this._spawnPrio[c.OPERATION_FILLING] = 100;
            this._spawnPrio[c.OPERATION_HARVESTING] = 50;
            this._spawnPrio[c.OPERATION_LINK] = 40;
            this._spawnPrio[c.OPERATION_BUILDING] = 20;
            this._spawnPrio[c.OPERATION_UPGRADING] = 2;
            this._spawnPrio[c.OPERATION_COLONIZING] = 75;
            this._spawnPrio[c.OPERATION_SCOUTING] = 1;
        }
    }

    _command() {
        let canSpawn = false;
        let spawns = this._baseOp.spawns;
        for (let spawn of spawns) if (spawn.spawning == null) canSpawn = true;
        if (canSpawn) {
            let base = this._baseOp.base;
            if ((this._builderRequest || this._shardColBuilder || this._shardColonizer)
                && base.controller.ticksToDowngrade >= CONTROLLER_DOWNGRADE[base.controller.level]/2
                && this._baseOp.fillingOp.creepCount >= 1
                )  this._prioritySpawn();
            else {
                let spawnList = this._getSpawnList();
                this._log(spawnList);
                if (spawnList.length > 0 ) {
                    for (let spawn of spawns) {
                        if (spawn.spawning == null) {
                            let spawnItem = spawnList.pop();
                            if (spawnItem) {
                                let body = this._expandCreep(spawnItem.template);
                                if (body.length>0) {
                                    let result = spawn.spawnCreep(body, spawn.room.name + '_' + spawnItem.opType + '_' + spawnItem.opInstance + '_' + _.random(0, 999999) )
                                    if (result != OK) spawnList.push(spawnItem);
                                    this._log(body);
                                    this._log(result);
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
        let spawns = this._baseOp.spawns;
        if (this._shardColonizer) {
            body = [MOVE,CLAIM];    
            let roomName = this._shardColonizer
            for (let spawn of spawns) {
                let result = spawn.spawnCreep(body, roomName + '_' + c.OPERATION_SHARDCOLONIZING + '_0_' + _.random(0, 999999999))
                if (result == OK) this._shardColonizer = '';
            }
        } else  if (this._shardColBuilder) {
            body = this._expandCreep({body:[MOVE,CARRY,WORK]});
            let roomName = this._shardColBuilder
            for (let spawn of spawns) {
                let result = spawn.spawnCreep(body, roomName + '_' + c.OPERATION_SHARDCOLONIZING + '_0_' + _.random(0, 999999999))
                if (result == OK) this._shardColBuilder = '';
            }
        } else  if (this._builderRequest) {
            body = this._expandCreep({body:[MOVE,CARRY,WORK]});
            let roomName = this._builderRequest
            for (let spawn of spawns) {
                let result = spawn.spawnCreep(body, roomName + '_' + c.OPERATION_BUILDING + '_0_' + _.random(0, 999999999))
                if (result == OK) this._builderRequest = '';
            }
        }
    }

    _getSpawnList() {
        /**@type {{prio:number, opType:number, opInstance:number, template:CreepTemplate}[]} */
        let spawnList = []
        let spawnRequests = this._spawnRequests;

        for (let spawnRequestId in this._spawnRequests) {
            let spawnRequest = spawnRequests[spawnRequestId];
            let shardChildOp = spawnRequest.operation;
            let nCreeps = 0;
            if (shardChildOp) nCreeps = shardChildOp.creepCount;
            this._log({lastIdle: shardChildOp.lastIdle, idleCount: shardChildOp.idleCount, spawnrequesttype: spawnRequest.operation.type, template:spawnRequest.template, count:spawnRequest.count })
            if (nCreeps > 0 && shardChildOp.lastIdle > Game.time - MAX_OPERATION_IDLE_TIME) continue; //don't spawn if it has idle creeps
            if (U.getCreepCost(spawnRequest.template.body) > this._baseOp.base.energyCapacityAvailable) continue; // don't spawn
            if (spawnRequest.count > nCreeps) {
                let opType = shardChildOp.type;
                let opInstance = shardChildOp.instance;
                spawnList.push ({prio: (spawnRequest.count - nCreeps) / spawnRequest.count * this._spawnPrio[opType], opType: opType, opInstance:opInstance, template:spawnRequest.template})
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
        let baseOp = this._baseOp;
        let base = baseOp.base;
        let minLength = template.minLength;
        let maxLength = template.maxLength;
        if (!minLength) minLength = Math.min(3,maxLength||3);
        if (!maxLength || maxLength > MAX_CREEP_SIZE) maxLength = MAX_CREEP_SIZE;

        /**@type {BodyPartConstant[]} */
        var result = [];
        var i=0;
        var maxEnergy = base.energyCapacityAvailable;
        if (baseOp.fillingOp.creepCount == 0) maxEnergy = base.energyAvailable;
        this._log({fillingCreepcount: baseOp.fillingOp.creepCount, maxEnergy: maxEnergy});

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
