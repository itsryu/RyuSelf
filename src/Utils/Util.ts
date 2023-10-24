import * as winston from 'winston';
import { Collection } from '../Classes/Collection';

enum LogLevel {
    DEBUG = 'debug',
    INFO = 'info',
    WARN = 'warn',
    ERROR = 'error'
}

const isObject = (d: any) => typeof d === 'object' && d !== null;

class Logger {
    private logger: winston.Logger;

    constructor(private level: LogLevel = LogLevel.INFO, private environment: string = process.env.STATE) {
        this.logger = winston.createLogger({
            level: this.level,
            defaultMeta: { environment: this.environment },
            transports: [
                new winston.transports.Console()
            ],
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.splat(),
                winston.format.json(),
                winston.format.colorize({
                    colors: {
                        error: 'red',
                        warn: 'yellow',
                        info: 'green',
                        debug: 'blue'
                    }
                }),
                winston.format.printf((info) => {
                    const timestamp = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
                    return `[${timestamp}] [${info.level}] [${info.environment}] [${info.path}] ${info.message}`;
                })
            )
        });
    }

    public debug(message: string, meta: any): void {
        this.logger.debug(message, { path: meta });
    }

    public info(message: string, meta: any): void {
        this.logger.info(message, { path: meta });
    }

    public warn(message: string, meta: any): void {
        this.logger.warn(message, { path: meta });
    }

    public error(message: string, meta: any): void {
        this.logger.error(message, { path: meta });
    }
}

class Util {
    public static GetMention(id: string): RegExp {
        return new RegExp(`^<@!?${id}>( |)$`);
    }

    /**
    * Flatten an object. Any properties that are collections will get converted to an array of keys.
    * @param {Object} obj The object to flatten.
    * @param {...Object<string, boolean|string>} [props] Specific properties to include/exclude.
    * @returns {Object}
    */
    public static flatten(obj, ...props) {
        if (!isObject(obj)) return obj;

        const objProps = Object.keys(obj)
            .filter(key => !key.startsWith('_'))
            .map(key => ({ [key]: true }));

        // @ts-ignore
        props = objProps.length ? Object.assign(...objProps, ...props) : Object.assign({}, ...props);

        const out = {};

        // eslint-disable-next-line prefer-const
        for (let [prop, newProp] of Object.entries(props)) {
            if (!newProp) continue;
            newProp = newProp === true ? prop : newProp;

            const element = obj[prop];
            const elemIsObj = isObject(element);
            const valueOf = elemIsObj && typeof element.valueOf === 'function' ? element.valueOf() : null;
            const hasToJSON = elemIsObj && typeof element.toJSON === 'function';

            // If it's a Collection, make the array of keys
            if (element instanceof Collection) out[newProp] = Array.from(element.keys());
            // If the valueOf is a Collection, use its array of keys
            else if (valueOf instanceof Collection) out[newProp] = Array.from(valueOf.keys());
            // If it's an array, call toJSON function on each element if present, otherwise flatten each element
            else if (Array.isArray(element)) out[newProp] = element.map(elm => elm.toJSON?.() ?? this.flatten(elm));
            // If it's an object with a primitive `valueOf`, use that value
            else if (typeof valueOf !== 'object') out[newProp] = valueOf;
            // If it's an object with a toJSON function, use the return value of it
            else if (hasToJSON) out[newProp] = element.toJSON();
            // If element is an object, use the flattened version of it
            else if (typeof element === 'object') out[newProp] = this.flatten(element);
            // If it's a primitive
            else if (!elemIsObj) out[newProp] = element;
        }

        return out;
    }

    /**
    * Sets default properties on an object that aren't already specified.
    * @param {Object} def Default properties
    * @param {Object} given Object to assign defaults to
    * @returns {Object}
    * @private
    */
    public static mergeDefault(def, given) {
        if (!given) return def;
        for (const key in def) {
            if (!Object.hasOwn(given, key) || given[key] === undefined) {
                given[key] = def[key];
            } else if (given[key] === Object(given[key])) {
                given[key] = this.mergeDefault(def[key], given[key]);
            }
        }

        return given;
    }
}


export { Logger, Util };