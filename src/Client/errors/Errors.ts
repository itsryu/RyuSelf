import ErrorCodes from './ErrorCodes';
import Messages from './Messages';

/**
 * Format the message for an error.
 * @param {string} code The error code
 * @param {Array<*>} args Arguments to pass for util format or as function args
 * @returns {string} Formatted string
 * @ignore
 */
function message(code: string, args: Array<string>): string {
    if (!(code in ErrorCodes)) throw new Error('Error code must be a valid DiscordjsErrorCodes');
    const msg = Messages[code];
    if (!msg) throw new Error(`No message associated with error code: ${code}.`);
    // @ts-ignore
    if (typeof msg === 'function') return msg(...args);
    if (!args?.length) return msg;
    args.unshift(msg);
    return String(...args);
}

/**
 * Extend an error of some sort into a DiscordjsError.
 * @param {Error} Base Base error to extend
 * @returns {DiscordjsError}
 * @ignore
 */
function makeDiscordjsError(Base: ErrorConstructor) {
    return class DiscordjsError extends Base {
        code: string;

        constructor(code: string, ...args: any) {
            super(message(code, args));
            this.code = code;
            Error.captureStackTrace?.(this, DiscordjsError);
        }

        get name() {
            return `${super.name} [${this.code}]`;
        }
    };
}

export default {
    DiscordjsError: makeDiscordjsError(Error),
    DiscordjsTypeError: makeDiscordjsError(TypeError),
    DiscordjsRangeError: makeDiscordjsError(RangeError)
};
