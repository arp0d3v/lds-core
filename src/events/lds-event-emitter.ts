/**
 * Framework-agnostic event emitter
 * Compatible with Angular EventEmitter API but with zero dependencies
 * Can be used in Angular, React, Vue, Svelte, or vanilla JavaScript
 */

export type LdsEventHandler<T = any> = (data: T) => void;
export type LdsUnsubscribe = () => void;

export interface LdsEventEmitterOptions {
    /** Log all emissions for debugging */
    debug?: boolean;
    /** Maximum number of subscribers (memory leak protection) */
    maxSubscribers?: number;
}

/**
 * Lightweight event emitter with zero dependencies
 * 
 * @example
 * const emitter = new LdsEventEmitter<string>();
 * 
 * // Subscribe
 * const unsubscribe = emitter.subscribe(data => {
 *   console.log('Received:', data);
 * });
 * 
 * // Emit
 * emitter.emit('Hello');
 * 
 * // Clean up
 * unsubscribe();
 * emitter.complete();
 */
export class LdsEventEmitter<T = any> {
    private _handlers: Set<LdsEventHandler<T>> = new Set();
    private _isCompleted = false;
    private _options: LdsEventEmitterOptions;
    private _emissionCount = 0;

    constructor(options?: LdsEventEmitterOptions) {
        this._options = options || {};
    }

    /**
     * Subscribe to events
     * @param handler - Function to call when event is emitted
     * @returns Unsubscribe function
     * 
     * @example
     * const unsub = emitter.subscribe(data => console.log(data));
     * unsub(); // Unsubscribe
     */
    subscribe(handler: LdsEventHandler<T>): LdsUnsubscribe {
        if (this._isCompleted) {
            if (this._options.debug) {
                console.warn('Cannot subscribe to completed LdsEventEmitter');
            }
            return () => {};
        }
        
        // Memory leak protection
        if (this._options.maxSubscribers && 
            this._handlers.size >= this._options.maxSubscribers) {
            console.error(
                `LdsEventEmitter: Maximum subscribers (${this._options.maxSubscribers}) reached. ` +
                `Possible memory leak! Current: ${this._handlers.size}`
            );
        }
        
        this._handlers.add(handler);
        
        if (this._options.debug) {
            console.log(`[LdsEventEmitter] Subscriber added. Total: ${this._handlers.size}`);
        }
        
        // Return unsubscribe function
        return () => {
            this._handlers.delete(handler);
            if (this._options.debug) {
                console.log(`[LdsEventEmitter] Subscriber removed. Total: ${this._handlers.size}`);
            }
        };
    }

    /**
     * Subscribe and automatically unsubscribe after first emission
     * @param handler - Function to call once
     * @returns Unsubscribe function
     * 
     * @example
     * emitter.subscribeOnce(data => console.log('First time only:', data));
     */
    subscribeOnce(handler: LdsEventHandler<T>): LdsUnsubscribe {
        let unsubscribe: LdsUnsubscribe;
        unsubscribe = this.subscribe((data) => {
            handler(data);
            unsubscribe();
        });
        return unsubscribe;
    }

    /**
     * Subscribe with a condition - handler only called if condition is true
     * @param condition - Function that returns true when handler should be called
     * @param handler - Function to call when condition is met
     * @returns Unsubscribe function
     * 
     * @example
     * emitter.subscribeIf(
     *   () => this.isActive,
     *   data => this.process(data)
     * );
     */
    subscribeIf(
        condition: () => boolean, 
        handler: LdsEventHandler<T>
    ): LdsUnsubscribe {
        return this.subscribe((data) => {
            if (condition()) {
                handler(data);
            }
        });
    }

    /**
     * Emit event to all subscribers
     * Handlers are called safely - if one throws, others still execute
     * 
     * @param data - Data to emit to subscribers
     * 
     * @example
     * emitter.emit({ message: 'Hello' });
     */
    emit(data: T): void {
        if (this._isCompleted) {
            if (this._options.debug) {
                console.warn('Cannot emit on completed LdsEventEmitter');
            }
            return;
        }
        
        this._emissionCount++;
        
        if (this._options.debug) {
            console.log(`[LdsEventEmitter] Emit #${this._emissionCount}:`, data);
            console.log(`[LdsEventEmitter] Notifying ${this._handlers.size} subscriber(s)`);
        }
        
        // Call handlers safely - errors in one don't affect others
        this._handlers.forEach(handler => {
            try {
                handler(data);
            } catch (error) {
                console.error('Error in LdsEventEmitter handler:', error);
                // Continue executing other handlers
            }
        });
    }

    /**
     * Complete the emitter - releases all subscribers
     * No more emissions or subscriptions allowed after this
     * 
     * @example
     * emitter.complete(); // Clean up
     */
    complete(): void {
        if (this._isCompleted) { return; }
        
        if (this._options.debug) {
            console.log(
                `[LdsEventEmitter] Completed after ${this._emissionCount} emissions, ` +
                `releasing ${this._handlers.size} subscriber(s)`
            );
        }
        
        this._handlers.clear();
        this._isCompleted = true;
    }

    /**
     * Check if there are any active subscribers
     */
    get hasSubscribers(): boolean {
        return this._handlers.size > 0;
    }

    /**
     * Get the number of active subscribers
     * Useful for debugging memory leaks
     */
    get subscriberCount(): number {
        return this._handlers.size;
    }

    /**
     * Check if the emitter has been completed
     * Compatible with RxJS Observable.closed property
     */
    get closed(): boolean {
        return this._isCompleted;
    }

    /**
     * Get total number of emissions
     * Useful for debugging and profiling
     */
    get emissionCount(): number {
        return this._emissionCount;
    }

    /**
     * Convert to Promise that resolves on next emission
     * Useful for async/await patterns
     * 
     * @example
     * const data = await dataSource.onDataLoaded.toPromise();
     */
    toPromise(): Promise<T> {
        return new Promise((resolve, reject) => {
            if (this._isCompleted) {
                reject(new Error('LdsEventEmitter is already completed'));
                return;
            }
            
            this.subscribeOnce(data => resolve(data));
        });
    }
}

