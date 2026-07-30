const Q = fn => {
  try {
    return fn();
  } catch {}
};

const isNullish = x => x === null || x === undefined;

const newResponse = (...args) => {
  try {
    return new Response(...args);
  } catch (e) {
    console.warn(e, ...args);
    return new Response(String(e), {
      status: 500,
      statusText: String(e)
    });
  }
};

const newRequest = (...args) => {
  try {
    return new Request(...args);
  } catch (e) {
    console.warn(e, ...args);
    return new Request('about:request-error', {
      headers:{
        status:'400',
        'status-text':String(e).replaceAll(/[^a-zA-Z0-9]/g,' ')
      }
    });
  }
};

const makeResponse = (...args) => {
  try {
    if (/^(101|204|205|304)$/.test(args?.[1]?.status)) {
      console.warn('Trying to give a body to incompatible response code 101|204|205|304; body ignored');
      (args ?? [])[0] = null;
      delete(args ?? [])[1].body;
    }
    return newResponse(...args);
  } catch (e) {
    console.warn(e, ...args);
    return newResponse(String(e), {
      status: 500,
      statusText: String(e)
    });
  }
};
async function bestEffortResponse(response) {
  try {
    const originalResponse = response;
    if (!originalResponse.body) {
      return originalResponse;
    }
    const originalReader = Q(() => originalResponse.body.getReader());
    const resilientStream = new ReadableStream({
      async pull(controller) {
        try {
          const {
            done,
            value
          } = await originalReader.read();

          if (done == true || (isNullish(done) && isNullish(value))) {
            Q(() => controller.close());
          } else {
            controller.enqueue(value);
          }
        } catch (streamError) {
          // A mid-stream network drop or timeout caught here!
          console.warn(
            "Stream interrupted prematurely. Closing stream gracefully with partial data.",
            streamError,
          );

          Q(() => controller.close());
        }
      },
      cancel(reason) {
        Q(() => originalReader.cancel(reason).catch(() => {}));
      },
    });
    return newResponse(resilientStream, {
      status: originalResponse.status,
      statusText: originalResponse.statusText,
      headers: originalResponse.headers,
    });
  } catch (e) {
    return newResponse(String(e), {
      status: 500,
      statusText: String(e)
    });
  }
}

async function bestEffortFetch(input, init) {
  try {
    const originalResponse = await fetch(input, init);
    return await bestEffortResponse(originalResponse);
  } catch (e) {
    return newResponse(String(e), {
      status: 500,
      statusText: String(e)
    });
  }
}
const encoder = new TextEncoder();
const encode = encoder.encode.bind(encoder);

async function $bytes(res) {
  const chunks = [];
  try {
    for await (const chunk of res?.body ?? []) {
      try {
        chunks.push(...chunk);
      } catch {
        break;
      }
    }
  } catch (e) {
    return encode(String(e));
  }
  return new Uint8Array(chunks);
}

const decoder = new TextDecoder();
const decode = decoder.decode.bind(decoder);

async function $text(res) {
  try {
    if (!res.body) {
      return res.statusText || '';
    }
    return decode(await $bytes(res));
  } catch (e) {
    return String(e);
  }
}

const fetchResponse = async (...args) => {
  try {
    return await bestEffortFetch(...args);
  } catch (e) {
    return newResponse(String(e), {
      status: 500,
      statusText: String(e)
    });
  }
};
