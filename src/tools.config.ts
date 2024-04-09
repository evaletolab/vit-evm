/**
* #config.ts
* Copyright (c)2020, by Olivier Evalet <olivier@karibou.ch>
* Licensed under GPL license (see LICENSE)
*/


class Config {

  // private settings should not be enumerable
  private settings: any;

  constructor() {    
  }


  //
  // init Config custom opts
  configure(opts: any) {
    if (this.settings) {
      return this;
    }
    this.settings = {};
    Object.keys(opts).forEach((key) => {
      this.option(key, opts[key]);
    });

    // lock the configuration
    this.settings.isConfigured = true;
    return this; 
  }

  //
  //## option(name, [value])
  //*Returns or sets a single configuration option*
  option(option: string, value?: number | string | boolean | string[]) {
    if (typeof value == 'undefined') {
      if (!this.settings.isConfigured) {
        throw new Error('Option is not ready yet');
      } 

      return this.settings[option];
    }

    // Do not allow an option to be set twice 
    if (this.settings.isConfigured) {
        throw new Error('Option is already locked');
    } 

    switch (option) {
      case 'aavePoolProviderAddress':
      case 'aavePoolProviderABI':
      case 'aaveContractAddress':
      case 'aaveTokenAddress':
      case 'USDC_CONTRACT_ADDRESS':
      case 'RPL_CONTRACT_ADDRESS':
      case 'XCHF_CONTRACT_ADDRESS':
      case 'salt':
      case 'secret':
        this.settings[option] = value;break;
      case 'allowMaxAmount':
      case 'allowMaxCredit':
      case 'reservedAmount':
          this.settings[option] = parseFloat(String(value));break;
      case 'sandbox':
      case 'debug':
      case 'allowMultipleSetOption':
        this.settings[option] = Boolean(value);break;
      case 'allowedTokens':
      case 'networks':
        if (!Array.isArray(value)) {
          throw new Error('Value must be an array');
        }
        this.settings[option] = value;
        break;
      default:
        // Do not allow unknown options to be set
        throw new Error('Unrecognized configuration option');
    }

    Object.defineProperty(this.settings, option, { enumerable: false });    
  };
}

export default new Config();

