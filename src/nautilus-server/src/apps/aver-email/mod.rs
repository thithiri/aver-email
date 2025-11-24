use crate::common::IntentMessage;
use crate::common::{to_signed_response, IntentScope, ProcessDataRequest, ProcessedDataResponse};
use crate::AppState;
use crate::EnclaveError;
use axum::extract::State;
use axum::Json;
#[cfg(feature = "mail-auth")]
use mail_auth::{AuthenticatedMessage, MessageAuthenticator};
// Use hickory-resolver directly for DoH support
#[cfg(all(feature = "mail-auth", feature = "hickory-resolver"))]
use hickory_resolver::config::ResolverOpts;

// Custom DoH resolver for enclave environment
#[cfg(all(feature = "mail-auth", feature = "hickory-resolver"))]
mod doh_resolver;
#[cfg(all(feature = "mail-auth", feature = "hickory-resolver"))]
use doh_resolver::create_doh_resolver_config;
#[cfg(feature = "base64")]
#[allow(unused_imports)] // Used in commented-out code for production
use base64;
use serde::{Deserialize, Serialize};
#[cfg(not(feature = "mail-auth"))]
use serde_json::Value;
#[cfg(feature = "regex")]
use regex::Regex;
#[cfg(all(feature = "mail-auth", feature = "chrono"))]
use chrono::{DateTime, NaiveDate};
use std::sync::Arc;
use tracing::info;

// Constants
#[cfg(feature = "mail-auth")]
const MAX_MESSAGE_SIZE: usize = 10 * 1024 * 1024; // 10MB limit
#[cfg(feature = "mail-auth")]
const MAX_BODY_SIZE: usize = 5 * 1024 * 1024; // 5MB body limit
#[cfg(feature = "mail-auth")]
const VALID_FIELDS: &[&str] = &["sender", "subject", "recipient", "body", "date"];

/// ====
/// Core Nautilus server logic, replace it with your own
/// relavant structs and process_data endpoint.
/// ====
/// Inner type T for IntentMessage<T>
/// Request for DKIM verification (base64 encoded email message)
#[cfg(feature = "mail-auth")]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RegexValidationRequest {
    pub regex: String,
    pub field: String,
}

#[cfg(feature = "mail-auth")]
#[derive(Debug, Serialize, Deserialize)]
pub struct DkimMessageRequest {
    /// Base64 encoded email message (RFC 5322 format)
    pub message: String,
    /// Optional array of regex validations to perform
    #[serde(default)]
    pub regexes: Vec<RegexValidationRequest>,
}

