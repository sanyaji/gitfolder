import * as vscode from 'vscode';
import { StorageManager } from './storageManager';
import { GitService, GitChange } from './gitService';

export class GitFolderSCMProvider {
	private disposables: vscode.Disposable[] = [];
	public sourceControl: vscode.SourceControl;
	private groups: Map<string, vscode.SourceControlResourceGroup> = new Map();
	private ungroupedGroup: vscode.SourceControlResourceGroup;
	private stagedGroup: vscode.SourceControlResourceGroup;

	constructor(
		private storageManager: StorageManager,
		private gitService: GitService
	) {
		// Create source control
		this.sourceControl = vscode.scm.createSourceControl(
			'gitfolder',
			'Git (GitFolder)',
			vscode.workspace.workspaceFolders?.[0].uri
		);

		this.sourceControl.acceptInputCommand = {
			command: 'gitfolder.commit',
			title: 'Commit',
			arguments: [this.sourceControl]
		};

		this.sourceControl.inputBox.placeholder = 'Message (press Ctrl+Enter to commit)';

		this.sourceControl.quickDiffProvider = this.gitService.getRepository()?.quickDiff;

		// Update status bar with repo and branch info
		this.updateStatusBar();

		// Create staged changes group (appears first)
		this.stagedGroup = this.sourceControl.createResourceGroup(
			'__staged__',
			'Staged Changes'
		);
		this.stagedGroup.hideWhenEmpty = true;

		// Create ungrouped changes group
		this.ungroupedGroup = this.sourceControl.createResourceGroup(
			'__ungrouped__',
			'Changes'
		);
		this.ungroupedGroup.hideWhenEmpty = false;

		this.disposables.push(this.sourceControl);

		// Watch for changes
		this.disposables.push(
			this.gitService.onDidChangeState(() => {
				this.refresh();
			})
		);

		// Initial refresh
		this.refresh();
	}

	private updateStatusBar() {
		const repo = this.gitService.getRepository();
		if (repo) {
			const branchName = repo.state.HEAD?.name || 'unknown';
			const repoName = vscode.workspace.workspaceFolders?.[0].name || 'unknown';
			
			// Update source control label with branch info
			this.sourceControl.statusBarCommands = [
				{
					command: 'gitfolder.showBranchPicker',
					title: `$(git-branch) ${branchName}`,
					tooltip: `Current branch: ${branchName}`
				}
			];
		}
	}

	async refresh() {
		// Update status bar on every refresh
		this.updateStatusBar();
		const allChanges = this.gitService.getAllChanges();
		const stagedChanges = this.gitService.getStagedChanges();
		const customGroups = await this.storageManager.getGroups();

		// Clear existing custom groups
		this.groups.forEach(group => group.dispose());
		this.groups.clear();

		// Update staged changes
		const stagedResources: vscode.SourceControlResourceState[] = [];
		for (const change of stagedChanges) {
			stagedResources.push({
				resourceUri: change.uri,
				decorations: {
					tooltip: `${change.status} (staged)`
				},
				command: {
					command: 'gitfolder.openChanges',
					title: 'Open Changes',
					arguments: [{ resourceUri: change.uri }]
				},
				contextValue: 'gitfolder:staged'
			});
		}
		this.stagedGroup.resourceStates = stagedResources;

		// Track which files are in custom groups
		const filesInCustomGroups = new Set<string>();

		// Create resource groups for each custom group
		for (const customGroup of customGroups) {
			const resourceGroup = this.sourceControl.createResourceGroup(
				customGroup.id,
				`📁 ${customGroup.name}`
			);
			
			const resources: vscode.SourceControlResourceState[] = [];

			for (const file of customGroup.files) {
				filesInCustomGroups.add(file.path);
				
				const change = allChanges.find(c => c.uri.fsPath === file.path);
				if (change) {
					const icon = file.isLocal ? '🔒' : undefined;
					resources.push({
						resourceUri: change.uri,
						decorations: {
							strikeThrough: file.isLocal,
							tooltip: file.isLocal ? 'Local only (will not be staged with group)' : undefined,
							iconPath: icon ? new vscode.ThemeIcon('lock') : undefined
						},
						command: {
							command: 'gitfolder.openChanges',
							title: 'Open Changes',
							arguments: [{ resourceUri: change.uri }]
						},
						contextValue: file.isLocal ? 'gitfolder:file:local' : 'gitfolder:file',
						// Enable drag & drop
						['__groupId' as any]: customGroup.id,
						['__filePath' as any]: file.path
					});
				}
			}

			resourceGroup.resourceStates = resources;
			resourceGroup.hideWhenEmpty = false;
			
			// Enable drag & drop for resource group
			(resourceGroup as any).__isCustomGroup = true;
			(resourceGroup as any).__groupId = customGroup.id;
			
			this.groups.set(customGroup.id, resourceGroup);
		}

		// Update ungrouped changes
		const ungroupedResources: vscode.SourceControlResourceState[] = [];
		for (const change of allChanges) {
			if (!filesInCustomGroups.has(change.uri.fsPath)) {
				ungroupedResources.push({
					resourceUri: change.uri,
					decorations: {
						tooltip: change.status
					},
					command: {
						command: 'gitfolder.openChanges',
						title: 'Open Changes',
						arguments: [{ resourceUri: change.uri }]
					},
					contextValue: 'gitfolder:ungrouped',
					// Enable drag & drop
					['__isUngrouped' as any]: true,
					['__filePath' as any]: change.uri.fsPath
				});
			}
		}

		this.ungroupedGroup.resourceStates = ungroupedResources;
		(this.ungroupedGroup as any).__isUngrouped = true;

		// Update commit button state (show count of staged changes)
		this.sourceControl.count = stagedChanges.length;
	}	dispose() {
		this.disposables.forEach(d => d.dispose());
		this.groups.forEach(group => group.dispose());
		this.ungroupedGroup.dispose();
		this.stagedGroup.dispose();
	}
}
