/**
* #config.ts
* Copyright (c)2020, by Olivier Evalet <olivier@karibou.ch>
* Licensed under GPL license (see LICENSE)
*/
import SessionKeystore from 'session-keystore'



//
// Secure cryptographic Memory Storage (K|V) for browsers or Node.js
// https://github.com/47ng/session-keystore
export function memorySession(name:string) {
  const store = new SessionKeystore({ name })
  return store;
}


/**
 * Enum representing various configuration options.
 */
export enum ConfigOption {
  accountAbstractionAPI = "accountAbstractionAPI",
  accountAbstractionID = "accountAbstractionID",
  accountAbstractionTOKEN = "accountAbstractionTOKEN",
  aavePoolProviderAddress = "aavePoolProviderAddress",
  aavePoolProviderABI = "aavePoolProviderABI",
  aaveContractAddress = "aaveContractAddress",
  aaveTokenAddress = "aaveTokenAddress",
  rocketPoolContractAddress = "rocketPoolContractAddress",
  USDC_CONTRACT_ADDRESS = "USDC_CONTRACT_ADDRESS",
  RPL_CONTRACT_ADDRESS = "RPL_CONTRACT_ADDRESS",
  XCHF_CONTRACT_ADDRESS = "XCHF_CONTRACT_ADDRESS",
  salt = "salt",
  secret = "secret",
  allowMaxAmount = "allowMaxAmount",
  allowMaxCredit = "allowMaxCredit",
  reservedAmount = "reservedAmount",
  sandbox = "sandbox",
  debug = "debug",
  allowMultipleSetOption = "allowMultipleSetOption",
  allowedTokens = "allowedTokens",
  networks = "networks",
}

export type ConfigOptions = { [key in ConfigOption]?: number | string | boolean | string[] };


class Config {

  // private settings should not be enumerable
  #settings: { [key: string]: any } | null = null;

  constructor() {    
  }


  /**
   * Configures the settings with the provided options.
   * @param opts - The configuration options.
   * @returns The current instance of the Config class.
   */
  configure(opts: ConfigOptions) {
    if (this.#settings) {
      return this;
    }
    this.#settings = {};

    Object.keys(opts).forEach((key) => {
      const name = key as ConfigOption;
      this.option(name, opts[name]);
    });

    // lock the configuration
    this.#settings.isConfigured = true;
    Object.defineProperty(this.#settings, 'isConfigured', { enumerable: false });
    Object.defineProperty(this.#settings, 'allowMultipleSetOption', { enumerable: false });

    return this; 
  }

  /**
   * Gets or sets a single configuration option.
   * @param option - The name of the option.
   * @param value - The value to set for the option.
   * @returns The value of the option if no value is provided.
   * @throws Will throw an error if the option is not ready or already locked.
   */
  option(option: string, value?: number | string | boolean | string[]) {
    if (!this.#settings) {
      throw new Error('Option is not ready yet');
    } 

    // Get the value of an option
    if (typeof value == 'undefined') {
      return this.#settings[option];
    }

    // Do not allow an option to be set twice 
    if (this.#settings.isConfigured && !this.#settings.allowMultipleSetOption) {
        throw new Error('Option is already locked');
    } 

    switch (option) {
      case 'accountAbstractionAPI':
      case 'accountAbstractionID':
      case 'accountAbstractionTOKEN':
      case 'aavePoolProviderAddress':
      case 'aavePoolProviderABI':
      case 'aaveContractAddress':
      case 'aaveTokenAddress':
      case 'rocketPoolContractAddress':
      case 'USDC_CONTRACT_ADDRESS':
      case 'RPL_CONTRACT_ADDRESS':
      case 'XCHF_CONTRACT_ADDRESS':
      case 'salt':
      case 'secret':
        this.#settings[option] = value; break;
      case 'allowMaxAmount':
      case 'allowMaxCredit':
      case 'reservedAmount':
        this.#settings[option] = parseFloat(String(value)); break;
      case 'sandbox':
      case 'debug':
      case 'allowMultipleSetOption':
        this.#settings[option] = Boolean(value); break;
      case 'allowedTokens':
      case 'networks':
        if (!Array.isArray(value)) {
          throw new Error('Value must be an array');
        }
        this.#settings[option] = value; break;
      default:
        // Do not allow unknown options to be set
        throw new Error('Unrecognized configuration option');
    }

    Object.defineProperty(this.#settings, option, { enumerable: false });    
  };
}

export const config = new Config();


