let pendingLoad;

export async function loadThree() {
  if (window.THREE) return window.THREE;
  if (pendingLoad) return pendingLoad;

  pendingLoad = (async () => {
    const response = await fetch(new URL('../vendor/three.b64.txt', import.meta.url));
    if (!response.ok) throw new Error(`Three.js fetch failed: ${response.status}`);
    const decoded = atob((await response.text()).replace(/\s/g, ''));
    const bytes = new Uint8Array(decoded.length);
    for (let i = 0; i < decoded.length; i++) bytes[i] = decoded.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([bytes], { type: 'text/javascript' }));
    try {
      return await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.onload = () => {
          script.remove();
          if (window.THREE) resolve(window.THREE);
          else reject(new Error('Three.js script loaded without exposing THREE'));
        };
        script.onerror = () => {
          script.remove();
          reject(new Error('Unable to execute the vendored Three.js script'));
        };
        document.head.appendChild(script);
      });
    } finally {
      URL.revokeObjectURL(url);
    }
  })();

  try {
    return await pendingLoad;
  } catch (error) {
    pendingLoad = undefined;
    throw error;
  }
}
