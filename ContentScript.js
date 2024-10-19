chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "generateQRCode") {
        const qrCodeContainer = document.getElementById(request.elementId);
        if (qrCodeContainer) {
            QRCode.toCanvas(qrCodeContainer, request.url, {
                width: 80,
                height: 80
            }, function (error) {
                if (error) console.error('二维码生成失败:', error);
            });
        }
    }
});
