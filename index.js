const registry = new FinalizationRegistry(url => URL.revokeObjectURL(url));

function BlobURL(blob) {
    const url = URL.createObjectURL(blob);
    const revoke = () => URL.revokeObjectURL(url);
    const blobURL = new String(url);
    blobURL.revoke = revoke;
    registry.register(blobURL, url);
    return blobURL;
}

  const encoder = new TextEncoder();
  const encode = encoder.encode.bind(encoder);
  const decoder = new TextDecoder();
  const decode = decoder.decode.bind(decoder);
  const responseChunks = (res) => {
    const chunks = [];
    chunks.stream = res?.clone?.()?.body;
    chunks.pending = true;
    chunks.done = (async()=>{
      try {
        for await (const chunk of chunks.stream) {
          chunks.push(chunk);
        }
      } catch (e) {
        chunks.error = e;
      }
        pending = false;
        return chunks;
    })();
    return chunks;
  };
