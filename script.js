const useProxyCheckbox = document.getElementById('useProxy');
const releaseListDiv = document.getElementById('releaseList');
const refreshButton = document.getElementById('refreshButton');
const githubRepo = 'SRInternet-Studio/PapaAI-Releases'; // 请替换为你的用户名和仓库名
const githubProxy = 'https://ghproxy.com/'; // github 镜像站地址（举例）


let useProxy = false;

async function fetchReleases(useProxyParam) {
  try {
      releaseListDiv.innerHTML = '<p>正在加载 Release 列表...</p>';
      const apiUrl = `https://api.github.com/repos/${githubRepo}/releases`;

       const response = await fetch(apiUrl);
      if(!response.ok) {
         throw new Error('无法获取 Release 列表, GitHub API 返回错误' + response.statusText);
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
               assetLink.href = useProxyParam ? githubProxy + asset.browser_download_url : asset.browser_download_url;
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

function handleProxyChange() {
    useProxy = useProxyCheckbox.checked;
    fetchReleases(useProxy);
}

// 初始加载
fetchReleases(useProxy);

// 监听切换
useProxyCheckbox.addEventListener('change', handleProxyChange);

// 刷新按钮事件
refreshButton.addEventListener('click', handleProxyChange);