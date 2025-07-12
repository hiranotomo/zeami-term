/**
 * Command Intelligence Hub Test Suite
 * Tests for command execution tracking and analysis
 */

const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const { CommandExecutionModel } = require('../main/models/CommandExecutionModel');
const { MessageCenterService } = require('../main/services/MessageCenterService');
const { ShellIntegrationAddon } = require('../renderer/addons/ShellIntegrationAddon');

describe('Command Intelligence Hub', () => {
  let messageCenterService;
  let shellAddon;

  beforeEach(() => {
    messageCenterService = new MessageCenterService();
    shellAddon = new ShellIntegrationAddon('test-terminal-1');
  });

  afterEach(() => {
    messageCenterService.cleanup();
  });

  describe('CommandExecutionModel', () => {
    it('should create model with all required fields', () => {
      const model = new CommandExecutionModel({
        command: { raw: 'ls -la' },
        context: {
          window: { id: 'win-1' },
          terminal: { id: 'term-1' }
        }
      });

      expect(model.id).toBeDefined();
      expect(model.command.raw).toBe('ls -la');
      expect(model.context.window.id).toBe('win-1');
      expect(model.context.terminal.id).toBe('term-1');
    });

    it('should detect command executor correctly', () => {
      const testCases = [
        { raw: 'claude code "test prompt"', expectedType: 'claude-code' },
        { raw: 'zeami type diagnose', expectedType: 'zeami-cli' },
        { raw: 'git commit -m "test"', expectedType: 'git' },
        { raw: 'npm install express', expectedType: 'npm' },
        { raw: 'ls -la', expectedType: 'system' }
      ];

      testCases.forEach(({ raw, expectedType }) => {
        const model = new CommandExecutionModel({ command: { raw } });
        expect(model.executor.type).toBe(expectedType);
      });
    });

    it('should categorize commands correctly', () => {
      const testCases = [
        { raw: 'git push origin main', expectedCategory: 'version-control' },
        { raw: 'npm run build', expectedCategory: 'build-tools' },
        { raw: 'ls -la', expectedCategory: 'file-system' },
        { raw: 'curl https://api.example.com', expectedCategory: 'network' },
        { raw: 'docker ps', expectedCategory: 'containers' }
      ];

      testCases.forEach(({ raw, expectedCategory }) => {
        const model = new CommandExecutionModel({ command: { raw } });
        expect(model.command.category).toBe(expectedCategory);
      });
    });

    it('should calculate execution duration', () => {
      const model = new CommandExecutionModel({ command: { raw: 'test' } });
      const startTime = Date.now();
      
      // Simulate command execution
      setTimeout(() => {
        model.endExecution(0);
        expect(model.execution.duration).toBeGreaterThan(0);
        expect(model.execution.endTime).toBeGreaterThan(startTime);
      }, 100);
    });
  });

  describe('MessageCenterService', () => {
    it('should register command executions', async () => {
      const execution = new CommandExecutionModel({
        command: { raw: 'test command' }
      });

      const result = await messageCenterService.registerCommandExecution(execution);
      expect(result.success).toBe(true);

      const executions = messageCenterService.getCommandExecutions();
      expect(executions).toHaveLength(1);
      expect(executions[0].command.raw).toBe('test command');
    });

    it('should filter commands by terminal', () => {
      // Add test executions
      const executions = [
        { context: { terminal: { id: 'term-1' } }, command: { raw: 'cmd1' } },
        { context: { terminal: { id: 'term-2' } }, command: { raw: 'cmd2' } },
        { context: { terminal: { id: 'term-1' } }, command: { raw: 'cmd3' } }
      ];

      executions.forEach(data => {
        messageCenterService.registerCommandExecution(new CommandExecutionModel(data));
      });

      const filtered = messageCenterService.getCommandExecutions({ terminalId: 'term-1' });
      expect(filtered).toHaveLength(2);
      expect(filtered.every(e => e.context.terminal.id === 'term-1')).toBe(true);
    });

    it('should calculate statistics correctly', async () => {
      // Add various executions
      const executions = [
        { command: { raw: 'cmd1' }, execution: { exitCode: 0 } },
        { command: { raw: 'cmd2' }, execution: { exitCode: 1 } },
        { command: { raw: 'cmd3' }, execution: { exitCode: 0 } },
        { command: { raw: 'zeami test' }, executor: { type: 'zeami-cli' } }
      ];

      for (const data of executions) {
        await messageCenterService.registerCommandExecution(new CommandExecutionModel(data));
      }

      const stats = messageCenterService.getStatistics();
      expect(stats.totalCommands).toBe(4);
      expect(stats.successCount).toBe(2);
      expect(stats.errorCount).toBe(1);
      expect(stats.byExecutor['zeami-cli']).toBe(1);
    });

    it('should persist data to disk', async () => {
      const fs = require('fs').promises;
      const path = require('path');
      const tempDir = path.join(__dirname, '../../temp-test');
      
      // Mock file system
      jest.spyOn(fs, 'mkdir').mockResolvedValue();
      jest.spyOn(fs, 'writeFile').mockResolvedValue();

      const execution = new CommandExecutionModel({
        command: { raw: 'test persist' }
      });

      await messageCenterService.registerCommandExecution(execution);

      // Verify save was called
      expect(fs.writeFile).toHaveBeenCalled();
    });
  });

  describe('ShellIntegrationAddon OSC Handling', () => {
    let mockTerminal;

    beforeEach(() => {
      mockTerminal = {
        parser: {
          registerOscHandler: jest.fn()
        },
        onLineFeed: jest.fn(),
        onScroll: jest.fn()
      };
    });

    it('should register all OSC handlers', () => {
      shellAddon.activate(mockTerminal);

      // Check critical OSC handlers are registered
      const registeredHandlers = mockTerminal.parser.registerOscHandler.mock.calls.map(call => call[0]);
      
      expect(registeredHandlers).toContain(0);    // Window title
      expect(registeredHandlers).toContain(7);    // Working directory
      expect(registeredHandlers).toContain(133);  // Shell integration
      expect(registeredHandlers).toContain(633);  // Custom sequences
      expect(registeredHandlers).toContain(1337); // iTerm2 sequences
    });

    it('should handle command start sequence', () => {
      shellAddon.activate(mockTerminal);
      
      // Get the handler for OSC 133
      const handler133 = mockTerminal.parser.registerOscHandler.mock.calls
        .find(call => call[0] === 133)[1];

      // Simulate command start
      handler133('A');
      expect(shellAddon._currentCommand).toBeDefined();
      expect(shellAddon._isExecuting).toBe(true);
    });

    it('should handle command end sequence', () => {
      shellAddon.activate(mockTerminal);
      
      const handler133 = mockTerminal.parser.registerOscHandler.mock.calls
        .find(call => call[0] === 133)[1];

      // Start and end command
      handler133('A');
      handler133('B');
      
      expect(shellAddon._isExecuting).toBe(false);
      expect(shellAddon._commands.size).toBe(1);
    });

    it('should collect working directory changes', () => {
      shellAddon.activate(mockTerminal);
      
      const handler7 = mockTerminal.parser.registerOscHandler.mock.calls
        .find(call => call[0] === 7)[1];

      handler7('file:///home/user/projects');
      expect(shellAddon._collectedData.cwd).toContain('/home/user/projects');
    });
  });

  describe('Integration Tests', () => {
    it('should track complete command lifecycle', async () => {
      // Simulate full command execution flow
      const windowMock = {
        zeamiAPI: {
          invoke: jest.fn().mockResolvedValue({ success: true })
        },
        terminalWindowId: 1,
        terminalWindowIndex: 0,
        terminalSessionId: 'session-test'
      };

      global.window = windowMock;

      const mockTerminal = {
        parser: {
          registerOscHandler: jest.fn()
        },
        onLineFeed: jest.fn(),
        onScroll: jest.fn()
      };

      shellAddon.activate(mockTerminal);
      
      // Get OSC 133 handler
      const handler133 = mockTerminal.parser.registerOscHandler.mock.calls
        .find(call => call[0] === 133)[1];

      // Simulate command execution
      handler133('A');  // Start
      handler133('C');  // Command line
      handler133('B');  // End
      handler133('D;0'); // Exit code 0

      // Verify IPC was called
      expect(windowMock.zeamiAPI.invoke).toHaveBeenCalledWith(
        'command:execution-complete',
        expect.objectContaining({
          command: expect.any(Object),
          execution: expect.objectContaining({
            exitCode: 0
          })
        })
      );
    });
  });
});