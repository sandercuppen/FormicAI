const U = require('./util');
const c = require('./constants');
const BaseChildOp = require('./base_baseChildOp');

const MIN_MARKET_CREDITS = 100;

module.exports = class MarketOp extends BaseChildOp {
    /**@param {BaseOp} baseOp */
    constructor(baseOp) {
        super(baseOp);
        this._energyPrice = 0;
    }

    get type() {return c.OPERATION_MARKET}

    initTick() {
        super.initTick();
    }

    _firstRun() {
    }

    _tactics() {
        let baseOp = this._baseOp;
        let terminal = this._baseOp.terminal;
        if (terminal == undefined) return;
        let market = Game.market;

        // sell minerals
        for (let resourceName in terminal.store) {
            let resourceType = /**@type {ResourceConstant} */ (resourceName);
            if (resourceType == RESOURCE_ENERGY) continue;
            let amount = terminal.store[resourceType];
            let orders = market.getAllOrders({type:ORDER_BUY, resourceType: resourceType});
            //sort high to low price
            orders = orders.sort((a,b) => {
                let priceA = a.price + this._energyPrice * market.calcTransactionCost(1,a.roomName||this._baseOp.name, this._baseOp.name)
                let priceB = b.price + this._energyPrice * market.calcTransactionCost(1,b.roomName||this._baseOp.name, this._baseOp.name)
                return priceB - priceA;
            })
            for (let order of orders) {
                if (amount <= 0) break;
                let dealAmount = Math.min(order.amount, amount, c.MAX_TRANSACTION);
                let res = market.deal(order.id, dealAmount, this._baseOp.name)
                if (res == OK) amount -= dealAmount;
                else break;
             }
        }

        // buy energy
        let credits = this._baseOp.credits;
        if (credits > MIN_MARKET_CREDITS) {
            let orders = market.getAllOrders({type:ORDER_SELL, resourceType: RESOURCE_ENERGY})
            //sort low to high
            orders = orders.sort((a,b) => {
                let priceA = a.price * (1-market.calcTransactionCost(1,a.roomName||this._baseOp.name, this._baseOp.name));
                let priceB = b.price * (1-market.calcTransactionCost(1,a.roomName||this._baseOp.name, this._baseOp.name));
                return priceA - priceB;
            });
            for (let order of orders) {
                if (credits <= 0) break;
                let dealAmount = Math.min(order.amount, credits / order.price, c.MAX_TRANSACTION)
                let res = market.deal(order.id, dealAmount, this._baseOp.name);
                if (res == OK) credits -= dealAmount * order.price;
                else break;
            }
            //calculate and save current local energyprice
            if (orders[0]) {
                this._energyPrice = orders[0].price * (1-market.calcTransactionCost(1,orders[0].roomName||this._baseOp.name, this._baseOp.name));
            }
        }
    }
}