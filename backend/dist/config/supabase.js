"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabaseAdmin = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const ws_1 = __importDefault(require("ws"));
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseSecretKey) {
    console.warn('Supabase backend auth is not configured. Set SUPABASE_URL and SUPABASE_SECRET_KEY.');
}
exports.supabaseAdmin = (0, supabase_js_1.createClient)(supabaseUrl || 'http://localhost', supabaseSecretKey || 'missing-supabase-secret-key', {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
    global: {
        fetch: fetch,
        headers: { 'x-my-custom-header': 'my-app-name' },
    },
    realtime: {
        transport: ws_1.default,
    },
});
