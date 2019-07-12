import { expect } from '../../utils';
import { default as SaytPlugin } from '../../../src/sayt-plugin';
import { SaytPlugin as SaytExport } from '../../../src/index';

describe('Entry point', () => {
  it('should export SaytPlugin', () => {
    expect(SaytPlugin).to.equal(SaytExport);
  });
});
