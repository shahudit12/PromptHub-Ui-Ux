/**
 * Frontend Standalone Mock Client for PromptHub
 * Decoupled from remote database and backend services.
 * All queries return safe empty results and never throw null errors.
 */

function createMockQueryBuilder(): any {
  const query: any = {
    select: () => query,
    insert: () => Promise.resolve({ data: [], error: null }),
    upsert: () => Promise.resolve({ data: [], error: null }),
    update: () => query,
    delete: () => query,
    eq: () => query,
    neq: () => query,
    in: () => query,
    or: () => query,
    order: () => query,
    limit: () => query,
    range: () => query,
    single: () => Promise.resolve({ data: null, error: null }),
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
    then: (resolve: (val: any) => any) => Promise.resolve({ data: [], error: null }).then(resolve),
    catch: (reject: (val: any) => any) => Promise.resolve({ data: [], error: null }).catch(reject),
  };
  return query;
}

const mockSupabaseClient: any = {
  from: () => createMockQueryBuilder(),
  rpc: () => Promise.resolve({ data: null, error: null }),
  channel: () => ({
    on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }),
    subscribe: () => ({ unsubscribe: () => {} }),
  }),
  removeChannel: () => {},
  functions: {
    invoke: () => Promise.resolve({ data: null, error: null }),
  },
  auth: {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signInWithPassword: () => Promise.resolve({ data: null, error: null }),
    signUp: () => Promise.resolve({ data: null, error: null }),
    signOut: () => Promise.resolve({ error: null }),
  },
  storage: {
    from: () => ({
      upload: () => Promise.resolve({ data: null, error: null }),
      getPublicUrl: () => ({ data: { publicUrl: '' } }),
      list: () => Promise.resolve({ data: [], error: null }),
      remove: () => Promise.resolve({ data: [], error: null }),
    }),
  },
};

export const supabase = mockSupabaseClient;
export const isRealSupabase = (): boolean => false;

export async function getAuthHeaderToken(): Promise<string | null> {
  return null;
}
