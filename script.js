document.addEventListener('DOMContentLoaded', async () => {
    const useProxyCheckbox = document.getElementById('useProxy');
    const releaseListDiv = document.getElementById('releaseList');
    const refreshButton = document.getElementById('refreshButton');
    const repoSelect = document.getElementById('repoSelect');

    const proxies = [
        'https://gh.llkk.cc',
        'https://ghproxy.net',
        'https://gitproxy.mrhjx.cn',
    ];

    let useProxy = useProxyCheckbox.checked; // 初始化时获取复选框状态
    let bestProxy = null;
    let converter = new showdown.Converter();
    let cache = {}; // 简单的缓存对象

    // 测试镜像站的响应时间
    async function pingProxy(proxy) {
        const startTime = performance.now();
        try {
            await fetch(proxy, { method: 'HEAD' });
            const endTime = performance.now();
            return endTime - startTime;
        } catch (e) {
            return Infinity;
        }
    }

    // 查找最优代理
    async function findBestProxy() {
        if (useProxy) {
            const results = await Promise.all(proxies.map(pingProxy));
            const bestIndex = results.indexOf(Math.min(...results));
            bestProxy = proxies[bestIndex];
            console.log(`最优镜像站: ${bestProxy}`);
        } else {
            bestProxy = null; // 如果不使用代理，设置为 null
        }
    }

    // 将链接按需转换为代理链接
    function convertToProxyLinks(url) {
        console.log(`转换前URL: ${url}`);
        if (useProxy && bestProxy) {
            console.log(`使用镜像站: ${bestProxy}`);
            return `${bestProxy}/${url}`;
        }
        console.log(`使用GitHub官方链接`);
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

            renderReleases(releases, repo);
        } catch (error) {
            console.error("获取 Release 列表失败:", error);
            releaseListDiv.innerHTML = `<p>获取 Release 列表失败: ${error.message}</p>`;
        }
    }

    // 渲染 Releases 列表
    function renderReleases(releases, repo) {
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
                assetLink.href = convertToProxyLinks(asset.browser_download_url); // 转换为代理链接
                assetLink.target = "_blank";
                assetLink.rel = "noopener noreferrer";
                assetLink.textContent = `下载: ${asset.name}`;
                releaseItemDiv.appendChild(assetLink);
            });

            releaseListDiv.appendChild(releaseItemDiv);
        });

        // 添加跳转到 Releases 和仓库的按钮
        const repoLinkDiv = document.createElement('div');
        const repoUrl = `https://github.com/${repo}`;
        const releaseUrl = `${repoUrl}/releases`;
        
        const viewReleaseButton = document.createElement('a');
        viewReleaseButton.href = releaseUrl;
        viewReleaseButton.target = "_blank";
        viewReleaseButton.innerText = "查看所有 Releases";
        viewReleaseButton.classList.add('btn');
        
        const viewRepoButton = document.createElement('a');
        viewRepoButton.href = repoUrl;
        viewRepoButton.target = "_blank";
        viewRepoButton.innerText = "查看仓库";
        viewRepoButton.classList.add('btn');

        repoLinkDiv.appendChild(viewReleaseButton);
        repoLinkDiv.appendChild(viewRepoButton);
        
        releaseListDiv.appendChild(repoLinkDiv);
    }

    // 处理仓库选择变化
    async function handleRepoChange() {
        const selectedRepo = repoSelect.value;
        
        // 每次切换仓库时，根据复选框状态选择代理
        useProxy = useProxyCheckbox.checked;
        await findBestProxy(); // 重新计算最优代理
        fetchReleases(selectedRepo);
    }

    // 刷新列表事件
    async function handleRefreshClick() {
        const selectedRepo = repoSelect.value;
        
        // 每次点击刷新时，根据复选框状态选择代理
        useProxy = useProxyCheckbox.checked;
        await findBestProxy(); // 重新计算最优代理
        
        fetchReleases(selectedRepo);
    }

    // 处理代理状态变化
    async function handleProxyChange() {
        console.log(`复选框状态改变`);
        useProxy = useProxyCheckbox.checked;

        // 重新计算代理（如果需要）
        await findBestProxy();
        
        const selectedRepo = repoSelect.value;
        fetchReleases(selectedRepo);
    }
    
    // 初始加载
    await findBestProxy(); // 加载默认选中的代理
    handleRepoChange(); // 加载默认选中的仓库
    useProxyCheckbox.addEventListener('change', handleProxyChange);
    console.log(`已绑定复选框事件监听器`);
    
    refreshButton.addEventListener('click', handleRefreshClick);
    console.log(`已绑定刷新按钮事件监听器`);

    // 为仓库选择下拉框绑定 change 事件
    repoSelect.addEventListener('change', handleRepoChange);
    console.log(`已绑定仓库选择事件监听器`);

    console.log(`页面加载完成`);
});
