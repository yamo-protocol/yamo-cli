import fs from 'fs';
import path from 'path';
import os from 'os';

const CONFIG_DIR = process.env.YAMO_CONFIG_DIR || path.join(os.homedir(), '.yamo');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

/**
 * Handles persistent storage of local YAMO configuration.
 */
export const storage = {
  /**
   * Ensures the config directory exists.
   */
  ensureDir(): void {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
    }
  },

  /**
   * Reads the configuration file.
   */
  read(): Record<string, string> {
    if (!fs.existsSync(CONFIG_FILE)) {
      return {};
    }
    try {
      const data = fs.readFileSync(CONFIG_FILE, 'utf8');
      return JSON.parse(data) as Record<string, string>;
    } catch {
      return {};
    }
  },

  /**
   * Writes the configuration file.
   */
  write(config: Record<string, string>): void {
    this.ensureDir();
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), { mode: 0o600 });
  },

  /**
   * Sets a value in the configuration.
   */
  set(key: string, value: string): void {
    const configData = this.read();
    configData[key] = value;
    this.write(configData);
  },

  /**
   * Gets a value from the configuration.
   */
  get(key: string): string | undefined {
    const configData = this.read();
    return configData[key];
  },

  /**
   * Removes a key from the configuration.
   */
  remove(key: string): void {
    const configData = this.read();
    const remaining = Object.fromEntries(
      Object.entries(configData).filter(([k]) => k !== key)
    );
    this.write(remaining);
  },
};
