# Security Policy for BOLPROOF

The BOLPROOF engineering team takes the security and privacy of neighborhood storekeepers and customers seriously. This document outlines our security policies, supported versions, and responsible vulnerability disclosure process.

---

## 1. Supported Versions

Security fixes and patches are applied to the active development branch of BOLPROOF:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0.0 | :x:                |

---

## 2. Reporting a Vulnerability

If you discover a security vulnerability, credential exposure, or potential exploit in BOLPROOF, please **do NOT report it publicly** through GitHub Issues, Discussions, or social media.

### Preferred Reporting Channel: GitHub Security Advisories
1. Navigate to the **Security** tab of the BOLPROOF GitHub repository.
2. Under "Security", click **Advisories**.
3. Click the **Report a vulnerability** button to open a draft advisory privately.
4. Provide a detailed summary, proof of concept (PoC), and affected components.

If GitHub Private Vulnerability Reporting is not yet enabled on your fork or repository clone, you can submit the issue privately by contacting the repository maintainers through their verified GitHub profile contacts.

---

## 3. What to Include in Your Report

To help us triage and resolve the issue quickly, please include:
- A clear description of the vulnerability and its potential impact.
- Exact steps to reproduce the issue (commands, sample audio payload, or request headers).
- Environment details (Node.js version, operating system, browser).
- Any proposed mitigations or code patches, if available.

---

## 4. Disclosure Timeline & Process

1. **Initial Response:** We will acknowledge receipt of your vulnerability report within **48 hours**.
2. **Investigation & Triage:** We will investigate and verify the finding within **5 business days**, providing an assessment of severity.
3. **Patch Development:** A fix will be developed in a private security fork.
4. **Coordinated Disclosure:** Once the fix is released, we will credit the reporter (unless anonymity is requested) and publish a security advisory.

---

## 5. Security Architecture & Commitments

- **Zero Secret Exposure:** Backend API keys (`GNANI_API_KEY`) must never be placed in frontend code, client bundles, or committed files.
- **Audio Privacy:** Customer voice recordings are processed in memory and never written to disk or persistent databases.
- **Rate Limiting:** Upstream voice API endpoints enforce sliding-window rate limiting to prevent denial of service and credit exhaustion.
- **Input Sanitization:** Binary audio uploads are verified against known audio magic bytes before being forwarded to upstream AI services.
