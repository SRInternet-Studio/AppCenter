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
            const apiUrl = `https://appgithub.sr-studio.cn/repos/${repo}/releases`;

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

function renderReleases(releases, repo) {
    releaseListDiv.innerHTML = ''; 
    releases.forEach(release => {
        const releaseItemDiv = document.createElement('div');
        releaseItemDiv.classList.add('release-item');
        
        // 标题部分
        const titleRow = document.createElement('div');
        titleRow.style.display = 'flex';
        titleRow.style.justifyContent = 'space-between';
        titleRow.style.alignItems = 'center';
        
        const releaseTitle = document.createElement('h2');
        releaseTitle.textContent = release.name || release.tag_name;
        releaseTitle.style.color = '#4F1D7A';
        
        const tagBadge = document.createElement('span');
        tagBadge.textContent = release.tag_name;
        tagBadge.style.background = '#f0e6ff';
        tagBadge.style.padding = '4px 8px';
        tagBadge.style.borderRadius = '4px';
        tagBadge.style.fontSize = '0.9em';
        
        titleRow.appendChild(releaseTitle);
        titleRow.appendChild(tagBadge);
        releaseItemDiv.appendChild(titleRow);
        
        // 内容部分
        const releaseBody = document.createElement('div');
        releaseBody.innerHTML = converter.makeHtml(release.body);
        releaseBody.style.margin = '12px 0';
        releaseBody.style.color = '#444';
        releaseItemDiv.appendChild(releaseBody);
    
        // 下载资源链接
        const downloadGroup = document.createElement('div');
        downloadGroup.style.display = 'flex';
        downloadGroup.style.gap = '8px';
        downloadGroup.style.flexWrap = 'wrap';
        
        release.assets.forEach(asset => {
            const assetLink = document.createElement('a');
            assetLink.href = convertToProxyLinks(asset.browser_download_url);
            assetLink.className = 'btn btn-download';
            assetLink.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                ${asset.name}
            `;
            downloadGroup.appendChild(assetLink);
        });
        releaseItemDiv.appendChild(downloadGroup);
    
        // 创建按钮组
        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'button-group';
        
        const viewReleaseButton = document.createElement('a');
        viewReleaseButton.className = 'btn btn-release';
        viewReleaseButton.href = `https://github.com/${repo}/releases/tag/${release.tag_name}`;
        viewReleaseButton.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12" y2="16"/>
            </svg>
            查看 Release
        `;
        
        const viewRepoButton = document.createElement('a');
        viewRepoButton.className = 'btn btn-repo';
        viewRepoButton.href = `https://github.com/${repo}`;
        viewRepoButton.innerHTML = `
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 2048 2048"><path fill="currentColor" d="M1024 1000v959l-64 32l-832-415V536l832-416l832 416v744h-128V680zm-64-736L719 384l621 314l245-122zm-64 1552v-816L256 680v816zM335 576l625 312l238-118l-622-314zm1073 1216v-128h640v128zm0-384h640v128h-640zm-256 640v-128h128v128zm0-512v-128h128v128zm0 256v-128h128v128zm-128 24h1zm384 232v-128h640v128z"/></svg>
            查看仓库
        `;
        
        buttonGroup.appendChild(viewReleaseButton);
        buttonGroup.appendChild(viewRepoButton);
        releaseItemDiv.appendChild(buttonGroup);
        
        releaseListDiv.appendChild(releaseItemDiv);
    });
    
        // 添加 "Powered by Songyuhao" 信息
        const poweredByDiv = document.createElement('div');
        poweredByDiv.style.textAlign = 'center'; // 居中显示
        poweredByDiv.style.marginTop = '20px'; // 加上一点上边距
        const poweredByLink = document.createElement('a');
        poweredByLink.href = 'https://songyuhao.cn';
        poweredByLink.target = '_blank'; // 新窗口打开
        poweredByLink.style.textDecoration = 'none'; // 去掉默认的下划线
        poweredByLink.style.color = '#333'; // 设置文本颜色
        poweredByLink.textContent = 'Powered by Songyuhao of SR思锐';
        
        poweredByDiv.appendChild(poweredByLink);
        releaseListDiv.appendChild(poweredByDiv);
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
