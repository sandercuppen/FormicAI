const U = require('./util');
const c = require('./constants');
const BaseChildOp = require('./base_baseChildOp');

const MIN_MARKET_CREDITS = 10;

module.exports = class MarketOp extends BaseChildOp {
    /**@param {BaseOp} baseOp */
    constructor(baseOp) {
        super(baseOp);
        this._energyPrice = 0;
        this._verbose = true;
    }

    get type() {return c.OPERATION_MARKET}

    initTick() {
        super.initTick();
    }

    _firstRun() {
    }

    _strategy() {
        let baseOp = this._baseOp;
        let terminal = this._baseOp.terminal;
        if (terminal == undefined) return;
        let market = Game.market;

        // sell minerals
        for (let resourceName in terminal.store) {
            let resourceType = /**@type {ResourceConstant} */ (resourceName);
            if (resourceType == RESOURCE_ENERGY) continue;
            let amount = terminal.store[resourceType];
            this._log({base: baseOp.name, Trying_to_sell: resourceType, amount:amount, energyPrice: this._energyPrice})
            /**@type {OrderEx[]} */
            let orders = market.getAllOrders({type:ORDER_BUY, resourceType: resourceType});
            //calculate net price
            for (let order of orders) {
                order.transactionCost = this._energyPrice * market.calcTransactionCost(1,order.roomName||this._baseOp.name, this._baseOp.name);
                order.netPrice = order.transactionCost + order.price;
            }
            //sort high to low price
            orders = orders.sort((a,b) => {
                return (b.netPrice||b.price) - (a.netPrice||a.price);
            })
            this._log('Sorted Orders:');
            this._log(orders);
            for (let order of orders) {
                if (amount <= 0) break;
                let dealAmount = Math.min(order.amount, amount, c.MAX_TRANSACTION);
                this._log({deal: order, amount:amount})
                let res = market.deal(order.id, dealAmount, this._baseOp.name)
                if (res == OK) amount -= dealAmount;
                this._log({result: res});
                if(res != OK) break;
             }
        }

        // buy energy
        let credits = this._baseOp.credits;
        if (credits > MIN_MARKET_CREDITS) {
            /**@type {OrderEx[]} */
            let orders = market.getAllOrders({type:ORDER_SELL, resourceType: RESOURCE_ENERGY})
            //calculate net price
            for (let order of orders) {
                order.transactionCost = market.calcTransactionCost(1000,order.roomName||this._baseOp.name, this._baseOp.name)/1000;
                order.netPrice = (1-order.transactionCost) * order.price;
            }
            //sort low to high
            orders = orders.sort((a,b) => {
                return (a.netPrice||a.price) - (b.netPrice||b.price);
            });
            this._log('Sorted Orders:');
            this._log(orders);
            for (let order of orders) {
                if (credits <= 0) break;
                let dealAmount = Math.min(order.amount, credits / order.price, c.MAX_TRANSACTION)
                this._log({deal: order, amount:dealAmount})
                let res = market.deal(order.id, dealAmount, this._baseOp.name);
                if (res == OK) credits -= dealAmount * order.price;
                else break;
            }
            //calculate and save current local energyprice
            if (orders[0]) {
                this._energyPrice = orders[0].price * (1-market.calcTransactionCost(1000,orders[0].roomName||this._baseOp.name, this._baseOp.name)/1000);
            }
        }
    }
}