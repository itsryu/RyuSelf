import EventEmitter from 'node:events';
import ErrorCodes from './errors/ErrorCodes';
import Errors from './errors/Errors';
import { Util } from '../Utils/Util';

/**
 * The base class for all clients.
 * @extends {EventEmitter}
 */
class BaseClient extends EventEmitter {
    constructor(options = {}) {
        super({ captureRejections: true });

        if (typeof options !== 'object' || options === null) {
            throw new Errors.DiscordjsTypeError(ErrorCodes.InvalidType, 'options', 'object', true);
        }
    }

    /**
     * Increments max listeners by one, if they are not zero.
     * @private
     */
    incrementMaxListeners() {
        const maxListeners = this.getMaxListeners();
        if (maxListeners !== 0) {
            this.setMaxListeners(maxListeners + 1);
        }
    }

    /**
     * Decrements max listeners by one, if they are not zero.
     * @private
     */
    decrementMaxListeners() {
        const maxListeners = this.getMaxListeners();
        if (maxListeners !== 0) {
            this.setMaxListeners(maxListeners - 1);
        }
    }

    toJSON(...props) {
        return Util.flatten(this, ...props);
    }
}

export = BaseClient;

/**
 * @external REST
 * @see {@link https://discord.js.org/docs/packages/rest/stable/REST:Class}
 */
