import { classifyWebhookOwnership, applicationId, acceptedApplicationIds } from '../../config/application.config';

/**
 * The payment gateway accounts are shared across Opright applications, so a
 * large share of inbound webhooks belong to a sibling app. Acting on those
 * would settle payments this service never initiated.
 */
describe('webhook application routing', () => {
  const OLD_ID = process.env.APPLICATION_ID;
  const OLD_ALIASES = process.env.APPLICATION_ID_ALIASES;
  const OLD_ENV = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.APPLICATION_ID = 'opright_hospital';
    delete process.env.APPLICATION_ID_ALIASES;
  });

  afterAll(() => {
    process.env.APPLICATION_ID = OLD_ID;
    process.env.APPLICATION_ID_ALIASES = OLD_ALIASES;
    process.env.NODE_ENV = OLD_ENV;
  });

  it('claims events stamped with our own id', () => {
    expect(classifyWebhookOwnership('opright_hospital')).toBe('ours');
  });

  it('disowns a sibling application\'s events', () => {
    expect(classifyWebhookOwnership('opright_health')).toBe('other');
  });

  it('treats an unstamped event as unknown, not ours', () => {
    // The caller resolves these by checking whether it holds the reference.
    expect(classifyWebhookOwnership(undefined)).toBe('unknown');
    expect(classifyWebhookOwnership(null)).toBe('unknown');
    expect(classifyWebhookOwnership('')).toBe('unknown');
  });

  it('tolerates surrounding whitespace', () => {
    expect(classifyWebhookOwnership('  opright_hospital  ')).toBe('ours');
  });

  describe('rename migration', () => {
    beforeEach(() => {
      process.env.APPLICATION_ID_ALIASES = 'com.coresystemglobal.hms, opright_hms';
    });

    it('accepts configured aliases so in-flight payments are not stranded', () => {
      expect(classifyWebhookOwnership('com.coresystemglobal.hms')).toBe('ours');
      expect(classifyWebhookOwnership('opright_hms')).toBe('ours');
    });

    it('still disowns a sibling application', () => {
      expect(classifyWebhookOwnership('opright_health')).toBe('other');
    });

    it('stamps only the canonical id on new transactions', () => {
      expect(applicationId()).toBe('opright_hospital');
      expect(acceptedApplicationIds()).toContain('com.coresystemglobal.hms');
    });
  });

  it('refuses to start in production without an explicit id', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.APPLICATION_ID;
    expect(() => applicationId()).toThrow(/APPLICATION_ID/);
  });
});
