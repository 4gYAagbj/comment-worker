import githubAppJwt from 'universal-github-app-jwt';

import { gatherResponse } from './util';

const shouldFakeUserAgent = false;

const defaultHeaders = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28'
};

class GitHub {
  constructor(appId, installationToken, organizationSlug, repositorySlug) {
    // Constructor
    this.installationToken = installationToken;
    this.organizationSlug = organizationSlug;
    this.repositorySlug = repositorySlug;
    this.headers = {
      ...defaultHeaders,
      'User-Agent': shouldFakeUserAgent
        ? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36 Edg/115.0.1901.200'
        : `comment-worker-${appId}`,
      'Authorization': `Bearer ${this.installationToken}`
    };
  }

  static async initialize(appId, privateKey, organizationSlug, repositorySlug) {
    const { token } = await githubAppJwt({
      id: appId,
      privateKey
    });
    
    const { token: installationToken } = await this.getInstallationTokenByOrgName(
      appId,
      token,
      organizationSlug
    );
    
    return new GitHub(appId, installationToken, organizationSlug, repositorySlug);
  }

  static async getInstallationTokenByOrgName(appId, appBearerToken, organizationSlug) {
    const headers = {
      ...defaultHeaders,
      'User-Agent': shouldFakeUserAgent
        ? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36 Edg/115.0.1901.200'
        : `comment-worker-${appId}`,
      Authorization: `Bearer ${appBearerToken}`
    };

    const appInstallationsResponse = await fetch('https://api.github.com/app/installations', {
      headers
    });
    
    const appInstallations = await gatherResponse(appInstallationsResponse);

    const installation = appInstallations.find(item => item.account.login === organizationSlug);
    const installationTokenResponse = await fetch(installation.access_tokens_url, {
      method: 'POST',
      headers
    });

    const installationToken = await gatherResponse(installationTokenResponse);

    return installationToken;
  }

  async createFileOnRepository(commentPath, message, content, branch) {
    const createCommentResponse = await fetch(
      `https://api.github.com/repos/${this.organizationSlug}/${this.repositorySlug}/contents/${commentPath}`,
      {
        method: 'PUT',
        body: JSON.stringify({
          message,
          content,
          branch
        }),
        headers: this.headers
      }
    );

    const commentResponse = await gatherResponse(createCommentResponse);

    return commentResponse;
  }

  async createBranchOnRepository(branchName, branchFrom = 'master') {
    // console.log("branchName: "+branchName+", branchFrom: "+branchFrom);
    const rl = `https://api.github.com/repos/${this.organizationSlug}/${this.repositorySlug}/git/matching-refs/heads/${branchFrom}`;
    //https://api.github.com/repos/4gYAagbj/comment-worker/git/matching-refs/heads/master
    const branchResponse = await fetch(
      rl,
      {
        headers: this.headers
      }
    );
    
    const branch = await gatherResponse(branchResponse);
    console.log('createBranchOnRepository: 2')
    console.log('branch: '+JSON.stringify(branch))
    console.log('branch.object.sha: '+branch[0].object)
    let sha = branch.object.sha;
    if (sha===undefined){
sha = branch.object[0].sha;
    }

console.log('sha :'+sha)

    const createBranchResponse = await fetch(
      `https://api.github.com/repos/${this.organizationSlug}/${this.repositorySlug}/git/refs`,
      {
        method: 'POST',
        body: JSON.stringify({
          ref: `refs/heads/${branchName}`,
          sha: sha
        }),
        headers: this.headers
      }
    );
console.log('createBranchOnRepository: 3')
    const branchCreation = await gatherResponse(createBranchResponse);
console.log('createBranchOnRepository: 4')
    return branchCreation;
  }

  async createPullRequestOnRepository(title, body, branchSource, branchTarget = 'master') {
    const createPullRequestResponse = await fetch(
      `https://api.github.com/repos/${this.organizationSlug}/${this.repositorySlug}/pulls`,
      {
        method: 'POST',
        body: JSON.stringify({
          title,
          body,
          head: branchSource,
          base: branchTarget
        }),
        headers: this.headers
      }
    );

    const pullRequest = await gatherResponse(createPullRequestResponse);

    return pullRequest;
  }

  async getRepository() {
    const repositoryResponse = await fetch(
      `https://api.github.com/repos/${this.organizationSlug}/${this.repositorySlug}`,
      {
        headers: this.headers
      }
    );

    const repository = await gatherResponse(repositoryResponse);

    return repository;
  }

  async getFileFromRepository(filePath, branchFrom = 'master') {
    // console.log('filePath: '+filePath)
    // console.log('branchFrom: '+branchFrom)
    // console.log('url: '+`https://api.github.com/repos/${this.organizationSlug}/${this.repositorySlug}/contents/${filePath}?ref=${branchFrom}`)
    const fileResponse = await fetch(
      `https://api.github.com/repos/${this.organizationSlug}/${this.repositorySlug}/contents/${filePath}?ref=${branchFrom}`,
      {
        method: 'GET',
        headers: this.headers
      }
    );

    const file = await gatherResponse(fileResponse);

    return file;
  }
}

export default GitHub;
