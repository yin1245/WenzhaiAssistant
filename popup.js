document.addEventListener('DOMContentLoaded', () => {
    // 自动获取当前标签的 URL 和页面标题
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            const url = new URL(tabs[0].url);
            const websiteName = tabs[0].title;  // 使用标签标题
            const websiteURL = url.href;

            document.getElementById('websiteName').value = websiteName;
            document.getElementById('websiteURL').value = websiteURL;
        }
    });
});

// 监听生成按钮点击事件
document.getElementById('generateBtn').addEventListener('click', () => {
    const paperSize = document.getElementById('paperSize').value;
    const orientation = document.getElementById('orientation').value;
    const websiteName = document.getElementById('websiteName').value;
    const websiteURL = document.getElementById('websiteURL').value;

    // 获取选中的内容
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: getSelectedContent
        }, (results) => {
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError.message);
                alert("获取选中内容失败，请重试。");
            } else {
                const selectedContent = results[0].result;
                if (selectedContent) {
                    openLayout(selectedContent, paperSize, orientation, websiteName, websiteURL);
                } else {
                    alert("请先选中一些内容。");
                }
            }
        });
    });
});

// 从页面中获取选中的内容
function getSelectedContent() {
    const selection = window.getSelection();
    if (!selection.isCollapsed) {
        const range = selection.getRangeAt(0);
        const container = document.createElement('div');
        container.appendChild(range.cloneContents());
        return container.innerHTML;
    } else {
        return null;
    }
}

// 定义 openLayout 函数并生成布局
function openLayout(content, paperSize, orientation, websiteName, websiteURL) {
    const layoutWindow = window.open("", "_blank");
    if (!layoutWindow) {
        alert("请允许弹出窗口以查看页面内容。");
        return;
    }

    // 设置纸张尺寸和方向
    let width, height;
    if (paperSize === '6inch') {
        width = orientation === 'landscape' ? '152mm' : '102mm';
        height = orientation === 'landscape' ? '102mm' : '152mm';
    } else {
        width = orientation === 'landscape' ? '297mm' : '210mm';
        height = orientation === 'landscape' ? '210mm' : '297mm';
    }

    // 获取当前日期
    const currentDate = new Date().toLocaleDateString();

    // 去除多余的空行
    content = removeExtraSpaces(content);

    // 生成页面内容
    const pageContent = generatePages(content, width, height, websiteName, websiteURL, currentDate);

    layoutWindow.document.write(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${paperSize} Layout (${orientation})</title>
            <style>
                body {
                    margin: 0;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    flex-direction: column;
                    background: #f0f0f0;
                }
                .page {
                    width: ${width};
                    height: ${height};
                    padding: 5mm;
                    box-shadow: 0px 0px 5px rgba(0, 0, 0, 0.2);
                    background:url('background.jpg') no-repeat center center, rgba(255, 255, 255, 0.8); /* 添加背景图并设置透明度 */
                    background-blend-mode: overlay; /* 使透明度生效 */
                    background-size: cover; /* 覆盖页面尺寸 */
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                    justify-content: flex-start;
                    margin-bottom: 20px;
                    page-break-after: always;
                }
                .content-container {
                    width: 100%;
                    font-family: Arial, sans-serif;
                    font-size: 14pt;
                    line-height: 1.5;
                }
                .header {
                    width: 100%;
                    text-align: left;
                    font-size: 10pt; /* 缩小标记日期字体 */
                    margin-bottom: 5px; /* 减少下边距 */
                }
                .mark-date {
                    color: #888;
                }
                .footer {
                    width: 100%;
                    margin-top: 3px; /* 减少上边距 */
                    font-size: 10pt; /* 缩小网站标题和网址字体 */
                    color: #555;
                    display: flex;
                    flex-direction: column;
                }
                .site-name {
                    margin-bottom: 3px; /* 减少下边距 */
                }
                .site-link {
                    color: #0056b3;
                    text-decoration: underline;
                    margin-top: 2px; /* 减少上边距 */
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                p, div {
                    margin: 0;
                    padding: 0;
                }
                img {
                    max-width: 100%;
                    height: auto;
                    display: block;
                    margin: 10px 0;
                    page-break-inside: avoid;
                }
            </style>
        </head>
        <body>
            ${pageContent}
        </body>
        </html>
    `);
    layoutWindow.document.close();
}

// 生成页面内容的函数
function generatePages(content, width, height, websiteName, websiteURL, currentDate) {
    // 分页处理内容
    const pages = paginateContent(content, width, height);

    return pages.map((page) => `
        <div class="page">
            <div class="content-container">
                <div class="header">
                    <span class="mark-date">标记于 ${currentDate}</span>
                </div>
                ${page}
                <div class="footer">
                    <span class="site-name">${websiteName}</span>
                    ${websiteURL.length <= 100 ? `<a href="${websiteURL}" class="site-link" target="_blank">${websiteURL}</a>` : ''}
                </div>
            </div>
        </div>
    `).join('');
}

// 去除多余的空行
function removeExtraSpaces(content) {
    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = content;

    // 去除空白的 <p>、<div> 和多余的 <br> 标签
    tempContainer.querySelectorAll('p, div, br').forEach(element => {
        if (element.textContent.trim() === '' || element.offsetHeight === 0) {
            element.remove();
        }
    });

    return tempContainer.innerHTML;
}

// 分页处理函数
function paginateContent(content, width, height) {
    const container = document.createElement('div');
    container.style.width = width;
    container.style.position = 'absolute';
    container.style.visibility = 'hidden';
    container.innerHTML = content;
    document.body.appendChild(container);

    const maxHeight = parseInt(height) * 3.5;
    let pages = [];
    let currentPage = document.createElement('div');
    let currentHeight = 0;

    Array.from(container.childNodes).forEach(node => {
        const clonedNode = node.cloneNode(true);
        currentPage.appendChild(clonedNode);

        document.body.appendChild(currentPage);
        currentHeight = currentPage.scrollHeight;
        document.body.removeChild(currentPage);

        if (currentHeight > maxHeight) {
            pages.push(currentPage.innerHTML);
            currentPage = document.createElement('div');
            currentPage.appendChild(clonedNode);
        }
    });

    if (currentPage.innerHTML.trim() !== '') {
        pages.push(currentPage.innerHTML);
    }

    document.body.removeChild(container);
    return pages;
}
