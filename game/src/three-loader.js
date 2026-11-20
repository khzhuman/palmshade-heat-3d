export function loadThree() {
  return new Promise((resolve, reject) => {
    if (window.THREE) {
      resolve(window.THREE);
      return;
    }

    fetch('../vendor/three.b64.txt')
      .then((reply) => {
        if (!reply.ok) {
          throw new Error(`Three.js bundle request failed: ${reply.status}`);
        }
        return reply.text();
      })
      .then((source) => {
        const decoded = atob(source.replace(/\s/g, ''));
        const payload = new Uint8Array(decoded.length);
        for (let offset = 0; offset < decoded.length; offset += 1) {
          payload[offset] = decoded.charCodeAt(offset);
        }
        const objectUrl = URL.createObjectURL(new Blob([payload], { type: 'text/javascript' }));
        const element = document.createElement('script');
        element.src = objectUrl;
        element.onload = () => {
          URL.revokeObjectURL(objectUrl);
          if (window.THREE) {
            resolve(window.THREE);
          } else {
            reject(new Error('Three.js script loaded without exposing window.THREE'));
          }
        };
        element.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Three.js script could not be loaded'));
        };
        document.head.appendChild(element);
      })
      .catch(reject);
  });
}
