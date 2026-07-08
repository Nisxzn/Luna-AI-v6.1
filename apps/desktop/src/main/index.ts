import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { fileSystemService, FileSystemItem } from './services/filesystem';
import { workspaceStateManager, WorkspaceState } from './services/workspaceState';
import { fileWatcherService, FileChange } from './services/fileWatcher';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Luna AI',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    },
    show: false
  })

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(async () => {
  // Load workspace state
  await workspaceStateManager.load();
  
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// IPC handlers for file system operations
ipcMain.handle('ping', async () => {
  return 'pong'
})

// Open folder dialog
ipcMain.handle('open-folder-dialog', async () => {
  if (!mainWindow) {
    throw new Error('Main window not available');
  }

  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Workspace Folder',
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const selectedPath = result.filePaths[0];
  workspaceStateManager.setWorkspacePath(selectedPath);
  return selectedPath;
});

// Get workspace path
ipcMain.handle('get-workspace-path', async () => {
  const state = workspaceStateManager.getState();
  return state.workspacePath;
});

// Get workspace state
ipcMain.handle('get-workspace-state', async () => {
  return workspaceStateManager.getState();
});

// Set active file
ipcMain.handle('set-active-file', async (_event, filePath: string) => {
  workspaceStateManager.setActiveFile(filePath);
  return true;
});

// Remove opened file
ipcMain.handle('remove-opened-file', async (_event, filePath: string) => {
  workspaceStateManager.removeOpenedFile(filePath);
  return true;
});

// Read directory
ipcMain.handle('read-directory', async (_event, dirPath: string) => {
  try {
    const items = await fileSystemService.readDirectory(dirPath)
    return items
  } catch (error) {
    console.error('Error reading directory:', error)
    throw error
  }
})

// Read file
ipcMain.handle('read-file', async (_event, filePath: string) => {
  try {
    const content = await fileSystemService.readFile(filePath)
    return content
  } catch (error) {
    console.error('Error reading file:', error)
    throw error
  }
})

// Close workspace
ipcMain.handle('close-workspace', async () => {
  workspaceStateManager.clear();
  return true;
});

// Save file
ipcMain.handle('save-file', async (_event, filePath: string, content: string) => {
  try {
    await fileSystemService.writeFile(filePath, content);
    return { success: true };
  } catch (error) {
    console.error('Error saving file:', error);
    return { success: false, error: String(error) };
  }
});

// Watch file for changes
ipcMain.handle('watch-file', (event, filePath: string) => {
  const unwatch = fileWatcherService.watchFile(filePath, (change: FileChange) => {
    event.sender.send('file-changed', change);
  });
  return true;
});

// Unwatch file
ipcMain.handle('unwatch-file', (_event, filePath: string) => {
  fileWatcherService.dispose();
  return true;
});
