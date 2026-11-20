export function loadThree() {
  return new Promise((resolve, reject) => {
    if (window.THREE) {
      resolve(window.THREE);
      return;
    }

    fetch('../vendor/three.b64.txt')
      .then((response) => {
        if (!response.ok) throw new Error(`Three.js bundle request failed: ${response.status}`);
        return response.text();
      })
      .then((encoded) => {
        const binary = atob(encoded.replace(/\s/g, ''));
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
        const url = URL.createObjectURL(new Blob([bytes], { type: 'text/javascript' }));
        const script = document.createElement('script');
        script.src = url;
        script.onload = () => {
          URL.revokeObjectURL(url);
          if (window.THREE) resolve(window.THREE);
          else reject(new Error('Three.js script loaded without exposing window.THREE'));
        };
        script.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error('Three.js script could not be loaded'));
        };
        document.head.appendChild(script);
      })
      .catch(reject);
  });
}
