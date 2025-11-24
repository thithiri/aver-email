# Aver.Email 📧

## What it is

**Aver.Email** 📧 is a **trustless, privacy-friendly email verification and attestation protocol**. 🔐

It allows users to prove the authenticity of their emails in a completely private manner, without revealing sensitive information.

On Aver.Email, users can upload email files (.eml) and verify their authenticity using DKIM signatures, then extract specific data using customizable regex templates—all processed in a secure Nautilus enclave. Verification templates can be built easily as per custom requirements, and attestation can be done permissionlessly.

With this verification capability, email becomes more than just communication—it becomes a source of cryptographically signed truth. Users can prove they received specific emails, extract verifiable data, and use email as a trust anchor for web3 applications, all while maintaining absolute privacy.

---

## The Problem We're Solving

Today's email ecosystem presents a difficult trade-off:

- **Privacy vs. Proof** — **Users cannot prove the authenticity of their emails without giving up their info.** To verify an email today, you often have to forward the entire message, exposing private details you didn't intend to share.
- **Email is trusted but ...** — We trust email for important communications (receipts, invitations, confirmations), but there's no easy way to prove an email's authenticity to third parties without compromising privacy.
- **DKIM exists but is underutilized** — Email servers already sign messages with DKIM, but this cryptographic proof is rarely exposed to end users or applications.
- **Data is locked in inboxes** — Valuable structured data in emails (confirmation codes, dates, amounts, addresses) can't be easily extracted and used in other applications.
- **Zero transparency** — When you do share email data, there's no way to prove it hasn't been tampered with.

The result? Users are forced to choose between privacy and provability.

---

## Our Solution

### 🥷 **Privacy-Friendly Verification**
**With Aver.Email, users can prove facts about their emails in a private manner.** You don't need to share your entire inbox or even the full content of a single email. By using trusted execution environments, we ensure that only the data you *want* to reveal is attested to.

### 📋 **Permissionless Templates**
**Verification templates can be built easily as per custom requirements, and attestation can be done permissionlessly.**
- Define custom regex patterns to extract exactly what you need.
- Anyone can create and publish a template.
- No central authority controls what can be verified.

### 🔐 **Cryptographic Trust**
Upload any email file (.eml) and verify its **DKIM signatures** cryptographically. Every verification proves:
- The email was actually sent by the claimed sender.
- The content hasn't been tampered with.
- The verification happened in a secure enclave.

### 🔒 **Provable Computation**
All verification runs in a **Nautilus Trusted Execution Environment (TEE)** on AWS Nitro Enclaves. Every verification is cryptographically attested, proving:
- Which template was used.
- What data was extracted.
- That the DKIM signature was valid.

You can verify everything on-chain. No trust required.

### 🌊 **Immutable References**
Templates and verification results can be stored on **Walrus decentralized storage**, ensuring:
- Templates can never be deleted or censored.
- Verification results are permanently accessible.
- No single point of failure.

---

## Why This Matters

**For Users:**
- **Prove email authenticity** without sharing the entire email
- **Extract verifiable data** from receipts, confirmations, and invitations
- **Privacy-preserving** — only share what you choose to reveal
- **Permanent proof** — attestations are cryptographically signed and can be stored forever

**For Developers:**
- **Email as an oracle** — use verified email data in smart contracts
- **Social graph** — email is the OG social network, now verifiable
- **Onboarding** — verify users without centralized identity providers
- **Compliance** — prove receipt of important communications

**For the Ecosystem:**
- **Unlock email data** — billions of emails contain valuable, verifiable information
- **Open source** — fully auditable, forkable, and community-owned
- **Decentralized** — no single point of failure or control
- **Privacy-first** — users control what data they reveal

---

## Real-World Use Cases

- **Student verification** — Prove you're a student without sharing your entire .edu email
- **Employment verification** — Prove you work at a company using your work email
- **Event access** — Verify party invitations with secret codes (like our Walrus party demo!)
- **Payment proof** — Extract and verify payment amounts and dates from receipts
- **Subscription verification** — Prove you're subscribed to a service
- **Age verification** — Prove you received an email before/after a certain date
- **Web3 onboarding** — Use email as a trust anchor for decentralized applications

---

## The Technology Stack

Built with cutting-edge web3 and cryptographic infrastructure:

- **Frontend**: Next.js 14 + React 18 + Tailwind CSS
- **Secure Compute**: Rust-based Nautilus server in a Trusted Execution Environment (TEE) on AWS Nitro Enclaves
- **Email Verification**: DKIM signature verification with regex-based data extraction
- **Storage**: Walrus decentralized storage for templates and attestations
- **Blockchain**: Sui for on-chain attestation verification and enclave registration
- **Reproducible Builds**: Verifiable PCR values ensure the enclave runs unmodified code

---

## How It Works

**Developer Setup:**
1. Build a reproducible Nautilus server with DKIM verification
2. Register the enclave's Platform Configuration Registers (PCRs) on Sui
3. Deploy to AWS Nitro Enclave with cryptographic attestation
4. Publish source code for transparency and verifiability

**User Flow:**
1. Upload an email file (.eml) to the frontend
2. Select a verification template (or create a custom one)
3. Email is processed in the Nautilus enclave
4. Receive a cryptographically signed attestation with:
   - DKIM verification results
   - Regex match results
   - Extracted data (if any)
   - Enclave signature
5. Use the attestation in web3 apps, smart contracts, or store on Walrus

---

## Future Possibilities

- **Template builder** — Create, and share verification templates
- **Smart contract integration** — Use email attestations directly in Sui Move contracts
- **Multi-signature verification** — Combine multiple email proofs for stronger attestations
- **Encrypted email support** — Verify PGP/GPG signed emails
- **Email-based authentication** — Passwordless login using email verification
- **Automated workflows** — Trigger actions based on verified email events

---

## Why Aver.Email Will Win

**Email is the most widely used digital communication tool**, yet its cryptographic capabilities remain locked away. DKIM signatures prove authenticity, but no one uses them. Structured data sits in inboxes, inaccessible to applications.

**Aver.Email unlocks this potential** by making email verification:
- **Easy** → Upload .eml, select template, get attestation
- **Trustless** → Cryptographic proofs, no central authority
- **Private** → Only reveal what you choose
- **Transparent** → All verification happens in a provable TEE
- **Permanent** → Store attestations on Walrus forever

This isn't just an email tool. It's the foundation for **email as a source of verifiable truth** in the web3 era.

---

## Join the Revolution

📧 **Users**: Verify your emails and unlock their cryptographic potential  
🔧 **Developers**: Build applications using email as a trust anchor  
💻 **Contributors**: Help us expand template libraries and verification capabilities  
🌐 **Community**: Shape the future of verifiable email

**Aver.Email** — Where email meets cryptography, privacy, and permanence. 📧🔐

---

**In email we trust. In cryptography we verify.** ✉️✨
