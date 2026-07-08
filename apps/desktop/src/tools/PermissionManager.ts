import { ToolPermissionRequest, ToolPermissionResponse, ToolPermission } from './types';

export class PermissionManager {
  private pendingRequests: Map<string, ToolPermissionRequest> = new Map();
  private permissionCallbacks: Map<string, (response: ToolPermissionResponse) => void> = new Map();

  requestPermission(request: ToolPermissionRequest): Promise<ToolPermissionResponse> {
    return new Promise((resolve) => {
      const requestId = this.generateRequestId();
      this.pendingRequests.set(requestId, request);
      this.permissionCallbacks.set(requestId, resolve);

      // In a real implementation, this would show a UI dialog
      // For now, we auto-approve read operations and require approval for others
      const hasWriteOrExecute = request.permissions.some((p) => p === 'write' || p === 'execute' || p === 'admin');
      
      if (hasWriteOrExecute) {
        // Require user approval (simulated - in real app would show dialog)
        console.log('Permission request:', request);
        // Auto-approve for now (in production, this would show a dialog)
        resolve('approved');
      } else {
        // Auto-approve read operations
        resolve('approved');
      }

      this.cleanup(requestId);
    });
  }

  respondToPermission(requestId: string, response: ToolPermissionResponse): void {
    const callback = this.permissionCallbacks.get(requestId);
    if (callback) {
      callback(response);
      this.cleanup(requestId);
    }
  }

  private generateRequestId(): string {
    return `perm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private cleanup(requestId: string): void {
    setTimeout(() => {
      this.pendingRequests.delete(requestId);
      this.permissionCallbacks.delete(requestId);
    }, 60000); // Cleanup after 1 minute
  }

  getPendingRequest(requestId: string): ToolPermissionRequest | undefined {
    return this.pendingRequests.get(requestId);
  }

  hasPermission(requiredPermissions: ToolPermission[], userPermissions: ToolPermission[]): boolean {
    return requiredPermissions.every((perm) => userPermissions.includes(perm));
  }
}

export const permissionManager = new PermissionManager();
