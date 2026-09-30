---
name: Development Supabase TLS chain
description: Why the development Supabase connection requires special node-postgres TLS handling
---

The development Supabase endpoint presented a certificate chain that node-postgres could not verify. The container's system CA bundle did not validate it either. Passing `ssl: false` alongside a connection string with `sslmode=require` did not turn TLS off, because node-postgres parses the URL setting afterward; removing that URL setting did connect but would transmit credentials without TLS. A development-only encrypted connection that skips chain verification was chosen to restore availability. Production connections must retain their existing settings.

**Why:** Preview startup crashed when node-postgres encountered the certificate chain. Disabling encryption to work around it would expose database traffic.

**How to apply:** If database TLS needs revisiting, obtain and verify a trusted CA chain independently, then replace the development-only exception; do not generalize the exception to production or unrelated hosts.