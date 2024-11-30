import { expect } from 'chai';
import { config, ConfigOptions } from '../dist/tools.config';

describe('Config', () => {

  beforeEach(() => {
  });

  it('should configure settings with provided options', () => {
    const options = { 'accountAbstractionAPI': 'value1', 'accountAbstractionTOKEN': '42' } as ConfigOptions;
    config.configure(options);
    expect(config.option('accountAbstractionAPI')).to.equal('value1');
    expect(config.option('accountAbstractionTOKEN')).to.equal('42');
  });

  it('should get and set a single configuration option', () => {
    expect(config.option('accountAbstractionAPI')).to.equal('value1');
  });

  it('should throw an error if the option is not ready or already locked', () => {
    // Assuming there's a mechanism to lock options
    expect(() => config.option('accountAbstractionAPI', 'newValue')).to.throw();
  });
});