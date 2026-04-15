const registry = new FinalizationRegistry(url => URL.revokeObjectURL(url));

function BlobURL(blob) {
    const url = URL.createObjectURL(blob);
    const revoke = () => URL.revokeObjectURL(url);
    const blobURL = new String(url);
    blobURL.revoke = revoke;
    registry.register(blobURL, url);
    return blobURL;
}
