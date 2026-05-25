import { useState, useEffect, useCallback } from 'react';

export default function useLoad(fn) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try { await fn(); }
    catch (e) { setError(e.message || 'Failed to load data'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { run(); }, []);

  return { loading, error, reload: run };
}
