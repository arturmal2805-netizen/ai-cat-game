// A developed world plus its merge base exceeds the browser's 64 KiB
// keepalive budget. Compress the transport, never the durable local journal.
export async function cloudSaveRequest(
  payload,
  Compressor = globalThis.CompressionStream,
) {
  const json = JSON.stringify(payload),
    bytes = new TextEncoder().encode(json);
  if (bytes.length > 60000 && Compressor) {
    try {
      const stream = new Blob([bytes])
          .stream()
          .pipeThrough(new Compressor("gzip")),
        body = new Uint8Array(await new Response(stream).arrayBuffer());
      if (body.length < bytes.length)
        return {
          body,
          headers: { "Content-Encoding": "gzip" },
          keepalive: body.length <= 60000,
        };
    } catch {}
  }
  return { body: json, headers: {}, keepalive: bytes.length <= 60000 };
}
