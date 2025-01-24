const useProxyCheckbox = document.getElementById('useProxy');
const releaseListDiv = document.getElementById('releaseList');
const refreshButton = document.getElementById('refreshButton');
const repoSelect = document.getElementById('repoSelect');

const proxies = [
    'https://gh.zhaojun.im',
    'https://ghproxy.cc',
    'https://gitproxy.mrhjx.cn',
    'https://ghproxy.cn',
    'https://mirrors.chenby.cn',
    'https://github.tbedu.top',
    'https://gh.xx9527.cn',
    'https://fastgit.cc'
];

let useProxy = false;
let bestProxy = null;
let converter = new showdown.Converter();
let cache = {}; // 简单的缓存对象

// 测试镜像站的响应时间
async function pingProxy(proxy) {
    const startTime = performance.now();
    try {
        await fetch(proxy, { method: 'HEAD', mode: 'no-cors' });
        const endTime = performance.now();
        return endTime - startTime;
    } catch (e) {
        return Infinity;
    }
}

// 查找最优镜像站
async function findBestProxy() {
    const results = await Promise.all(proxies.map(pingProxy));
    const bestIndex = results.indexOf(Math.min(...results)); // 找到响应时间最小的索引
    bestProxy = proxies[bestIndex];
    console.log(`最优镜像站: ${bestProxy}`);
}

// 将链接按需转换为代理链接
function convertToProxyLinks(url) {
    if (useProxy && bestProxy) {
        // 在代理链接的后面加上 GitHub 的 URL
        url = `${bestProxy}/${url}`;
    }
    return url;
}

// 获取 Releases 列表
async function fetchReleases(repo) {
    releaseListDiv.innerHTML = '<p>正在加载 Release 列表...</p>'; // 显示加载中
    try {
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

        // 存储到缓存
        cache[repo] = releases;

        renderReleases(releases);
    } catch (error) {
        console.error("获取 Release 列表失败:", error);
        releaseListDiv.innerHTML = `<p>获取 Release 列表失败: ${error.message}</p>`;
    }
}

// 渲染 Releases 列表
function renderReleases(releases) {
    releaseListDiv.innerHTML = ''; // 清空现有内容
    releases.forEach(release => {
        const releaseItemDiv = document.createElement('div');
        releaseItemDiv.classList.add('release-item');
        
        const releaseTitle = document.createElement('h2');
        releaseTitle.textContent = release.name || release.tag_name;
        releaseItemDiv.appendChild(releaseTitle);
        
        const releaseBody = document.createElement('p');
        releaseBody.innerHTML = converter.makeHtml(release.body);
        releaseItemDiv.appendChild(releaseBody);
        
        release.assets.forEach(asset => {
            const assetLink = document.createElement('a');
            assetLink.href = convertToProxyLinks(asset.browser_download_url); // 转换链接到代理
            assetLink.target = "_blank";
            assetLink.rel = "noopener noreferrer";
            assetLink.textContent = `下载: ${asset.name}`;
            releaseItemDiv.appendChild(assetLink);
        });

        releaseListDiv.appendChild(releaseItemDiv);
    });
}

// 处理仓库选择变化
function handleRepoChange() {
    const selectedRepo = repoSelect.value;
    fetchReleases(selectedRepo);
}

// 刷新列表事件
async function handleRefreshClick() {
    const selectedRepo = repoSelect.value;
    useProxy = useProxyCheckbox.checked;

    // 刷新时，如果开启了代理，先选择最优代理
    if (useProxy) {
        await findBestProxy();
    }
    
    fetchReleases(selectedRepo);
}

// 处理代理状态变化
async function handleProxyChange() {
    useProxy = useProxyCheckbox.checked; // 更新 useProxy 状态
    const selectedRepo = repoSelect.value;

    // 隐藏现有内容并更新为 “正在选择最优线路...”
    releaseListDiv.innerHTML = '<p>正在选择最优线路...</p>'; 

    if (useProxy) {
        await findBestProxy(); // 查找最优代理
    }

    fetchReleases(selectedRepo); // 更新 Releases 列表
}

// 初始加载
handleRepoChange(); // 加载默认选中的仓库

// 监听切换
repoSelect.addEventListener('change', handleRepoChange);
useProxyCheckbox.addEventListener('change', handleProxyChange);

// 监听刷新按钮事件
refreshButton.addEventListener('click', handleRefreshClick);