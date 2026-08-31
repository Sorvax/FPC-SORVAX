import { MockAdapter } from './mock/MockAdapter.js';

/**
 * Integration Registry
 * 
 * Manages adapters for the investigation engine.
 * New adapters can be registered here without changing the investigation engine.
 * 
 * Architecture:
 *   EXTERNAL SOURCE → ADAPTER → NORMALIZED EVENT → INVESTIGATION ENGINE
 * 
 * To add a new adapter:
 *   1. Create a class extending BaseAdapter
 *   2. Register it here with a unique name
 *   3. The investigation engine will use it automatically
 */

const adapterRegistry = new Map();

// Register built-in adapters
adapterRegistry.set('mock', MockAdapter);

/**
 * Get an adapter instance by name.
 * @param {string} adapterName - Registered adapter name
 * @param {Object} config - Optional configuration for the adapter
 * @returns {BaseAdapter} Adapter instance
 */
export function getAdapter(adapterName = 'mock', config = {}) {
  const AdapterClass = adapterRegistry.get(adapterName);
  if (!AdapterClass) {
    throw new Error(`Adapter '${adapterName}' not found. Available: ${listAdapters().join(', ')}`);
  }
  return new AdapterClass(config);
}

/**
 * Auto-detect the best adapter for given data.
 * @param {Object} rawData - Data to analyze
 * @returns {BaseAdapter} Best matching adapter
 */
export function detectAdapter(rawData) {
  for (const [name, AdapterClass] of adapterRegistry) {
    const adapter = new AdapterClass();
    if (adapter.canHandle(rawData)) {
      return adapter;
    }
  }
  // Default to mock adapter
  return new MockAdapter();
}

/**
 * Register a new adapter.
 * @param {string} name - Unique adapter name
 * @param {typeof BaseAdapter} AdapterClass - Adapter class
 */
export function registerAdapter(name, AdapterClass) {
  adapterRegistry.set(name, AdapterClass);
}

/**
 * List all registered adapter names.
 * @returns {string[]}
 */
export function listAdapters() {
  return Array.from(adapterRegistry.keys());
}

export { MockAdapter };
