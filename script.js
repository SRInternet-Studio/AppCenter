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

    let useProxy = useProxyCheckbox.checked;
    let bestProxy = null;
    let converter = new showdown.Converter();
    let cache = {};

    // 测试镜像站响应时间
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
            bestProxy = null;
        }
    }

    // URL代理转换
    function convertToProxyLinks(url) {
        return useProxy && bestProxy ? `${bestProxy}/${url}` : url;
    }

    // 获取组织仓库列表
    async function fetchOrgRepos() {
        try {
            const apiUrl = 'https://appgithub.sr-studio.cn/orgs/SRInternet-Studio/repos';
            const response = await fetch(apiUrl);
            
            if (!response.ok) throw new Error(`请求失败: ${response.statusText}`);

            const repos = await response.json();
            repoSelect.innerHTML = '';
            
            repos.forEach(repo => {
                const option = document.createElement('option');
                option.value = repo.full_name;
                option.textContent = repo.name;
                repoSelect.appendChild(option);
            });

            if (repos.length > 0) fetchReleases(repos[0].full_name);
        } catch (error) {
            console.error("仓库列表加载失败:", error);
            // 回退到静态列表
            repoSelect.innerHTML = `
                <option value="SRInternet-Studio/PapaAI-Releases">PapaAI</option>
                <option value="SRInternet-Studio/Wallpaper-generator">壁纸生成器</option>
                <option value="SRInternet-Studio/Seewo-Custom_Start">希沃定制启动器</option>
                <option value="SRInternet-Studio/Class_Hot_Search">班级热搜排行榜</option>
            `;
            fetchReleases(repoSelect.value);
        }
    }

    // 获取Release数据
    async function fetchReleases(repo) {
        releaseListDiv.innerHTML = '<p>正在加载 Release 列表...</p>';
        try {
            const apiUrl = `https://appgithub.sr-studio.cn/repos/${repo}/releases`;
            const response = await fetch(apiUrl);
            
            if (!response.ok) throw new Error(`API错误: ${response.statusText}`);
            
            const releases = await response.json();
            cache[repo] = releases;
            renderReleases(releases, repo);
        } catch (error) {
            console.error("Release加载失败:", error);
            releaseListDiv.innerHTML = `<p>加载失败: ${error.message}</p>`;
        }
    }

    // 渲染Release内容
    function renderReleases(releases, repo) {
        releaseListDiv.innerHTML = '';
        releases.forEach(release => {
            const releaseItem = document.createElement('div');
            releaseItem.className = 'release-item';
            
            // 标题部分
            const titleRow = document.createElement('div');
            titleRow.style.display = 'flex';
            titleRow.style.justifyContent = 'space-between';
            titleRow.style.alignItems = 'center';
            
            const title = document.createElement('h2');
            title.textContent = release.name || release.tag_name;
            title.style.color = '#4F1D7A';
            
            const tag = document.createElement('span');
            tag.textContent = release.tag_name;
            tag.style.background = '#f0e6ff';
            tag.style.padding = '4px 8px';
            tag.style.borderRadius = '4px';
            
            titleRow.appendChild(title);
            titleRow.appendChild(tag);
            releaseItem.appendChild(titleRow);
            
            // 正文内容
            const body = document.createElement('div');
            body.innerHTML = converter.makeHtml(release.body);
            body.style.margin = '12px 0';
            releaseItem.appendChild(body);
            
            // 下载链接
            const downloadGroup = document.createElement('div');
            downloadGroup.style.display = 'flex';
            downloadGroup.style.gap = '8px';
            downloadGroup.style.flexWrap = 'wrap';
            
            release.assets.forEach(asset => {
                const link = document.createElement('a');
                link.className = 'btn btn-download';
                link.href = convertToProxyLinks(asset.browser_download_url);
                link.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    ${asset.name}
                `;
                downloadGroup.appendChild(link);
            });
            releaseItem.appendChild(downloadGroup);
            
            // 操作按钮
            const btnGroup = document.createElement('div');
            btnGroup.className = 'button-group';
            
            const releaseBtn = document.createElement('a');
            releaseBtn.className = 'btn btn-release';
            releaseBtn.href = `https://appgithub.sr-studio.cn/${repo}/releases/tag/${release.tag_name}`;
            releaseBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12" y2="16"/>
                </svg>
                查看 Release
            `;
            
            const repoBtn = document.createElement('a');
            repoBtn.className = 'btn btn-repo';
            repoBtn.href = `https://github.com/${repo}`;
            repoBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 2048 2048">
                    <path fill="currentColor" d="M1024 1000v959l-64 32l-832-415V536l832-416l832 416v744h-128V680zm-64-736L719 384l621 314l245-122zm-64 1552v-816L256 680v816zM335 576l625 312l238-118l-622-314zm1073 1216v-128h640v128zm0-384h640v128h-640zm-256 640v-128h128v128zm0-512v-128h128v128zm0 256v-128h128v128zm-128 24h1zm384 232v-128h640v128z"/>
                </svg>
                查看仓库
            `;
            
            btnGroup.appendChild(releaseBtn);
            btnGroup.appendChild(repoBtn);
            releaseItem.appendChild(btnGroup);
            
            releaseListDiv.appendChild(releaseItem);
        });
        
        // 页脚信息
        const footer = document.createElement('div');
        footer.style.textAlign = 'center';
        footer.style.marginTop = '20px';
        footer.innerHTML = '<a href="https://songyuhao.cn" target="_blank" style="text-decoration: none; color: #333">Powered by Songyuhao of SR思锐</a>';
        releaseListDiv.appendChild(footer);
    }

    // 事件处理
    async function handleRepoChange() {
        useProxy = useProxyCheckbox.checked;
        await findBestProxy();
        fetchReleases(repoSelect.value);
    }

    async function handleRefresh() {
        useProxy = useProxyCheckbox.checked;
        await findBestProxy();
        fetchReleases(repoSelect.value);
    }

    async function handleProxyChange() {
        useProxy = useProxyCheckbox.checked;
        await findBestProxy();
        fetchReleases(repoSelect.value);
    }

    // 初始化
    async function initialize() {
        await findBestProxy();
        await fetchOrgRepos();
    }

    // 事件监听
    useProxyCheckbox.addEventListener('change', handleProxyChange);
    refreshButton.addEventListener('click', handleRefresh);
    repoSelect.addEventListener('change', handleRepoChange);

    // 启动应用
    initialize();
});
