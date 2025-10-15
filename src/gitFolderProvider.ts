import * as vscode from 'vscode';
import * as path from 'path';
import { StorageManager, ChangeGroup } from './storageManager';
import { GitService } from './gitService';

export class GitFolderProvider implements vscode.TreeDataProvider<TreeItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined | null | void> = new vscode.EventEmitter<TreeItem | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

	constructor(
		private storageManager: StorageManager,
		private gitService: GitService
	) {}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: TreeItem): vscode.TreeItem {
		return element;
	}

	async getChildren(element?: TreeItem): Promise<TreeItem[]> {
		if (!element) {
			// Root level - show groups AND ungrouped changes
			const groups = await this.storageManager.getGroups();
			const allChanges = this.gitService.getAllChanges();
			const result: TreeItem[] = [];

			// Add groups
			for (const group of groups) {
				const fileCount = group.files.length;
				result.push(new TreeItem(
					`${group.name} (${fileCount})`,
					group.id,
					'group',
					'',
					false,
					vscode.TreeItemCollapsibleState.Expanded,
					fileCount
				));
			}

			// Get files that are in groups
			const filesInGroups = new Set<string>();
			groups.forEach(g => {
				g.files.forEach(f => filesInGroups.add(f.path));
			});

			// Add ungrouped changes
			const ungroupedChanges = allChanges.filter(change => 
				!filesInGroups.has(change.uri.fsPath)
			);

			if (ungroupedChanges.length > 0) {
				result.push(new TreeItem(
					`Ungrouped Changes (${ungroupedChanges.length})`,
					'__ungrouped__',
					'ungrouped-section',
					'',
					false,
					vscode.TreeItemCollapsibleState.Expanded,
					ungroupedChanges.length
				));
			}
			
			return result;
		} else if (element.type === 'ungrouped-section') {
			// Show ungrouped changes
			const groups = await this.storageManager.getGroups();
			const allChanges = this.gitService.getAllChanges();
			
			const filesInGroups = new Set<string>();
			groups.forEach(g => {
				g.files.forEach(f => filesInGroups.add(f.path));
			});

			const ungroupedChanges = allChanges.filter(change => 
				!filesInGroups.has(change.uri.fsPath)
			);

			return ungroupedChanges.map(change => {
				const fileName = path.basename(change.uri.fsPath);
				return new TreeItem(
					fileName,
					'',
					'ungrouped-file',
					change.uri.fsPath,
					false,
					vscode.TreeItemCollapsibleState.None,
					0,
					change.status
				);
			});
		} else if (element.type === 'group') {
			// Group level - show files
			const groups = await this.storageManager.getGroups();
			const group = groups.find(g => g.id === element.groupId);

			if (!group || group.files.length === 0) {
				return [];
			}

			return group.files.map(file => {
				const fileName = path.basename(file.path);
				const type = file.isLocal ? 'file-local' : 'file';
				const icon = file.isLocal ? '🔒 ' : '';
				
				// Get status from git
				const allChanges = this.gitService.getAllChanges();
				const change = allChanges.find(c => c.uri.fsPath === file.path);
				const status = change?.status || 'Modified';
				
				return new TreeItem(
					icon + fileName,
					element.groupId,
					type,
					file.path,
					file.isLocal,
					vscode.TreeItemCollapsibleState.None,
					0,
					status
				);
			});
		}

		return [];
	}
}

export class TreeItem extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		public readonly groupId: string,
		public readonly type: 'group' | 'file' | 'file-local' | 'ungrouped-section' | 'ungrouped-file',
		public readonly filePath: string,
		public readonly isLocal: boolean,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly fileCount: number = 0,
		public readonly status?: string
	) {
		super(label, collapsibleState);

		this.contextValue = type;

		if (type === 'file' || type === 'file-local') {
			this.command = {
				command: 'gitfolder.openFile',
				title: 'Open File',
				arguments: [this]
			};
			this.iconPath = new vscode.ThemeIcon('file');
			this.description = status || this.getRelativePath(filePath);
		} else if (type === 'ungrouped-file') {
			this.command = {
				command: 'gitfolder.openFile',
				title: 'Open File',
				arguments: [this]
			};
			this.iconPath = new vscode.ThemeIcon('file');
			this.description = status;
		} else if (type === 'group') {
			this.iconPath = new vscode.ThemeIcon('folder');
		} else if (type === 'ungrouped-section') {
			this.iconPath = new vscode.ThemeIcon('git-merge');
		}
	}

	private getRelativePath(filePath: string): string {
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (workspaceFolders && workspaceFolders.length > 0) {
			const workspaceRoot = workspaceFolders[0].uri.fsPath;
			if (filePath.startsWith(workspaceRoot)) {
				return filePath.substring(workspaceRoot.length + 1);
			}
		}
		return filePath;
	}
}
