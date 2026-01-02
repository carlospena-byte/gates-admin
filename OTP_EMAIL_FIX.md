# OTP Email Sending Fix

## Problem

After logging in, OTP email sending was failing with:

```
Error sending magic link email (code: unexpected_failure, status: 500, AuthApiError)
```

## Root Cause

Two issues:

1. **Mailpit container was not running** - The SMTP server needed to capture emails in development wasn't started
2. **Network misconfiguration** - Mailpit wasn't on the same Docker network as Supabase containers

## Solution

### 1. Start Mailpit Container

```bash
docker compose -f docker-compose.mailpit.yml up -d
```

This starts the Mailpit container which provides:
- SMTP server on port 1025 (for Supabase to send emails)
- Web UI on port 8025 (to view captured emails)

### 2. Connect to Supabase Network

```bash
docker network connect supabase_network_gates-admin gates-admin-mailpit
```

This allows Supabase auth container to reach Mailpit by container name.

### 3. Update Supabase Config

Changed [supabase/config.toml](supabase/config.toml:184) from:

```toml
[auth.email.smtp]
enabled = true
host = "host.docker.internal"  # ❌ Doesn't work reliably
port = 1025
```

To:

```toml
[auth.email.smtp]
enabled = true
host = "gates-admin-mailpit"  # ✅ Uses container name on same network
port = 1025
```

### 4. Restart Supabase

```bash
supabase stop --workdir . --no-backup
supabase start --workdir .
```

After restart, reconnect Mailpit to network (if needed):

```bash
docker network connect supabase_network_gates-admin gates-admin-mailpit
```

## Verification

### Check Mailpit is Running

```bash
docker ps | grep mailpit
```

Expected output:
```
gates-admin-mailpit   Up X seconds (healthy)   0.0.0.0:1025->1025/tcp, 0.0.0.0:8025->8025/tcp
```

### Check Network Connection

```bash
docker network inspect supabase_network_gates-admin | grep -A 5 mailpit
```

Should show `gates-admin-mailpit` in the network.

### Test Email Sending

1. Go to login page
2. Enter `owner@residential.com`
3. Click "Send OTP"
4. Should see success message
5. Open http://localhost:8025
6. Should see OTP email with 6-digit code

## How to Use

### Login Flow

1. **Enter email**: `owner@residential.com`
2. **Click "Send OTP"**
3. **Open Mailpit**: http://localhost:8025
4. **Find the email** - should be at the top
5. **Copy the 6-digit code** from the email
6. **Paste into OTP field**
7. **Click "Verify"**
8. **Should see residential dashboard**

### Mailpit Web UI

- **URL**: http://localhost:8025
- **Features**:
  - View all captured emails
  - Search emails
  - View email HTML/text
  - No real emails sent (local only)

## Integration with dev.sh

The `scripts/dev.sh` already starts Mailpit automatically:

```bash
# From scripts/dev.sh
docker compose -f docker-compose.mailpit.yml up -d
```

So running `npm run dev` should start everything including Mailpit.

## Files Modified

1. [supabase/config.toml](supabase/config.toml) - Changed SMTP host to use container name
2. [docker-compose.mailpit.yml](docker-compose.mailpit.yml) - Already existed, no changes needed

## Success Criteria

- ✅ Mailpit container running and healthy
- ✅ Mailpit connected to `supabase_network_gates-admin`
- ✅ Supabase config uses `gates-admin-mailpit` as SMTP host
- ✅ OTP emails send successfully
- ✅ Emails visible in Mailpit UI at http://localhost:8025
- ✅ Can login with OTP code

## Test Credentials

- **Email**: `owner@residential.com`
- **Password**: `test123` (for password reset if needed)
- **Residential**: `Demo Residential`
- **Role**: Admin

## Troubleshooting

### Email still not sending

1. **Check Mailpit is running**:
   ```bash
   docker ps | grep mailpit
   ```

2. **Check network connection**:
   ```bash
   docker network ls | grep supabase
   docker network inspect supabase_network_gates-admin | grep mailpit
   ```

3. **Check Supabase logs**:
   ```bash
   docker logs supabase_auth_gates-admin
   ```

4. **Restart everything**:
   ```bash
   docker compose -f docker-compose.mailpit.yml restart
   supabase stop --workdir . --no-backup
   supabase start --workdir .
   docker network connect supabase_network_gates-admin gates-admin-mailpit
   ```

### Can't access Mailpit UI

1. **Check port 8025 is available**:
   ```bash
   lsof -i :8025
   ```

2. **Try different browser** or clear cache

3. **Access directly**: http://127.0.0.1:8025

### OTP code expired

OTP codes expire after 1 hour by default (configured in [supabase/config.toml](supabase/config.toml:179)):

```toml
otp_expiry = 3600  # seconds
```

Just request a new OTP if expired.

## Related Documentation

- [SUPABASE_RESTART_FIX.md](SUPABASE_RESTART_FIX.md) - How to restart Supabase cleanly
- [COMPLETE_RLS_FIX.md](COMPLETE_RLS_FIX.md) - RLS security fixes
- [RLS_AUTH_FIX.md](RLS_AUTH_FIX.md) - Initial RLS investigation

## Current Status

- ✅ Mailpit running and connected
- ✅ Supabase configured correctly
- ✅ Test user created: `owner@residential.com`
- ✅ Demo residential created
- ✅ Ready to test OTP login!

**Next Step**: Try logging in with OTP!
