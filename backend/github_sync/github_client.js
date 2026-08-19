/**
 * Simple, robust client wrapper around GitHub REST API using Node global fetch.
 * Exposes methods to retrieve and upload file content securely.
 */

/**
 * Fetches file metadata (contents, SHA) from GitHub.
 * Returns { content: string|null, sha: string|null, exists: boolean }
 */
export const getFileContent = async (owner, repo, filePath, branch, token) => {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`;
  
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'DSM-Operations-Hub-Sync'
  };
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }

  const res = await fetch(url, { headers });
  
  if (res.status === 404) {
    return { content: null, sha: null, exists: false };
  }
  
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.message || `GitHub error (status ${res.status})`);
  }

  const data = await res.json();
  // GitHub returns file contents as base64-encoded string
  if (data.type !== 'file') {
    throw new Error(`Target path '${filePath}' is not a file (type: ${data.type})`);
  }

  let content = '';
  // If the file is smaller than 1MB, GitHub returns it in data.content
  if (data.content) {
    const contentBase64 = data.content.replace(/\r?\n|\r/g, '');
    content = Buffer.from(contentBase64, 'base64').toString('utf8');
  } else {
    // If the file is larger than 1MB, fetch raw content directly using raw media type
    const rawHeaders = { 'User-Agent': 'DSM-Operations-Hub-Sync' };
    if (token) {
      rawHeaders['Authorization'] = `token ${token}`;
    }
    const rawRes = await fetch(url, {
      headers: {
        ...rawHeaders,
        'Accept': 'application/vnd.github.v3.raw'
      }
    });
    if (!rawRes.ok) {
      throw new Error(`Failed to retrieve large database contents from GitHub (status ${rawRes.status})`);
    }
    content = await rawRes.text();
  }
  
  return {
    content,
    sha: data.sha,
    exists: true
  };
};

/**
 * Uploads (creates or updates) file content on GitHub.
 * Returns the new commit SHA.
 */
export const uploadFileContent = async (owner, repo, filePath, branch, content, sha, commitMessage, token) => {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
  
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
    'User-Agent': 'DSM-Operations-Hub-Sync'
  };
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }

  const body = {
    message: commitMessage,
    content: Buffer.from(content, 'utf8').toString('base64'),
    branch
  };

  // If the file exists, we must pass the SHA to update it
  if (sha) {
    body.sha = sha;
  }

  const res = await fetch(url, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.message || `GitHub upload error (status ${res.status})`);
  }

  const data = await res.json();
  return data.commit.sha;
};
