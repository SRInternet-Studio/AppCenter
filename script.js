const useProxyCheckbox = document.getElementById('useProxy');
const releaseListDiv = document.getElementById('releaseList');
const refreshButton = document.getElementById('refreshButton');
const repoSelect = document.getElementById('repoSelect');

const proxyDomains = {
    original: {
        site: 'github.com',
        raw: 'raw.githubusercontent.com',
        release: 'github.com',
        git: 'github.com'
    },
    proxy: {
        site: 'github.site', // 镜像站域名
        raw: 'raw.github.site',
        release: 'github.store',
        git: 'github.store'
    }
};

let useProxy = false;

// 将链接按需求替换为镜像链接
function convertToProxyLinks(url) {
    if (useProxy) {
        url = url.replace(proxyDomains.original.site, proxyDomains.proxy.site);
        url = url.replace(proxyDomains.original.raw, proxyDomains.proxy.raw);
        url = url.replace(proxyDomains.original.release, proxyDomains.proxy.release);
        url = url.replace(proxyDomains.original.git, proxyDomains.proxy.git);
    }
    return url;
}

async function fetchReleases(repo) {
    try {
        releaseListDiv.innerHTML = '<p>正在加载 Release 列表...</p>';
        const apiUrl = `https://api.github.com/repos/${repo}/releases`;

        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`无法获取 Release 列表, GitHub API 返回错误: ${response.statusText}`);
        }

        const releases = await response.json();

        if (releases.length === 0) {
            releaseListDiv.innerHTML = '<p>没有找到任何 Release。</p>';
            return;
        }

        releaseListDiv.innerHTML = ''; // 清空加载提示
        releases.forEach(release => {
            const releaseItemDiv = document.createElement('div');
            releaseItemDiv.classList.add('release-item');
            
            const releaseTitle = document.createElement('h2');
            releaseTitle.textContent = release.name || release.tag_name; // 使用 name 或 tag_name
            releaseItemDiv.appendChild(releaseTitle);
            
            const releaseBody = document.createElement('p');
            releaseBody.innerHTML = release.body;
            releaseItemDiv.appendChild(releaseBody);
            
            release.assets.forEach(asset => {
                const assetLink = document.createElement('a');
                assetLink.href = convertToProxyLinks(asset.browser_download_url);
                assetLink.target = "_blank";
                assetLink.rel = "noopener noreferrer";
                assetLink.textContent = `下载: ${asset.name}`;
                releaseItemDiv.appendChild(assetLink);
            });

            releaseListDiv.appendChild(releaseItemDiv);
        });

    } catch (error) {
        console.error("获取 release 列表失败:", error);
        releaseListDiv.innerHTML = `<p>获取 Release 列表失败: ${error.message}</p>`;
    }
}

function handleRepoChange() {
    const selectedRepo = repoSelect.value;
    fetchReleases(selectedRepo);
}

function handleProxyChange() {
    useProxy = useProxyCheckbox.checked;
    handleRepoChange(); // 优化代码，直接刷新选择的仓库
}

// 初始加载
handleRepoChange(); // 加载默认选中的仓库

// 监听切换
repoSelect.addEventListener('change', handleRepoChange);
useProxyCheckbox.addEventListener('change', handleProxyChange);

// 刷新按钮事件
refreshButton.addEventListener('click', handleRepoChange);