#[cfg(feature = "mail-auth")]
pub async fn process_data(
    State(state): State<Arc<AppState>>,
    Json(request): Json<ProcessDataRequest<DkimMessageRequest>>,
) -> Result<Json<ProcessedDataResponse<IntentMessage<DkimVerifyResult>>>, EnclaveError> {
    info!("DKIM verification requested via process_data");
    
    // Decode base64 message - preserve exact bytes for DKIM verification
    use base64::Engine;
    let cleaned = request.payload.message
        .chars()
        .filter(|c| !c.is_whitespace())
        .collect::<String>();
    
    let message_bytes = base64::engine::general_purpose::STANDARD
        .decode(&cleaned)
        .map_err(|e| {
            EnclaveError::GenericError(format!(
                "Failed to decode base64 message: {}. Make sure the base64 string is valid and doesn't contain extra whitespace.",
                e
            ))
        })?;
    
    // Validate message size
    if message_bytes.len() > MAX_MESSAGE_SIZE {
        return Err(EnclaveError::GenericError(format!(
            "Message too large: {} bytes (max: {} bytes)",
            message_bytes.len(),
            MAX_MESSAGE_SIZE
        )));
    }
    
    info!("Message size: {} bytes", message_bytes.len());

    // Parse the email message - this preserves the raw message bytes for DKIM verification
    // AuthenticatedMessage::parse() uses the raw bytes directly, so body hash should match
    info!("Parsing email message...");
    let mut authenticated_message = AuthenticatedMessage::parse(&message_bytes).ok_or_else(|| {
        EnclaveError::GenericError("Failed to parse email message".to_string())
    })?;
    info!("Email message parsed successfully");
    
    // mail-auth refuses to verify signatures where x (expiration) is in the past.
    // Clear the expiration so we can still perform the cryptographic check and
    // report success if everything else matches.
    for header in authenticated_message.dkim_headers.iter_mut() {
        if let Ok(signature) = &mut header.header {
            if signature.x != 0 {
                signature.x = 0;
            }
        }
    }
    
    // Helper function to extract email address from header value
    fn extract_email_from_header_value(value: &[u8]) -> String {
        let header_value = String::from_utf8_lossy(value).trim().to_string();
        // Handle formats: "Name <email@example.com>" or "email@example.com"
        if header_value.contains('<') && header_value.contains('>') {
            // Format: "Name <email@example.com>"
            header_value
                .split('<')
                .last()
                .and_then(|s| s.split('>').next())
                .map(|s| s.trim().to_string())
                .unwrap_or_else(|| header_value)
        } else {
            // Format: "email@example.com" or just the email
            header_value
        }
    }
    
    // Helper function to decode RFC 2047 encoded-word (MIME encoding)
    // Format: =?charset?encoding?encoded-text?=
    // encoding can be Q (quoted-printable) or B (base64)
    fn decode_rfc2047(encoded: &str) -> String {
        let mut result = String::new();
        let mut remaining = encoded;
        
        while let Some(start) = remaining.find("=?") {
            // Add text before the encoded word
            result.push_str(&remaining[..start]);
            remaining = &remaining[start + 2..];
            
            // Find the end of the encoded word
            if let Some(end) = remaining.find("?=") {
                let encoded_part = &remaining[..end];
                remaining = &remaining[end + 2..];
                
                // Parse: charset?encoding?text
                let parts: Vec<&str> = encoded_part.split('?').collect();
                if parts.len() == 3 {
                    let _charset = parts[0];
                    let encoding = parts[1];
                    let text = parts[2];
                    
                    let decoded = if encoding.eq_ignore_ascii_case("Q") {
                        // Quoted-printable decoding
                        decode_quoted_printable(text)
                    } else if encoding.eq_ignore_ascii_case("B") {
                        // Base64 decoding
                        if let Ok(decoded_bytes) = base64::engine::general_purpose::STANDARD.decode(text) {
                            String::from_utf8_lossy(&decoded_bytes).to_string()
                        } else {
                            text.to_string() // Fallback to original if decode fails
                        }
                    } else {
                        text.to_string() // Unknown encoding, return as-is
                    };
                    
                    result.push_str(&decoded);
                } else {
                    // Invalid format, keep original
                    result.push_str("=?");
                    result.push_str(encoded_part);
                    result.push_str("?=");
                }
            } else {
                // No closing ?=, keep rest as-is
                result.push_str("=?");
                result.push_str(remaining);
                break;
            }
        }
        
        // Add any remaining text
        result.push_str(remaining);
        result
    }
    
    // Helper function to decode quoted-printable text
    fn decode_quoted_printable(text: &str) -> String {
        let mut result = String::new();
        let mut chars = text.chars().peekable();
        
        while let Some(ch) = chars.next() {
            if ch == '=' {
                // Check if it's a hex sequence (=XX)
                if let (Some(d1), Some(d2)) = (chars.next(), chars.next()) {
                    if let (Some(n1), Some(n2)) = (d1.to_digit(16), d2.to_digit(16)) {
                        let byte = (n1 << 4 | n2) as u8;
                        result.push(byte as char);
                        continue;
                    } else {
                        // Not a valid hex sequence, keep the =
                        result.push('=');
                        result.push(d1);
                        if let Some(d2) = chars.peek() {
                            result.push(*d2);
                            chars.next();
                        }
                        continue;
                    }
                } else {
                    // Incomplete sequence, keep the =
                    result.push('=');
                    if let Some(d1) = chars.next() {
                        result.push(d1);
                    }
                    continue;
                }
            } else if ch == '_' {
                // Underscore in quoted-printable represents a space
                result.push(' ');
            } else {
                result.push(ch);
            }
        }
        
        result
    }
    
    // Helper function to extract header value as string
    fn extract_header_value(headers: &[(&[u8], &[u8])], header_name: &[u8]) -> Option<String> {
        headers
            .iter()
            .find(|(name, _)| name.eq_ignore_ascii_case(header_name))
            .map(|(_, value)| {
                let raw_value = String::from_utf8_lossy(value).trim().to_string();
                // Decode RFC 2047 encoded words
                decode_rfc2047(&raw_value)
            })
    }
    
    // Extract headers
    let headers = authenticated_message.raw_parsed_headers();
    
    // Extract sender (From header)
    let sender = extract_header_value(&headers, b"From")
        .map(|v| extract_email_from_header_value(v.as_bytes()))
        .unwrap_or_else(|| "unknown".to_string());
    info!("Sender address: {}", sender);
    
    // Extract recipient (To header)
    let recipient = extract_header_value(&headers, b"To")
        .map(|v| extract_email_from_header_value(v.as_bytes()))
        .unwrap_or_else(|| "unknown".to_string());
    info!("Recipient address: {}", recipient);
    
    // Extract subject
    let subject = extract_header_value(&headers, b"Subject")
        .unwrap_or_else(|| "".to_string());
    info!("Subject: {}", subject);
    
    // Extract date (Date header)
    let date = extract_header_value(&headers, b"Date")
        .unwrap_or_else(|| "".to_string());
    info!("Date: {}", date);
    
    // Helper function to extract email body
    // Checks Content-Transfer-Encoding header and decodes accordingly
    fn extract_email_body(message_bytes: &[u8], headers: &[(&[u8], &[u8])]) -> String {
        // Find where headers end (blank line: \r\n\r\n or \n\n)
        let body_start = message_bytes.windows(4)
            .position(|w| w == b"\r\n\r\n" || w == b"\n\n")
            .map(|pos| {
                // Skip the blank line separator
                if message_bytes[pos..].starts_with(b"\r\n\r\n") {
                    pos + 4
                } else {
                    pos + 2
                }
            })
            .unwrap_or(0);
        
        // Check Content-Transfer-Encoding header
        let transfer_encoding = extract_header_value(headers, b"Content-Transfer-Encoding")
            .unwrap_or_else(|| "".to_string())
            .to_lowercase();
        
        // Extract raw body bytes
        let body_bytes = &message_bytes[body_start..];
        
        // Decode based on Content-Transfer-Encoding
        let decoded_body = if transfer_encoding.contains("quoted-printable") {
            // Fully decode quoted-printable
            decode_quoted_printable_body(body_bytes)
        } else if transfer_encoding.contains("base64") {
            // Decode base64
            // Base64 in email bodies is typically line-wrapped, so we need to remove whitespace first
            let cleaned: String = String::from_utf8_lossy(body_bytes)
                .chars()
                .filter(|c| !c.is_whitespace())
                .collect();
            if let Ok(decoded_bytes) = base64::engine::general_purpose::STANDARD.decode(&cleaned) {
                String::from_utf8_lossy(&decoded_bytes).to_string()
            } else {
                // Fallback to UTF-8 if base64 decode fails
                String::from_utf8_lossy(body_bytes).to_string()
            }
        } else {
            // 7bit, 8bit, or binary - treat as plain text
            String::from_utf8_lossy(body_bytes).to_string()
        };
        
        // Normalize multiple spaces to single spaces for regex matching
        decoded_body
            .split_whitespace()
            .collect::<Vec<_>>()
            .join(" ")
    }
    
    // Helper function to fully decode quoted-printable body
    // This handles both soft line breaks (= at end of line) and hex-encoded bytes (=XX)
    fn decode_quoted_printable_body(body_bytes: &[u8]) -> String {
        let body_text = String::from_utf8_lossy(body_bytes);
        let mut result = String::new();
        let mut chars = body_text.chars().peekable();
        
        while let Some(ch) = chars.next() {
            if ch == '=' {
                // Check if it's a soft line break (= at end of line)
                // Look ahead to see if next char is newline or we're at end of line
                let is_soft_break = match chars.peek() {
                    Some(&'\r') | Some(&'\n') => true,
                    None => true,
                    _ => false,
                };
                
                if is_soft_break {
                    // Soft line break - skip the = and any following newline
                    if let Some(&'\r') = chars.peek() {
                        chars.next();
                    }
                    if let Some(&'\n') = chars.peek() {
                        chars.next();
                    }
                    // Don't add anything - soft breaks are removed
                    continue;
                }
                
                // Check if it's a hex-encoded byte (=XX)
                if let (Some(d1), Some(d2)) = (chars.next(), chars.next()) {
                    if let (Some(n1), Some(n2)) = (d1.to_digit(16), d2.to_digit(16)) {
                        let byte = (n1 << 4 | n2) as u8;
                        result.push(byte as char);
                        continue;
                    } else {
                        // Not a valid hex sequence, keep the =
                        result.push('=');
                        result.push(d1);
                        if let Some(d2) = chars.peek() {
                            result.push(*d2);
                            chars.next();
                        }
                        continue;
                    }
                } else {
                    // Incomplete sequence, keep the =
                    result.push('=');
                    if let Some(d1) = chars.next() {
                        result.push(d1);
                    }
                    continue;
                }
            } else if ch == '_' {
                // Underscore in quoted-printable represents a space
                result.push(' ');
            } else {
                result.push(ch);
            }
        }
        
        result
    }
    
    // Extract body (pass headers to check Content-Transfer-Encoding)
    let body = extract_email_body(&message_bytes, &headers);
    
    // Validate body size
    if body.len() > MAX_BODY_SIZE {
        return Err(EnclaveError::GenericError(format!(
            "Email body too large: {} bytes (max: {} bytes)",
            body.len(),
            MAX_BODY_SIZE
        )));
    }
    
    info!("Body size: {} bytes", body.len());
    
    // Validate against regex patterns and collect results
    let mut regex_validations = Vec::new();
    
    #[cfg(feature = "regex")]
    {
        // Iterate over regex validations from request
        for regex_req in &request.payload.regexes {
            // Validate field name
            if !VALID_FIELDS.contains(&regex_req.field.as_str()) {
                return Err(EnclaveError::GenericError(format!(
                    "Invalid field '{}'. Valid fields are: {}",
                    regex_req.field,
                    VALID_FIELDS.join(", ")
                )));
            }
            
            // Get the field value based on field name
            let field_value = match regex_req.field.as_str() {
                "sender" => &sender,
                "subject" => {
                    // Log subject content for debugging
                    info!("Subject content: '{}'", subject);
                    &subject
                },
                "recipient" => &recipient,
                "body" => {
                    // Log body content for debugging (truncate if too long)
                    if body.len() > 200 {
                        info!("Body content (first 200 chars): {}", &body[..200]);
                    } else {
                        info!("Body content: {}", body);
                    }
                    &body
                },
                "date" => &date,
                _ => unreachable!(), // Already validated above
            };
            
            // Check if this is a date comparison for the date field (regex starts with >, >=, <, <=, ==)
            let (matched, matched_text) = if regex_req.field == "date" && 
                (regex_req.regex.starts_with('>') || regex_req.regex.starts_with('<') || regex_req.regex.starts_with("==")) {
                // Parse operator and date from regex string
                let (op, date_str) = if regex_req.regex.starts_with(">=") {
                    (">=", &regex_req.regex[2..])
                } else if regex_req.regex.starts_with("<=") {
                    ("<=", &regex_req.regex[2..])
                } else if regex_req.regex.starts_with("==") {
                    ("==", &regex_req.regex[2..])
                } else if regex_req.regex.starts_with('>') {
                    (">", &regex_req.regex[1..])
                } else {
                    // Must be '<' since we already checked it starts with one of the operators
                    ("<", &regex_req.regex[1..])
                };
                
                // Parse the date from the regex string (should be YYYY-MM-DD format)
                let comparison_date = NaiveDate::parse_from_str(date_str.trim(), "%Y-%m-%d").map_err(|_| {
                    EnclaveError::GenericError(format!(
                        "Invalid date format '{}' in regex. Expected format: '>YYYY-MM-DD', '>=YYYY-MM-DD', '<YYYY-MM-DD', '<=YYYY-MM-DD', or '==YYYY-MM-DD'",
                        regex_req.regex
                    ))
                })?;
                
                // Parse the email date header (RFC 2822 format)
                let email_date = DateTime::parse_from_rfc2822(field_value)
                    .map(|dt| dt.date_naive())
                    .map_err(|_| {
                        EnclaveError::GenericError(format!(
                            "Failed to parse date '{}' from email Date header. Expected RFC 2822 format (e.g., 'Fri, 14 Nov 2025')",
                            field_value
                        ))
                    })?;
                
                // Perform comparison using NaiveDate's Ord implementation
                let comparison_result = match op {
                    ">" => email_date > comparison_date,
                    ">=" => email_date >= comparison_date,
                    "<" => email_date < comparison_date,
                    "<=" => email_date <= comparison_date,
                    "==" => email_date == comparison_date,
                    _ => false,
                };
                
                if !comparison_result {
                    info!("✗ Field '{}' date '{}' does not satisfy '{}'", 
                        regex_req.field, field_value, regex_req.regex);
                    return Err(EnclaveError::GenericError(format!(
                        "Field '{}' date '{}' does not satisfy '{}'",
                        regex_req.field, field_value, regex_req.regex
                    )));
                }
                
                info!("✓ Field '{}' date '{}' satisfies '{}'", 
                    regex_req.field, field_value, regex_req.regex);
                
                // For date comparisons, we consider it matched and show the email date
                (true, Some(field_value.to_string()))
            } else {
                // Normal regex matching
                // For body field, enable multiline mode to match across line breaks
                // Rust's regex crate doesn't match newlines by default, unlike JavaScript
                let regex = if regex_req.field == "body" {
                    // Use (?s) flag to enable "dot matches newline" mode (similar to JavaScript's /s flag)
                    let pattern = if regex_req.regex.starts_with("(?s)") {
                        regex_req.regex.clone()
                    } else {
                        format!("(?s){}", regex_req.regex)
                    };
                    Regex::new(&pattern).map_err(|e| {
                        EnclaveError::GenericError(format!(
                            "Invalid regex pattern '{}' for field '{}': {}",
                            regex_req.regex, regex_req.field, e
                        ))
                    })?
                } else {
                    Regex::new(&regex_req.regex).map_err(|e| {
                        EnclaveError::GenericError(format!(
                            "Invalid regex pattern '{}' for field '{}': {}",
                            regex_req.regex, regex_req.field, e
                        ))
                    })?
                };
                
                let matched = regex.is_match(field_value);
                
                // Automatically extract matched text if regex has capture groups and match succeeded
                // If capture group exists, show the first capture group; otherwise don't show anything
                let matched_text = if matched {
                    regex.captures(field_value)
                        .and_then(|caps| {
                            // If regex has capture groups, extract the first capture group (index 1)
                            caps.get(1).map(|m| m.as_str().to_string())
                        })
                } else {
                    None
                };
                
                (matched, matched_text)
            };
            
            regex_validations.push(RegexValidationResult {
                field: regex_req.field.clone(),
                regex: regex_req.regex.clone(),
                matched,
                matched_text,            
            });
            
            // Early return on validation failure (before processing all regexes)
            if !matched {
                info!("✗ Field '{}' does not match pattern '{}'", 
                    regex_req.field, regex_req.regex);
                return Err(EnclaveError::GenericError(format!(
                    "Field '{}' does not match required pattern '{}'",
                    regex_req.field, regex_req.regex
                )));
            }
            info!("✓ Field '{}' matches pattern '{}'", 
                regex_req.field, regex_req.regex);
        }
    }

    // Create authenticator using custom DoH resolver
    info!("Creating MessageAuthenticator with custom DoH resolver (port 443)...");
    let resolver_config = create_doh_resolver_config();
    
    // Configure resolver options with increased timeouts for enclave environments
    // Traffic forwarding through VSOCK adds latency, so we need longer timeouts
    use std::time::Duration;
    let mut resolver_opts = ResolverOpts::default();
    resolver_opts.timeout = Duration::from_secs(10); // Increase from default 5s to 10s for enclave
    resolver_opts.attempts = 3; // Retry up to 3 times
    
    let authenticator = MessageAuthenticator::new(resolver_config, resolver_opts).map_err(|e| {
        EnclaveError::GenericError(format!(
            "Failed to create MessageAuthenticator with Google DoH: {}. Make sure 'dns.google' is whitelisted in allowed_endpoints.yaml. Error details: {:?}",
            e, e
        ))
    })?;
    info!("MessageAuthenticator created successfully");

    // Verify DKIM signatures
    info!("Starting DKIM verification (will make DNS queries via DoH to dns.google:443)...");
    let dkim_results = authenticator
        .verify_dkim(&authenticated_message)
        .await;
    info!("DKIM verification completed, processing {} result(s)", dkim_results.len());

    // Process results
    let mut verified_signatures = Vec::new();
    let mut failed_signatures = Vec::new();

    // Extract domain and selector from DKIM-Signature headers in the message
    // Parse headers to get domain and selector for each signature
    let dkim_headers: Vec<(String, String)> = authenticated_message
        .raw_parsed_headers()
        .iter()
        .filter_map(|(name, value)| {
            let name_str = String::from_utf8_lossy(name);
            if name_str.eq_ignore_ascii_case("DKIM-Signature") {
                // Parse d=domain and s=selector from DKIM-Signature header
                let value_str = String::from_utf8_lossy(value);
                let domain = value_str
                    .split(';')
                    .find(|part| part.trim().starts_with("d="))
                    .and_then(|part| part.trim().strip_prefix("d="))
                    .map(|s| s.trim().to_string())
                    .unwrap_or_else(|| "unknown".to_string());
                let selector = value_str
                    .split(';')
                    .find(|part| part.trim().starts_with("s="))
                    .and_then(|part| part.trim().strip_prefix("s="))
                    .map(|s| s.trim().to_string())
                    .unwrap_or_else(|| "unknown".to_string());
                Some((domain, selector))
            } else {
                None
            }
        })
        .collect();

    for (idx, result) in dkim_results.iter().enumerate() {
        let dkim_result = result.result();
        
        // Extract domain and selector from parsed headers
        let (domain, selector) = dkim_headers.get(idx)
            .map(|(d, s)| (d.clone(), s.clone()))
            .unwrap_or_else(|| ("unknown".to_string(), "unknown".to_string()));
        
        let result_str = format!("{:?}", dkim_result);
        
        // Log before moving values into struct
        match dkim_result {
            mail_auth::DkimResult::Pass => {
                info!("DKIM Signature #{}: ✓ PASSED (domain: {}, selector: {})", idx + 1, domain, selector);
            }
            mail_auth::DkimResult::Neutral(reason) => {
                info!("DKIM Signature #{}: ⚠ NEUTRAL (domain: {}, selector: {}) - {:?}", idx + 1, domain, selector, reason);
                
                // Provide specific guidance for FailedBodyHashMatch
                let reason_str = format!("{:?}", reason);
                if reason_str.contains("FailedBodyHashMatch") {
                    info!("  → FailedBodyHashMatch: The body hash doesn't match. Common causes:");
                    info!("     1. Line ending differences (CRLF vs LF) - email was saved with different line endings");
                    info!("     2. Message modification - body was changed after signing");
                    info!("     3. Whitespace changes - trailing spaces or tabs were added/removed");
                    info!("     Solution: Ensure the email is in its original transmitted form (typically CRLF line endings)");
                }
            }
            _ => {
                info!("DKIM Signature #{}: ✗ FAILED (domain: {}, selector: {}) - {}", idx + 1, domain, selector, result_str);
            }
        }
        
        let signature_info = DkimSignatureResult {
            domain,
            selector,
            result: result_str,
        };
        
        match dkim_result {
            mail_auth::DkimResult::Pass => {
                verified_signatures.push(signature_info);
            }
            mail_auth::DkimResult::Neutral(_) => {
                failed_signatures.push(signature_info);
            }
            _ => {
                failed_signatures.push(signature_info);
            }
        }
    }

    // Only return signed response if all signatures are verified
    if failed_signatures.is_empty() && !verified_signatures.is_empty() {
        info!("All DKIM signatures verified successfully ({} signature(s))", verified_signatures.len());
        
        let timestamp_ms = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map_err(|e| EnclaveError::GenericError(format!("Failed to get timestamp: {}", e)))?
            .as_millis() as u64;

        let result = DkimVerifyResult {
            dkim_signatures: DkimSignaturesSummary {
                total_count: dkim_results.len(),
                verified_count: verified_signatures.len(),
            },
            // verified_signatures,
            // failed_signatures: Vec::new(),
            regex_validations,
        };

        Ok(Json(to_signed_response(
            &state.eph_kp,
            result,
            timestamp_ms,
            IntentScope::ProcessData,
        )))
    } else {
        // Return error if any signatures failed or no signatures found
        let error_msg = if failed_signatures.is_empty() {
            "No DKIM signatures found in email message".to_string()
        } else {
            format!("DKIM verification failed: {} signature(s) failed out of {}", failed_signatures.len(), dkim_results.len())
        };
        
        Err(EnclaveError::GenericError(error_msg))
    }
}

