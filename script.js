/***** 全局变量声明 *****/
let releaseListDiv, repoSelect, useProxyCheckbox, refreshButton;
let proxyIndex = 0;
const PROXIES = [
    'https://gh.llkk.cc',
    'https://ghproxy.net',
    'https://gitproxy.mrhjx.cn'
];
const repoLocalization = {
    'SRInternet-Studio/PapaAI-Releases': 'PapaAI',
    'SRInternet-Studio/Wallpaper-generator': '壁纸生成器',
    'SRInternet-Studio/Seewo-Custom_Start': '希沃定制启动器',
    'SRInternet-Studio/Class_Hot_Search': '班级热搜排行榜',
    'SRInternet-Studio/Jianer_QQ_bot': '简儿QQ机器人',
    'SRInternet-Studio/Minecraft-2D': 'Minecraft 2D'
};
const RELEASE_CACHE_DURATION = 60 * 5; // 5分钟缓存
const DISPLAY_LOADER_MIN_TIME = 500;   // 加载动画最少显示时间

/***** 初始化组件 *****/
document.addEventListener('DOMContentLoaded', async () => {
    releaseListDiv = document.getElementById('releaseList');
    repoSelect = document.getElementById('repoSelect');
    useProxyCheckbox = document.getElementById('useProxy');
    refreshButton = document.getElementById('refreshButton');
    
    /***** 基础系统 *****/
    const loader = createLoader();
    const markdownConverter = new showdown.Converter();

    /***** 缓存系统 *****/
    const cachedFetch = async (key, fetchFn, expire = RELEASE_CACHE_DURATION) => {
        const now = Date.now();
        const cacheData = localStorage.getItem(key);
        
        if (cacheData) {
            const { data, timestamp } = JSON.parse(cacheData);
            if (now - timestamp < expire * 1000) return data;
        }

        const newData = await fetchFn();
        localStorage.setItem(key, JSON.stringify({
            data: newData,
            timestamp: now
        }));
        return newData;
    };

    /***** 代理系统 *****/
    async function testProxy(proxyUrl) {
        try {
            const test = await fetch(`${proxyUrl}`, { 
                timeout: 3000 
            });
            return test.status === 200;
        } catch {
            return false;
        }
    }

    async function getBestProxy() {
        for (const proxy of PROXIES) {
            if (await testProxy(proxy)) return proxy;
        }
        return null; // 无可用代理时直连
    }

    const proxyManager = {
        activeProxy: null,
        lastTest: 0,
        
        getProxyUrl(rawUrl) {
            if (!useProxyCheckbox.checked) return rawUrl;
            if (Date.now() - this.lastTest > 1000 * 60 * 60) this.refresh();
            return this.activeProxy ? `${this.activeProxy}/${rawUrl}` : rawUrl;
        },
        
        async refresh() {
            this.activeProxy = await getBestProxy();
            this.lastTest = Date.now();
        }
    };

    /***** 数据通信层 *****/
    async function fetchOrgRepos() {
        loader.show();
        try {
            const repos = await cachedFetch('org_repos', async () => {
                const res = await fetch('https://appgithub.sr-studio.cn/orgs/SRInternet-Studio/repos');
                return res.json();
            }, 600);
            
            populateRepoSelect(repos);
            if (repos.length) await fetchReleases(repos[0].full_name);
        } catch (error) {
            loadFallbackRepos();
        } finally {
            setTimeout(() => loader.hide(), DISPLAY_LOADER_MIN_TIME);
        }
    }

    /***** 视图渲染层 *****/
    function populateRepoSelect(repos) {
        repoSelect.innerHTML = Object.entries(repoLocalization)
            .map(([value, name]) => `<option value="${value}">${name}</option>`)
            .join('');
    }

    async function fetchReleases(repo) {
        if (!releaseListDiv) {
            console.error('releaseListDiv元素未初始化');
            return;
        }
        
        loader.show();
        releaseListDiv.innerHTML = '';
        
        try {
            /** 执行数据获取 **/
            const releases = await cachedFetch(`releases_${repo}`, async () => {
                const res = await fetch(`https://appgithub.sr-studio.cn/repos/${repo}/releases`);
                return res.json();
            });

            /** 呈现结果 **/
            renderReleases(releases, repo);
        } catch (error) {
            releaseListDiv.innerHTML = `
                <div class="error">
                    <h3>⚠️ 数据加载失败</h3>
                    <p>${error.message}</p>
                </div>
            `;
        } finally {
            setTimeout(() => loader.hide(), DISPLAY_LOADER_MIN_TIME);
        }
    }

    function renderReleases(releases, repo) {
        releaseListDiv.innerHTML = releases.map(release => `
            <div class="release-item">
                <div class="header">
                    <h2 data-i18n="releaseTitle">${release.name || release.tag_name}</h2>
                    <span class="tag">${release.tag_name}</span>
                </div>
                <div class="content">${markdownConverter.makeHtml(release.body)}</div>
                ${renderDownloads(release.assets)}
                ${renderActions(repo, release.tag_name)}
            </div>
        `).join('');
        
        addPoweredByFooter();
    }

    function renderDownloads(assets) {
        return `
            <div class="downloads">
                ${assets.map(asset => `

                    <a href="${proxyManager.getProxyUrl(asset.browser_download_url)}" 
                       class="btn btn-download" 
                       download 
                       data-i18n="downloadButton">
                                       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                 <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                 <polyline points="7 10 12 15 17 10"/>
                 <line x1="12" y1="15" x2="12" y2="3"/>
                   </svg>
                       ${asset.name}
                    </a>
                `).join('')}
            </div>
        `;
    }

    function renderActions(repo, tag) {
        return `
            <div class="actions">
            
                <a href="https://github.com/${repo}/releases/tag/${tag}" 
                   class="btn btn-release" data-i18n="viewRelease">
                                   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12" y2="16"/>
                </svg>
                   查看 Release
                </a>
                <a href="https://github.com/${repo}" 
                   class="btn btn-repo" data-i18n="viewRepo">
                                   <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 2048 2048">
                    <path fill="currentColor" d="M1024 1000v959l-64 32l-832-415V536l832-416l832 416v744h-128V680zm-64-736L719 384l621 314l245-122zm-64 1552v-816L256 680v816zM335 576l625 312l238-118l-622-314zm1073 1216v-128h640v128zm0-384h640v128h-640zm-256 640v-128h128v128zm0-512v-128h128v128zm0 256v-128h128v128zm-128 24h1zm384 232v-128h640v128z"/>
                </svg>
                   查看仓库
                </a>
            </div>
        `;
    }

    /***** UI组件 *****/
    function createLoader() {
        const loader = document.createElement('div');
        loader.className = 'loader';
        loader.innerHTML = `
            <div class="spinner"></div>
            <div class="text">数据加载中...</div>
        `;
        document.body.appendChild(loader);

        return {
            show() { loader.style.display = 'flex'; },
            hide() { loader.style.display = 'none'; }
        };
    }

    function addPoweredByFooter() {
        const footer = document.createElement('div');
        footer.className = 'powered-footer';
        footer.innerHTML = `
            <a href="https://sr-studio.cn" target="_blank">
                Powered by SR-Studio 
            </a>
            <a href="https://songyuhao.cn" target="_blank">
               & Songyuhao
            </a>
        `;
        releaseListDiv.appendChild(footer);
    }

    /***** 容错系统 *****/
    function loadFallbackRepos() {
        repoSelect.innerHTML = Object.entries(repoLocalization)
            .map(([value, name]) => `<option value="${value}">${name}</option>`)
            .join('');
        fetchReleases(repoSelect.value);
    }

    /***** 事件绑定 *****/
    refreshButton.addEventListener('click', () => fetchReleases(repoSelect.value));
    repoSelect.addEventListener('change', () => fetchReleases(repoSelect.value));
    useProxyCheckbox.addEventListener('change', () => proxyManager.refresh());

    /***** 启动流程 *****/
    await proxyManager.refresh();
    fetchOrgRepos(); // 初始化获取组织仓库
});

/***** 兼容性增强 *****/
/***** 兼容性增强 *****/
if (window.fetch) {
    // 保存原生fetch的引用
    const originalFetch = window.fetch;
    
    // 添加超时支持
    window.fetch = function(input, init) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), init?.timeout || 8000);
        
        return originalFetch(input, {  // 此处调用原生fetch
            ...init,
            signal: controller.signal
        }).finally(() => clearTimeout(timeoutId));
    };
}

