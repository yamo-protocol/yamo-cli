import { storage } from '../utils/storage.js';
import { format } from '../utils/format.js';

/**
 * Handles the 'config' command sub-actions.
 */
export function configCommand(action: string, key?: string, value?: string): void {
  try {
    switch (action) {
      case 'set': {
        if (!key || !value) {
          throw new Error('Usage: yamo config set <key> <value>');
        }
        storage.set(key, value);
        format.success(`Set ${key} successfully.`);
        break;
      }

      case 'get': {
        if (!key) {
          throw new Error('Usage: yamo config get <key>');
        }
        const val = storage.get(key);
        if (val) {
          console.log(val);
        } else {
          format.warn(`Key '${key}' not found.`);
        }
        break;
      }

      case 'list': {
        const configData = storage.read();
        const keys = Object.keys(configData);
        if (keys.length === 0) {
          format.info('No configuration found.');
        } else {
          format.detail('Current Configuration:');
          keys.forEach((k) => {
            const lowerKey = k.toLowerCase();
            const displayValue = 
              lowerKey.includes('key') || 
              lowerKey.includes('jwt') || 
              lowerKey.includes('secret') || 
              lowerKey.includes('pass')
                ? '********' 
                : configData[k];
            console.log(`  ${k}: ${displayValue}`);
          });
        }
        break;
      }

      case 'remove': {
        if (!key) {
          throw new Error('Usage: yamo config remove <key>');
        }
        storage.remove(key);
        format.success(`Removed ${key} successfully.`);
        break;
      }

      default:
        throw new Error('Invalid action. Use set, get, list, or remove.');
    }
  } catch (error) {
    if (error instanceof Error) {
      format.error(error.message);
    } else {
      format.error('Unknown error occurred');
    }
  }
}