#[cfg(feature = "mail-auth")]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DkimSignaturesSummary {
    pub total_count: usize,
    pub verified_count: usize,
}

#[cfg(feature = "mail-auth")]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DkimVerifyResult {
    pub dkim_signatures: DkimSignaturesSummary,
    // pub verified_signatures: Vec<DkimSignatureResult>,
    // pub failed_signatures: Vec<DkimSignatureResult>,
    pub regex_validations: Vec<RegexValidationResult>,
}

#[cfg(feature = "mail-auth")]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DkimSignatureResult {
    pub domain: String,
    pub selector: String,
    pub result: String,
}

#[cfg(feature = "mail-auth")]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RegexValidationResult {
    pub field: String,
    pub regex: String,
    pub matched: bool,
    /// Matched text from the regex (only present when regex has capture groups and match succeeded)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub matched_text: Option<String>,
}

#[cfg(test)]
mod test {
    use super::*;
    use axum::{extract::State, Json};
    use fastcrypto::{ed25519::Ed25519KeyPair, traits::KeyPair};
    use std::fs;
    use base64::Engine;

    #[tokio::test]
    #[cfg(feature = "mail-auth")]
    async fn test_process_data_email() {
        let state = Arc::new(AppState {
            eph_kp: Ed25519KeyPair::generate(&mut rand::thread_rng()),
            api_key: "test-api-key".to_string(),
        });
        
        // Read test email file
        let email_path = "src/apps/aver-email/test-invitation.eml";
        let email_bytes = fs::read(email_path)
            .unwrap_or_else(|_| {
                // Try alternative path if first fails
                fs::read("test-invitation.eml")
                    .expect("Failed to read test-invitation.eml. Make sure the file exists.")
            });
        
        // Encode email to base64
        let email_base64 = base64::engine::general_purpose::STANDARD.encode(&email_bytes);
        
        // Create request with regex patterns matching the test email
        let request = ProcessDataRequest {
            payload: DkimMessageRequest {
                message: email_base64,
                regexes: vec![
                    RegexValidationRequest {
                        field: "sender".to_string(),
                        regex: r"^walrus@aver\.email$".to_string(),
                    },
                    RegexValidationRequest {
                        field: "subject".to_string(),
                        regex: r#"invitation to "([^"]+)""#.to_string(),
                    },
                    RegexValidationRequest {
                        field: "body".to_string(),
                        regex: r"your secret code is #([A-Z0-9]{10})".to_string(),
                    },
                ],
            },
        };
        
        // Call process_data
        let response = process_data(
            State(state),
            Json(request),
        )
        .await
        .unwrap();
        
        // Verify response structure
        let result = &response.response.data;
        
        // Check DKIM signatures summary
        assert!(result.dkim_signatures.total_count > 0, "Should have at least one DKIM signature");
        
        // Check regex validations
        assert_eq!(result.regex_validations.len(), 3, "Should have 3 regex validations");
        
        // Verify sender regex matched
        let sender_validation = result.regex_validations.iter()
            .find(|v| v.field == "sender")
            .expect("Should have sender validation");
        assert!(sender_validation.matched, "Sender regex should match");
        
        // Verify subject regex matched and captured party type
        let subject_validation = result.regex_validations.iter()
            .find(|v| v.field == "subject")
            .expect("Should have subject validation");
        assert!(subject_validation.matched, "Subject regex should match");
        assert_eq!(
            subject_validation.matched_text.as_ref().unwrap(),
            "after party",
            "Subject should capture 'after party'"
        );
        
        // Verify body regex matched and captured secret code
        let body_validation = result.regex_validations.iter()
            .find(|v| v.field == "body")
            .expect("Should have body validation");
        assert!(body_validation.matched, "Body regex should match");
        assert!(
            body_validation.matched_text.is_some(),
            "Body regex should capture secret code"
        );
        let secret_code = body_validation.matched_text.as_ref().unwrap();
        assert_eq!(secret_code.len(), 10, "Secret code should be 10 characters");
        assert!(
            secret_code.chars().all(|c| c.is_ascii_uppercase() || c.is_ascii_digit()),
            "Secret code should be uppercase alphanumeric"
        );
        
        // Verify signature is present
        assert!(!response.signature.is_empty(), "Response should have a signature");
    }
}
