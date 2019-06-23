//import {}

//declare type RoomStructures = {spawns: StructureSpawn[], extensions: StructureExtension[]}
declare interface Base extends Room {controller: StructureController};
declare var _ = import('lodash');
import Debug from 'debug';
declare interface Game extends Game {debug: Debug, main: import('main')}
declare var Game: Game;

declare interface Instruction {command: number};
declare interface CreepOpInstruction extends Instruction {source: RoomObject, dest: RoomObject};
declare type CreepTemplate = {body: BodyPartConstant[], minLength?: number, maxLength?: number}

//interface CreepMemory {any}
;