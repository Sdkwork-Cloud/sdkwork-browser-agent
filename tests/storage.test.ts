/**
 * Storage Adapter Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createStorage, BrowserStorageAdapter, NodeStorageAdapter } from '../src/storage';

describe('Storage Adapter', () => {
  describe('Environment Detection', () => {
    it('should create appropriate adapter for environment', () => {
      const storage = createStorage({ basePath: './test' });
      expect(storage).toBeDefined();
      // In jsdom environment, window is defined, so it creates BrowserStorageAdapter
      expect(storage.name).toBe('browser');
    });
  });

  describe('NodeStorageAdapter', () => {
    let storage: NodeStorageAdapter;

    beforeEach(() => {
      storage = new NodeStorageAdapter({ basePath: './test-storage' });
    });

    it('should have correct name', () => {
      expect(storage.name).toBe('node');
    });

    it('should not be available in browser environment', () => {
      // In jsdom environment, window is defined
      expect(storage.isAvailable).toBe(false);
    });

    it('should write and read file', async () => {
      const testPath = 'test-file.txt';
      const testContent = 'Hello, World!';

      await storage.writeFile(testPath, testContent);
      const content = await storage.readFile(testPath);
      expect(content).toBe(testContent);

      // Cleanup
      await storage.deleteFile(testPath);
    });

    it('should check file existence', async () => {
      const testPath = 'exists-test.txt';
      
      expect(await storage.exists(testPath)).toBe(false);
      
      await storage.writeFile(testPath, 'content');
      expect(await storage.exists(testPath)).toBe(true);

      // Cleanup
      await storage.deleteFile(testPath);
    });

    it('should create and delete directories', async () => {
      const dirPath = 'test-dir';
      
      await storage.createDirectory(dirPath);
      expect(await storage.exists(dirPath)).toBe(true);
      
      await storage.deleteDirectory(dirPath);
      expect(await storage.exists(dirPath)).toBe(false);
    });

    it('should return null for non-existent files', async () => {
      const content = await storage.readFile('non-existent-file.txt');
      expect(content).toBeNull();
    });

    it('should get file metadata', async () => {
      const testPath = 'metadata-test.txt';
      const testContent = 'test content';

      await storage.writeFile(testPath, testContent);
      const metadata = await storage.getMetadata(testPath);

      expect(metadata).toBeDefined();
      expect(metadata?.path).toContain(testPath);
      expect(metadata?.size).toBe(testContent.length);
      expect(metadata?.isDirectory).toBe(false);

      // Cleanup
      await storage.deleteFile(testPath);
    });
  });

  describe('BrowserStorageAdapter', () => {
    it('should have correct name', () => {
      const adapter = new BrowserStorageAdapter();
      expect(adapter.name).toBe('browser');
    });

    it('should be available in browser environment', () => {
      // In jsdom environment, window is defined
      const adapter = new BrowserStorageAdapter();
      expect(adapter.isAvailable).toBe(true);
    });

    it.skip('should use IndexedDB for storage', async () => {
      // Skip this test as jsdom doesn't support IndexedDB
      // This test would pass in a real browser environment
    });
  });
});

describe('Skill Registry with Storage', () => {
  it('should integrate with storage adapter', async () => {
    const { SkillRegistry } = await import('../src/skills/registry');
    const storage = createStorage();
    
    const registry = new SkillRegistry({ storage });
    expect(registry).toBeDefined();
    
    const stats = registry.getStats();
    expect(stats.totalSkills).toBe(0);
  });
});
