/** anon key のみで生成されたシングルトンのSupabaseクライアントのDIトークン。 */
export const SUPABASE_ANON_CLIENT = Symbol('SUPABASE_ANON_CLIENT');

/**
 * service_role key で生成されたシングルトンのSupabaseクライアントのDIトークン。
 * RLSを完全にバイパスするため、限定的な場所（アラート再計算バッチ等）でのみ使用する。
 * SUPABASE_SERVICE_ROLE_KEY が未設定の場合は null になる。
 */
export const SUPABASE_SERVICE_ROLE_CLIENT = Symbol('SUPABASE_SERVICE_ROLE_CLIENT');
