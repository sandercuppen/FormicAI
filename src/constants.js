module.exports = {
    COMMAND_NONE: 0,
    COMMAND_TRANSFER: 1,
    COMMAND_MOVETO: 2,
    COMMAND_CLAIMCONTROLLER: 3,

    OPERATION_NONE: 0,
    OPERATION_MAIN: 1,
    OPERATION_SHARD: 2,
    OPERATION_BASE: 3,
    OPERATION_SPAWNING: 4,
    OPERATION_FILLING: 5,
    OPERATION_UPGRADING: 6,
    OPERATION_BUILDING: 7,
    OPERATION_CREEP: 8,
    OPERATION_COLONIZING: 9,
    OPERATION_SHARDCOLONIZING: 10,
    OPERATION_MAP: 11,
    OPERATION_MAX: 11,

    ROLE_NONE:  0,
    ROLE_FILLER: 1,
    ROLE_UPGRADER: 2,
    ROLE_BUILDER: 3,

    DIRECTIVE_NONE: 0,
    DIRECTIVE_COLONIZE: 1,

    TICKS_HOUR: 1000,
    TICKS_DAY: 1000 * 24,
    TICKS_WEEK: 1000 * 24 * 7,
    TICKS_MONTH: 1000 * 24 * 30,
    TICKS_YEAR:  1000 * 24 * 365,
    
    SHARDREQUEST_NONE: 0,
    SHARDREQUEST_COLONIZER: 1,
    SHARDREQUEST_BUILDER: 2
}
