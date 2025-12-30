import { describe, it, expect } from 'vitest';
import { buildExplorerLinks, getExplorerConfig, validateBlockchainConfig } from './blockchainExplorer';

describe('blockchainExplorer', () => {
  describe('getExplorerConfig', () => {
    it('returns Polygon explorer config for amoy', () => {
      const config = getExplorerConfig('Polygon', '{"network":"amoy"}');
      expect(config?.baseUrl).toBe('https://amoy.polygonscan.com');
      expect(config?.explorerName).toBe('PolygonScan');
      expect(config?.networkLabel).toBe('amoy');
    });

    it('returns Solana explorer config with cluster param', () => {
      const config = getExplorerConfig('Solana', '{"network":"devnet"}');
      expect(config?.baseUrl).toBe('https://explorer.solana.com');
      expect(config?.clusterParam).toBe('devnet');
    });
  });

  describe('buildExplorerLinks', () => {
    it('builds Polygon address link with network', () => {
      const links = buildExplorerLinks({
        blockchainType: 'Polygon',
        blockchainConfig: '{"network":"amoy"}',
        address: '0xabc123',
      });
      expect(links.addressUrl).toBe('https://amoy.polygonscan.com/address/0xabc123');
      expect(links.explorerName).toBe('PolygonScan');
    });

    it('builds Solana tx link with cluster query', () => {
      const links = buildExplorerLinks({
        blockchainType: 'Solana',
        blockchainConfig: '{"network":"devnet"}',
        transactionId: 'tx123',
      });
      expect(links.transactionUrl).toBe('https://explorer.solana.com/tx/tx123?cluster=devnet');
    });
  });

  describe('validateBlockchainConfig', () => {
    it('enforces https for non-localhost adapterUrl', () => {
      const errors = validateBlockchainConfig('Polygon', '{"adapterUrl":"http://example.com","network":"amoy","apiKey":"1234567890123456"}');
      expect(errors).toContain('Polygon adapterUrl must use https (http is only allowed for localhost).');
    });

    it('requires sufficiently long apiKey', () => {
      const errors = validateBlockchainConfig('Polygon', '{"adapterUrl":"https://adapter","network":"amoy","apiKey":"short"}');
      expect(errors).toContain('Polygon apiKey appears invalid; expected at least 16 characters.');
    });
  });
});
