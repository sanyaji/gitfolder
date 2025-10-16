import * as vscode from 'vscode';
import * as path from 'path';

export interface GitChange {
	uri: vscode.Uri;
	status: string;
	originalUri?: vscode.Uri;
}

export class GitService {
	private gitAPI: any;
	private repo: any;

	constructor() {
		const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
		if (gitExtension) {
			this.gitAPI = gitExtension.getAPI(1);
			if (this.gitAPI.repositories.length > 0) {
				this.repo = this.gitAPI.repositories[0];
			}
		}
	}

	getRepository() {
		return this.repo;
	}

	getAllChanges(): GitChange[] {
		if (!this.repo) {
			return [];
		}

		const changes: GitChange[] = [];
		
		// Working tree changes (unstaged)
		for (const change of this.repo.state.workingTreeChanges) {
			changes.push({
				uri: change.uri,
				status: this.getStatusText(change.status),
				originalUri: change.originalUri
			});
		}

		return changes;
	}

	getStagedChanges(): GitChange[] {
		if (!this.repo) {
			return [];
		}

		const changes: GitChange[] = [];
		
		// Index changes (staged)
		for (const change of this.repo.state.indexChanges) {
			changes.push({
				uri: change.uri,
				status: this.getStatusText(change.status),
				originalUri: change.originalUri
			});
		}

		return changes;
	}

	private getStatusText(status: number): string {
		// Git status codes
		const STATUS_MODIFIED = 5;
		const STATUS_ADDED = 1;
		const STATUS_DELETED = 6;
		const STATUS_RENAMED = 3;
		const STATUS_UNTRACKED = 7;

		switch (status) {
			case STATUS_MODIFIED: return 'Modified';
			case STATUS_ADDED: return 'Added';
			case STATUS_DELETED: return 'Deleted';
			case STATUS_RENAMED: return 'Renamed';
			case STATUS_UNTRACKED: return 'Untracked';
			default: return 'Changed';
		}
	}

	async stageFile(uri: vscode.Uri) {
		if (this.repo) {
			try {
				await this.repo.add([uri.fsPath]);
			} catch (error) {
				console.error('Error staging file:', error);
				throw error;
			}
		}
	}

	async unstageFile(uri: vscode.Uri) {
		if (this.repo) {
			try {
				await this.repo.revert([uri.fsPath]);
			} catch (error) {
				console.error('Error unstaging file:', error);
				throw error;
			}
		}
	}

	async unstageFiles(uris: vscode.Uri[]) {
		if (this.repo) {
			try {
				const paths = uris.map(uri => uri.fsPath);
				await this.repo.revert(paths);
			} catch (error) {
				console.error('Error unstaging files:', error);
				throw error;
			}
		}
	}

	async stageFiles(uris: vscode.Uri[]) {
		if (this.repo) {
			try {
				const paths = uris.map(uri => uri.fsPath);
				await this.repo.add(paths);
			} catch (error) {
				console.error('Error staging files:', error);
				throw error;
			}
		}
	}

	async discardChanges(uri: vscode.Uri) {
		if (this.repo) {
			try {
				await this.repo.clean([uri]);
			} catch (error) {
				console.error('Error discarding changes:', error);
				throw error;
			}
		}
	}

	async discardAllChanges(uris: vscode.Uri[]) {
		if (this.repo) {
			try {
				await this.repo.clean(uris);
			} catch (error) {
				console.error('Error discarding changes:', error);
				throw error;
			}
		}
	}

	onDidChangeState(callback: () => void): vscode.Disposable {
		if (this.repo) {
			return this.repo.state.onDidChange(callback);
		}
		return { dispose: () => {} };
	}
}
