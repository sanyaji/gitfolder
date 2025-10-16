import * as vscode from 'vscode';

export interface ChangeGroup {
	id: string;
	name: string;
	files: FileItem[];
}

export interface FileItem {
	path: string;
	isLocal: boolean;
	// For partial staging: store which hunks/lines belong to this group
	hunks?: HunkSelection[];
}

export interface HunkSelection {
	// Hunk index in the diff
	hunkIndex: number;
	// Which lines in this hunk are selected (true = include, false = exclude)
	selectedLines?: number[];
}

export class StorageManager {
	private context: vscode.ExtensionContext;
	private readonly STORAGE_KEY = 'gitfolder.groups';

	constructor(context: vscode.ExtensionContext) {
		this.context = context;
	}

	async getGroups(): Promise<ChangeGroup[]> {
		return this.context.workspaceState.get<ChangeGroup[]>(this.STORAGE_KEY, []);
	}

	async saveGroups(groups: ChangeGroup[]): Promise<void> {
		await this.context.workspaceState.update(this.STORAGE_KEY, groups);
	}

	async createGroup(name: string): Promise<void> {
		const groups = await this.getGroups();
		const newGroup: ChangeGroup = {
			id: this.generateId(),
			name,
			files: []
		};
		groups.push(newGroup);
		await this.saveGroups(groups);
	}

	async deleteGroup(groupId: string): Promise<void> {
		const groups = await this.getGroups();
		const filteredGroups = groups.filter(g => g.id !== groupId);
		await this.saveGroups(filteredGroups);
	}

	async renameGroup(groupId: string, newName: string): Promise<void> {
		const groups = await this.getGroups();
		const group = groups.find(g => g.id === groupId);
		if (group) {
			group.name = newName;
			await this.saveGroups(groups);
		}
	}

	async addFileToGroup(groupId: string, filePath: string): Promise<void> {
		const groups = await this.getGroups();
		const group = groups.find(g => g.id === groupId);
		if (group) {
			// Check if file already exists
			if (!group.files.find(f => f.path === filePath)) {
				group.files.push({
					path: filePath,
					isLocal: false
				});
				await this.saveGroups(groups);
			}
		}
	}

	async removeFileFromGroup(groupId: string, filePath: string): Promise<void> {
		const groups = await this.getGroups();
		const group = groups.find(g => g.id === groupId);
		if (group) {
			group.files = group.files.filter(f => f.path !== filePath);
			await this.saveGroups(groups);
		}
	}

	async markFileAsLocal(groupId: string, filePath: string, isLocal: boolean): Promise<void> {
		const groups = await this.getGroups();
		const group = groups.find(g => g.id === groupId);
		if (group) {
			const file = group.files.find(f => f.path === filePath);
			if (file) {
				file.isLocal = isLocal;
				await this.saveGroups(groups);
			}
		}
	}

	private generateId(): string {
		return Date.now().toString(36) + Math.random().toString(36).substring(2);
	}
}
