interface Env {
  BEACH_CACHE: KVNamespace;
}

export const onRequestGet: PagesFunction<Env> = async () => {
  return Response.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
};
