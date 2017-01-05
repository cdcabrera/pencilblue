/*
    Copyright (C) 2017  PencilBlue, LLC

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/
'use strict';

//dependencies
var _ = require('lodash');
var Configuration = require('../../config');
var log = require('../../utils/logging').newInstance('LockService');
var path = require('path');

module.exports = function(pb) {

    /**
     * Provides mechanisms for acquiring and managing distributed locks.  When a LockProvider is not provided then it is
     * loaded based on the configuration
     * @param {LockProvider} [provider]
     */
    class LockService {
        constructor(provider) {
            if (_.isNil(provider)) {
                provider = LockService.loadProvider();
            }
            if (!provider) {
                throw new Error('A valid lock provider is required. Please check your configuration. Set logging level to "silly" for more info');
            }

            /**
             *
             * @type {LockProvider}
             */
            this.provider = provider;
        }

        /**
         * Attempts to acquire a semaphore with the given name
         * @param {String} name
         * @param {Object} [options={}]
         * @param {Object} [options.payload]
         * @param {Integer} [options.timeout]
         * @param {Function} cb
         */
        acquire (name, options, cb) {
            if (_.isFunction(options)) {
                cb = options;
                options = {};
            }

            var opts = {
                timeout: options.timeout || Configuration.activeConfiguration.locks.timeout,
                payload: options.payload || {

                    server: pb.ServerRegistration.generateServerKey(),
                    instance: pb.ServerRegistration.generateKey(),
                    date: new Date()
                }
            };
            this.provider.acquire(name, opts, cb);
        }

        /**
         * Retrieves the payload for the lock
         * @param {String} name
         * @param {Function} cb
         */
        get (name, cb) {
            this.provider.get(name, cb);
        }

        /**
         * Releases the lock
         * @param {String} name
         * @param {Object} [options={}]
         * @param {Function} cb
         */
        release (name, options, cb) {
            this.provider.release(name, options, cb);
        }

        /**
         * Inspects the current PB configuration to determine what lock provider to
         * instantiate and return
         * @static
         * @method loadProvider
         * @return {LockProvider} An instance of a media provider or NULL when no
         * provider can be loaded.
         */
        static loadProvider () {
            if (Configuration.activeConfiguration.locks.provider === 'cache') {
                return new pb.locks.providers.CacheLockProvider();
            }
            else if (Configuration.activeConfiguration.locks.provider === 'db') {
                return new pb.locks.providers.DbLockProvider();
            }

            var instance = null;
            var paths = [
                path.join(Configuration.activeConfiguration.docRoot, Configuration.activeConfiguration.locks.provider),
                Configuration.activeConfiguration.locks.provider
            ];
            for (var i = 0; i < paths.length; i++) {
                try {
                    var ProviderType = require(paths[i]);
                    instance = new ProviderType();
                    break;
                }
                catch (e) {
                    log.silly(e.stack);
                }
            }
            return instance;
        }
    }

    return LockService;
};
