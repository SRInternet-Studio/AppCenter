const useProxyCheckbox = document.getElementById('useProxy');
const releaseListDiv = document.getElementById('releaseList');
const refreshButton = document.getElementById('refreshButton');
const repoSelect = document.getElementById('repoSelect');

const proxies = [
    'https://gh.zhaojun.im',
    'https://ghproxy.cc',
    'https://github.7boe.top',
    'https://gitproxy.mrhjx.cn',
    'https://ghproxy.cn',
    'https://mirrors.chenby.cn',
    'https://github.tbedu.top',
    'https://gh.xx9527.cn',
    'https://fastgit.cc'
];

let useProxy = false;
let bestProxy = null;
let converter = new showdown.Converter(); // 创建Showdown转换器
let cache = {}; // 简单的缓存对象

// 测试镜像站的响应时间
async function pingProxy(proxy) {
    const startTime = performance.now();
    try {
        await fetch(proxy, { method: 'HEAD', mode: 'no-cors' });
        const endTime = performance.now();
        return endTime - startTime; // 返回响应时间
    } catch (e) {
        return Infinity; // 请求失败时返回一个很大的值
    }
}

// 查找最优镜像站
async function findBestProxy() {
    const results = await Promise.all(proxies.map(pingProxy));
    const bestIndex = results.indexOf(Math.min(...results)); // 找到响应时间最小的索引
    bestProxy = proxies[bestIndex]; // 更新最优镜像
    console.log(`最优镜像站: ${bestProxy}`);
}

// 将链接按需求替换为镜像链接
function convertToProxyLinks(url) {
    if (useProxy && bestProxy) {
        url = url.replace('github.com', bestProxy.replace('https://', ''));
        url = url.replace('raw.githubusercontent.com', bestProxy.replace('https://', ''));
    }
    return url;
}

async function fetchReleases(repo) {
    // 检查缓存
    if (cache[repo]) {
        renderReleases(cache[repo]);
        return;
    }

    try {
        releaseListDiv.innerHTML = '<p>正在加载 Release 列表...</p>';
        const apiUrl = `https://api.github.com/repos/${repo}/releases`;

        // 如果选择使用代理，先找到最佳镜像
        if (useProxy) {
            await findBestProxy();
        }

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
        console.error("获取 release 列表失败:", error);
        releaseListDiv.innerHTML = `<p>获取 Release 列表失败: ${error.message}</p>`;
    }
}

function renderReleases(releases) {
    releaseListDiv.innerHTML = ''; // 清空加载提示
    releases.forEach(release => {
        const releaseItemDiv = document.createElement('div');
        releaseItemDiv.classList.add('release-item');
        
        const releaseTitle = document.createElement('h2');
        releaseTitle.textContent = release.name || release.tag_name; // 使用 name 或 tag_name
        releaseItemDiv.appendChild(releaseTitle);
        
        const releaseBody = document.createElement('p');
        releaseBody.innerHTML = converter.makeHtml(release.body); // 使用Showdown将Markdown转换为HTML
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
