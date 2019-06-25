import { Plugin } from '../plugin';

/**
 * TODO
 */
export function calculateMissingDependencies(plugins: Plugin[], registry: object): string[] {
  const available = [
    ...Object.keys(registry),
    ...plugins.map(({ metadata: { name }}) => name),
  ];
  const availableSet = new Set(available);

    return [...memo, ...plugin.metadata.depends];
  }, [])
  const requiredSet = new Set(required);

  const difference = new Set(Array.from(requiredSet).filter((p) => !availableSet.has(p)));

  return Array.from(difference.values()).sort();
}

/**
 * TODO
 */
export function registerPlugins(plugins: Plugin[], registry: object) {
  const newlyRegistered = Object.create(null);

  plugins.forEach((plugin) => {
    const exposedValue = plugin.register(registry);
    const { name } = plugin.metadata;

    newlyRegistered[name] = exposedValue;
  });

  Object.assign(registry, newlyRegistered);

  return newlyRegistered;
}

/**
 * TODO
 */
export function initPlugins(plugins: Plugin[]) {
  plugins.forEach((plugin) => {
    if (typeof plugin.init === 'function') {
      plugin.init();
    }
  });
}

/**
 * TODO
 */
export function readyPlugins(plugins: Plugin[]) {
  plugins.forEach((plugin) => {
    if (typeof plugin.ready === 'function') {
      plugin.ready();
    }
  });
}
