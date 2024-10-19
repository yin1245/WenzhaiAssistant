// 打开新窗口并显示选择的纸张大小和方向
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

    // 去除多余的空行（包括格式导致的空行）
    content = removeExtraSpaces(content);

    // 自动分页处理
    const pages = paginateContent(content, width, height);

    // 生成多页内容
    let pageContent = pages.map(page => `
        <div class="page">
            <div class="content-container">
                <div class="header">
                    <span class="mark-date">标记于 2024年10月19日</span>
                </div>
                ${page}
                <div class="footer">
                    <span class="site-name">${websiteName}</span>
                    <div id="qr-code-container" class="qr-code"></div>
                </div>
            </div>
        </div>
    `).join('');

    // 写入新窗口的HTML内容
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
                    padding: 10mm;
                    box-shadow: 0px 0px 5px rgba(0, 0, 0, 0.2);
                    background: white;
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
                    font-size: 12pt;
                    margin-bottom: 10px;
                }
                .mark-date {
                    color: #888;
                }
                .footer {
                    width: 100%;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-top: 20px;
                    font-size: 12pt;
                    color: #555;
                }
                .site-name {
                    margin-right: 10px;
                }
                .qr-code {
                    width: 80px;
                    height: 80px;
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
            <script src="https://cdn.jsdelivr.net/npm/qrcode@1.4.4/build/qrcode.min.js"></script>
        </head>
        <body>
            ${pageContent}
            <script>
                // 生成二维码
                const qrCodeContainer = document.getElementById('qr-code-container');
                if (qrCodeContainer) {
                    QRCode.toCanvas(qrCodeContainer, '${websiteURL}', {
                        width: 80,
                        height: 80
                    }, function (error) {
                        if (error) console.error(error);
                    });
                }
            </script>
        </body>
        </html>
    `);
    layoutWindow.document.close();
}

// 去除多余的空行（包括格式导致的空行）
function removeExtraSpaces(content) {
    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = content;

    // 去除空白的 <p>、<div> 和连续的 <br>
    tempContainer.querySelectorAll('p, div, br').forEach(element => {
        if (element.textContent.trim() === '' || element.offsetHeight === 0) {
            element.remove();
        }
    });

    return tempContainer.innerHTML;
}

// 改进的分页处理函数，支持段落拆分
function paginateContent(content, width, height) {
    const container = document.createElement('div');
    container.style.width = width;
    container.style.position = 'absolute';
    container.style.visibility = 'hidden';
    container.innerHTML = content;
    document.body.appendChild(container);

    const maxHeight = parseInt(height) * 3.5; // 将最大高度倍率调整为2.8
    let pages = [];
    let currentPage = document.createElement('div');
    let currentHeight = 0;

    Array.from(container.childNodes).forEach(node => {
        if (node.nodeType === 1 && node.tagName === 'P') {
            // 处理段落拆分
            splitParagraph(node, currentPage, pages, maxHeight);
        } else {
            // 处理图片或其他节点
            const clonedNode = node.cloneNode(true);
            currentPage.appendChild(clonedNode);

            // 计算当前页的滚动高度
            document.body.appendChild(currentPage);
            currentHeight = currentPage.scrollHeight;
            document.body.removeChild(currentPage);

            // 如果超过最大高度，分页
            if (currentHeight > maxHeight) {
                pages.push(currentPage.innerHTML);
                currentPage = document.createElement('div');
                currentPage.appendChild(clonedNode);
            }
        }
    });

    // 添加最后一页
    if (currentPage.innerHTML.trim() !== '') {
        pages.push(currentPage.innerHTML);
    }

    document.body.removeChild(container);
    return pages;
}

// 分段拆分段落
function splitParagraph(paragraph, currentPage, pages, maxHeight) {
    const words = paragraph.textContent.split(' ');
    let tempParagraph = document.createElement('p');
    tempParagraph.style.whiteSpace = 'nowrap';

    words.forEach(word => {
        const wordSpan = document.createElement('span');
        wordSpan.textContent = word + ' ';
        tempParagraph.appendChild(wordSpan);
        currentPage.appendChild(tempParagraph);

        // 计算当前页的滚动高度
        document.body.appendChild(currentPage);
        let currentHeight = currentPage.scrollHeight;
        document.body.removeChild(currentPage);

        // 如果超过最大高度，将当前段落部分移到新页
        if (currentHeight > maxHeight) {
            tempParagraph.removeChild(wordSpan); // 移除最后一个单词
            pages.push(currentPage.innerHTML);
            currentPage.innerHTML = ''; // 清空当前页
            tempParagraph = document.createElement('p');
            tempParagraph.style.whiteSpace = 'nowrap';
            tempParagraph.appendChild(wordSpan); // 加入新页
            currentPage.appendChild(tempParagraph);
        }
    });
}
